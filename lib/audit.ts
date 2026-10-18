import { prisma } from "./db";

export async function audit(p: {
  workspaceId: string;
  actorId?: string | null;
  actorType?: "user" | "system";
  eventType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId: p.workspaceId,
      actorId: p.actorId ?? null,
      actorType: p.actorType ?? "user",
      eventType: p.eventType,
      targetId: p.targetId,
      metadata: p.metadata ?? {},
    },
  });
}
