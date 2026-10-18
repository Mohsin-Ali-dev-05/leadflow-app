import { prisma } from "./db";
import { audit } from "./audit";
import { pickAssignee } from "./assignment";
import { recordLeadEvent } from "./lead-events";
import { notifyEscalation } from "./notify";

async function ackWindowMs(workspaceId: string) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  return (ws?.ackWindowSeconds || 60) * 1000;
}

export async function escalateLead(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { skipped: "missing" as const };
  if (lead.status !== "UNACKED") return { skipped: "not_unacked" as const };
  if (lead.ackDeadline > new Date()) return { skipped: "not_due" as const };

  const key = `${lead.id}:level:${lead.escalationLevel}:v:${lead.version}`;
  if (lead.lastEscalationKey === key) return { skipped: "duplicate_key" as const };

  const nextLevel = lead.escalationLevel + 1;
  let nextOwnerId: string | null = null;
  let reason = "SLA_EXPIRED";

  if (lead.escalationLevel === 0) {
    const next = await pickAssignee(lead.workspaceId, lead.ownerId);
    nextOwnerId = next?.id ?? null;
    reason = "NEXT_ELIGIBLE";
  } else if (lead.escalationLevel === 1) {
    const admin = await prisma.user.findFirst({
      where: {
        workspaceId: lead.workspaceId,
        baseRole: { in: ["ADMIN", "OWNER"] },
        availability: "AVAILABLE",
        id: { not: lead.ownerId ?? undefined },
      },
      orderBy: { createdAt: "asc" },
    });
    nextOwnerId = admin?.id ?? null;
    reason = "BACKUP_ADMIN";
  } else {
    const owner = await prisma.user.findFirst({
      where: {
        workspaceId: lead.workspaceId,
        baseRole: "OWNER",
        availability: "AVAILABLE",
      },
    });
    nextOwnerId = owner?.id ?? null;
    reason = "MANAGER";
  }

  const maxed = lead.escalationLevel >= 2 || !nextOwnerId;
  const windowMs = await ackWindowMs(lead.workspaceId);

  const res = await prisma.lead.updateMany({
    where: {
      id: leadId,
      status: "UNACKED",
      version: lead.version,
      ackDeadline: { lte: new Date() },
    },
    data: {
      ownerId: maxed && !nextOwnerId ? null : nextOwnerId,
      assignedAt: new Date(),
      ackDeadline: new Date(Date.now() + windowMs),
      escalationLevel: { increment: 1 },
      version: { increment: 1 },
      lastEscalationKey: key,
      status: maxed ? "ESCALATED" : "UNACKED",
      recoveryReason: maxed
        ? nextOwnerId
          ? "MAX_ESCALATION_REACHED"
          : `NO_ELIGIBLE_ASSIGNEE after ${reason}`
        : null,
    },
  });

  if (res.count === 0) return { skipped: "lost_race" as const };

  await recordLeadEvent({
    leadId: lead.id,
    eventType: maxed ? "lead.escalated.recovery" : "lead.escalated",
    fromOwnerId: lead.ownerId,
    toOwnerId: nextOwnerId,
    reason,
    metadata: { level: nextLevel },
  });

  await audit({
    workspaceId: lead.workspaceId,
    actorType: "system",
    eventType: maxed ? "lead.recovery" : "lead.escalated",
    targetId: lead.id,
    metadata: { level: nextLevel, reason, toOwnerId: nextOwnerId },
  });

  try {
    const targetUser =
      nextOwnerId ||
      (
        await prisma.user.findFirst({
          where: { workspaceId: lead.workspaceId, baseRole: "OWNER" },
        })
      )?.id ||
      null;
    await notifyEscalation({
      workspaceId: lead.workspaceId,
      leadId: lead.id,
      userId: targetUser,
      level: nextLevel,
      reason,
    });
  } catch (error) {
    console.error("Notification failed (escalation continued)", error);
  }

  return { ok: true, maxed, nextOwnerId, level: nextLevel };
}

export async function runEscalationSweep() {
  const overdueLeads = await prisma.lead.findMany({
    where: { status: "UNACKED", ackDeadline: { lte: new Date() } },
    take: 25,
    orderBy: { ackDeadline: "asc" },
  });
  const results = [];
  for (const lead of overdueLeads) {
    results.push(await escalateLead(lead.id));
  }
  return results;
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startEscalationWorker() {
  if (timer) return;
  timer = setInterval(() => {
    runEscalationSweep().catch((e) => console.error("Worker error", e));
  }, 3000);
}
