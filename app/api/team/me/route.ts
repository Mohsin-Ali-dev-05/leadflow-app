import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requireUser } from "@/lib/tenant";
import { reassignDueToAbsence } from "@/lib/assignment";
import { audit } from "@/lib/audit";

const schema = z.object({
  availability: z.enum(["AVAILABLE", "BUSY", "ON_LEAVE", "OFFLINE"]).optional(),
  timezone: z.string().min(1).max(80).optional(),
  telegramChatId: z.string().max(80).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
});

export const PATCH = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });
  await audit({
    workspaceId: user.workspaceId,
    actorId: user.id,
    eventType: "user.self_updated",
    targetId: user.id,
    metadata: parsed.data as Record<string, unknown>,
  });
  if (
    parsed.data.availability &&
    parsed.data.availability !== "AVAILABLE" &&
    user.availability === "AVAILABLE"
  ) {
    await reassignDueToAbsence(updated.id);
  }
  return NextResponse.json({ ok: true, availability: updated.availability });
});
