import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { pickAssignee } from "@/lib/assignment";
import { recordLeadEvent } from "@/lib/lead-events";
import { audit } from "@/lib/audit";

export const POST = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = await requirePerm("users.manage");
    const body = await req.json().catch(() => ({}));
    const lead = await prisma.lead.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!lead) throw new HttpError(404, "Not found");

    let ownerId = body.ownerId as string | undefined;
    if (ownerId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: ownerId,
          workspaceId: user.workspaceId,
          availability: "AVAILABLE",
        },
      });
      if (!assignee) throw new HttpError(400, "Assignee is not eligible");
    } else {
      const picked = await pickAssignee(user.workspaceId, lead.ownerId);
      ownerId = picked?.id;
    }
    if (!ownerId) throw new HttpError(409, "No eligible assignee");

    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    });
    const windowMs = (workspace?.ackWindowSeconds || 60) * 1000;
    const res = await prisma.lead.updateMany({
      where: { id: lead.id, version: lead.version },
      data: {
        ownerId,
        status: "UNACKED",
        assignedAt: new Date(),
        ackDeadline: new Date(Date.now() + windowMs),
        acknowledgedAt: null,
        recoveryReason: null,
        version: { increment: 1 },
      },
    });
    if (res.count === 0) throw new HttpError(409, "Lead changed, retry");
    await recordLeadEvent({
      leadId: lead.id,
      actorId: user.id,
      eventType: "lead.rescued",
      fromOwnerId: lead.ownerId,
      toOwnerId: ownerId,
      reason: "MANUAL_RECOVERY",
    });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "lead.rescued",
      targetId: lead.id,
      metadata: { ownerId },
    });
    return NextResponse.json({ ok: true });
  },
);
