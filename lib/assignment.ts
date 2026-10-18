import { prisma } from "./db";
import { audit } from "./audit";
import { recordLeadEvent } from "./lead-events";

export async function pickAssignee(
  workspaceId: string,
  excludeUserId?: string | null,
) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  const cap = workspace?.maxOpenLeads ?? 10;

  const users = await prisma.user.findMany({
    where: {
      workspaceId,
      availability: "AVAILABLE",
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    include: {
      _count: {
        select: {
          ownedLeads: { where: { status: { in: ["UNACKED", "ACKED"] } } },
        },
      },
    },
  });

  const eligible = users
    .filter((u) => u._count.ownedLeads < cap)
    .sort((a, b) => {
      const diff = a._count.ownedLeads - b._count.ownedLeads;
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });

  return eligible[0] ?? null;
}

export async function createLead(
  workspaceId: string,
  source: string,
  contactId?: string,
) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });
  if (!workspace) throw new Error("Workspace not found");

  const owner = await pickAssignee(workspaceId);
  const windowMs = (workspace.ackWindowSeconds || 60) * 1000;
  const now = new Date();
  const unassigned = !owner;
  const ackDeadline = new Date(now.getTime() + windowMs);

  const lead = await prisma.lead.create({
    data: {
      workspaceId,
      source,
      contactId,
      ownerId: owner?.id ?? null,
      ackDeadline,
      status: unassigned ? "ESCALATED" : "UNACKED",
      recoveryReason: unassigned
        ? "NO_ELIGIBLE_ASSIGNEE: no available staff under the open-lead cap"
        : null,
    },
  });

  await recordLeadEvent({
    leadId: lead.id,
    eventType: unassigned ? "lead.unassigned" : "lead.assigned",
    toOwnerId: owner?.id ?? null,
    reason: unassigned
      ? "NO_ELIGIBLE_ASSIGNEE"
      : "INITIAL_ASSIGNMENT",
  });

  await audit({
    workspaceId,
    actorType: "system",
    eventType: unassigned ? "lead.recovery" : "lead.created",
    targetId: lead.id,
    metadata: { source, ownerId: owner?.id ?? null },
  });

  return lead;
}

export async function reassignDueToAbsence(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { moved: 0 };
  if (user.availability === "AVAILABLE") return { moved: 0 };

  const openLeads = await prisma.lead.findMany({
    where: {
      workspaceId: user.workspaceId,
      ownerId: userId,
      status: { in: ["UNACKED", "ACKED"] },
    },
  });

  let moved = 0;
  for (const lead of openLeads) {
    const next = await pickAssignee(user.workspaceId, userId);
    const workspace = await prisma.workspace.findUnique({
      where: { id: user.workspaceId },
    });
    const windowMs = (workspace?.ackWindowSeconds || 60) * 1000;
    if (next) {
      const res = await prisma.lead.updateMany({
        where: { id: lead.id, version: lead.version, ownerId: userId },
        data: {
          ownerId: next.id,
          assignedAt: new Date(),
          ackDeadline: new Date(Date.now() + windowMs),
          status: "UNACKED",
          acknowledgedAt: null,
          version: { increment: 1 },
          recoveryReason: null,
        },
      });
      if (res.count > 0) {
        moved += 1;
        await recordLeadEvent({
          leadId: lead.id,
          eventType: "lead.reassigned",
          fromOwnerId: userId,
          toOwnerId: next.id,
          reason: `OWNER_UNAVAILABLE:${user.availability}`,
        });
        await audit({
          workspaceId: user.workspaceId,
          actorType: "system",
          eventType: "lead.reassigned",
          targetId: lead.id,
          metadata: { from: userId, to: next.id, reason: user.availability },
        });
      }
    } else {
      const res = await prisma.lead.updateMany({
        where: { id: lead.id, version: lead.version, ownerId: userId },
        data: {
          ownerId: null,
          status: "ESCALATED",
          recoveryReason: `OWNER_UNAVAILABLE:${user.availability}; no eligible replacement`,
          version: { increment: 1 },
        },
      });
      if (res.count > 0) {
        moved += 1;
        await recordLeadEvent({
          leadId: lead.id,
          eventType: "lead.recovery",
          fromOwnerId: userId,
          reason: "NO_ELIGIBLE_REPLACEMENT",
        });
        await audit({
          workspaceId: user.workspaceId,
          actorType: "system",
          eventType: "lead.recovery",
          targetId: lead.id,
          metadata: { from: userId, reason: "NO_ELIGIBLE_REPLACEMENT" },
        });
      }
    }
  }
  return { moved };
}
