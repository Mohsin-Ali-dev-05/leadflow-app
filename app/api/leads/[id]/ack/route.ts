import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requireUser, HttpError } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { recordLeadEvent } from "@/lib/lead-events";

export const POST = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requireUser();
    const lead = await prisma.lead.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!lead) throw new HttpError(404, "Not found");
    const manager = user.baseRole === "OWNER" || user.baseRole === "ADMIN";
    if (lead.ownerId !== user.id && !manager) {
      throw new HttpError(403, "Only the assignee or a manager can acknowledge");
    }

    const res = await prisma.lead.updateMany({
      where: {
        id,
        workspaceId: user.workspaceId,
        status: { in: ["UNACKED", "ESCALATED"] },
      },
      data: {
        status: "ACKED",
        acknowledgedAt: new Date(),
        recoveryReason: null,
        version: { increment: 1 },
      },
    });
    if (res.count === 0) {
      return NextResponse.json({ error: "Lead cannot be acknowledged" }, { status: 409 });
    }
    await recordLeadEvent({
      leadId: id,
      actorId: user.id,
      eventType: "lead.acknowledged",
      toOwnerId: user.id,
    });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "lead.acknowledged",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  },
);
