import { prisma } from "./db";

export async function claimProviderEvent(p: {
  provider: string;
  eventId: string;
  eventType?: string;
  workspaceId?: string | null;
}) {
  try {
    await prisma.processedProviderEvent.create({
      data: {
        provider: p.provider,
        eventId: p.eventId,
        eventType: p.eventType,
        workspaceId: p.workspaceId ?? null,
      },
    });
    return { duplicate: false };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code === "P2002") return { duplicate: true };
    throw error;
  }
}
