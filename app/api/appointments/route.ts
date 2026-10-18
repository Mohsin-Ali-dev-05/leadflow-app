import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requireUser, HttpError } from "@/lib/tenant";
import { detectConflicts, getValidAccessToken, googleApi } from "@/lib/google";
import { audit } from "@/lib/audit";

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const items = await prisma.appointment.findMany({
    where: { workspaceId: user.workspaceId, userId: user.id },
    orderBy: { startAt: "asc" },
  });
  const conn = await prisma.calendarConnection.findUnique({
    where: { userId: user.id },
  });
  return NextResponse.json({
    connected: Boolean(conn),
    googleEmail: conn?.googleEmail ?? null,
    appointments: items,
  });
});

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string(),
  endAt: z.string(),
  timezone: z.string().min(1).max(80).optional(),
  leadId: z.string().optional(),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid appointment" }, { status: 400 });
  }
  const timezone = parsed.data.timezone || user.timezone || "UTC";
  const startAt = new Date(parsed.data.startAt);
  const endAt = new Date(parsed.data.endAt);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
    throw new HttpError(400, "Invalid time range");
  }
  if (parsed.data.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.leadId, workspaceId: user.workspaceId },
    });
    if (!lead) throw new HttpError(404, "Lead not found");
  }

  const conflicts = await detectConflicts({
    userId: user.id,
    startAt,
    endAt,
    timezone,
  });
  if (conflicts.conflict) {
    return NextResponse.json(
      { error: "Scheduling conflict", source: conflicts.source },
      { status: 409 },
    );
  }

  const { accessToken } = await getValidAccessToken(user.id);
  const event = await googleApi(accessToken, "/calendars/primary/events", {
    method: "POST",
    body: JSON.stringify({
      summary: parsed.data.title,
      description: parsed.data.description,
      start: { dateTime: startAt.toISOString(), timeZone: timezone },
      end: { dateTime: endAt.toISOString(), timeZone: timezone },
    }),
  });

  const appointment = await prisma.appointment.create({
    data: {
      workspaceId: user.workspaceId,
      userId: user.id,
      leadId: parsed.data.leadId,
      title: parsed.data.title,
      description: parsed.data.description,
      startAt,
      endAt,
      timezone,
      googleEventId: event.id,
      status: "CONFIRMED",
    },
  });
  await audit({
    workspaceId: user.workspaceId,
    actorId: user.id,
    eventType: "appointment.created",
    targetId: appointment.id,
    metadata: { googleEventId: event.id, timezone },
  });
  return NextResponse.json(appointment);
});
