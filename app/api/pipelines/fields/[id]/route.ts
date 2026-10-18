import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { audit } from "@/lib/audit";

export const DELETE = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("rules.manage");
    const field = await prisma.customFieldDefinition.findFirst({
      where: { id, pipeline: { workspaceId: user.workspaceId } },
    });
    if (!field) throw new HttpError(404, "Not found");
    await prisma.customFieldDefinition.delete({ where: { id: field.id } });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "pipeline.field.deleted",
      targetId: field.id,
    });
    return NextResponse.json({ ok: true });
  },
);
