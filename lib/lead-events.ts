import { prisma } from "./db";

export async function recordLeadEvent(p: {
  leadId: string;
  actorId?: string | null;
  eventType: string;
  fromOwnerId?: string | null;
  toOwnerId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.leadEvent.create({
    data: {
      leadId: p.leadId,
      actorId: p.actorId ?? null,
      eventType: p.eventType,
      fromOwnerId: p.fromOwnerId ?? null,
      toOwnerId: p.toOwnerId ?? null,
      reason: p.reason ?? null,
      metadata: p.metadata ?? {},
    },
  });
}
