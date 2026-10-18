import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requireUser, HttpError } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { createLead } from "@/lib/assignment";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const isManager = user.baseRole === "OWNER" || user.baseRole === "ADMIN";
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const q = req.nextUrl.searchParams.get("q") || undefined;
  const leads = await prisma.lead.findMany({
    where: {
      workspaceId: user.workspaceId,
      ...(isManager ? {} : { ownerId: user.id }),
      ...(status ? { status: status as "UNACKED" | "ACKED" | "ESCALATED" | "CLOSED" } : {}),
      ...(q
        ? { contact: { name: { contains: q, mode: "insensitive" } } }
        : {}),
    },
    include: { owner: true, contact: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  if (!can(user, "crm.create")) throw new HttpError(403, "Forbidden");
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Demo lead").slice(0, 80);
  const email = body.email ? String(body.email) : null;
  const contact = await prisma.contact.create({
    data: {
      workspaceId: user.workspaceId,
      name,
      email,
      phone: body.phone ? String(body.phone) : null,
    },
  });
  const lead = await createLead(user.workspaceId, body.source || "manual", contact.id);
  return NextResponse.json(lead);
});
