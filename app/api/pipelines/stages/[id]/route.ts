import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";

export const PATCH = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = await requirePerm("rules.manage");
    const body = await req.json().catch(() => ({}));
    const stage = await prisma.stage.findFirst({
      where: { id, pipeline: { workspaceId: user.workspaceId } },
      include: { pipeline: { include: { customFields: true } } },
    });
    if (!stage) throw new HttpError(404, "Not found");
    const requiredFieldKeys = Array.isArray(body.requiredFieldKeys)
      ? body.requiredFieldKeys.map(String)
      : stage.requiredFieldKeys;
    const known = new Set(stage.pipeline.customFields.map((f) => f.key));
    for (const k of requiredFieldKeys) {
      if (!known.has(k)) throw new HttpError(400, `Unknown field ${k}`);
    }
    const updated = await prisma.stage.update({
      where: { id: stage.id },
      data: {
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        requiredFieldKeys,
      },
    });
    return NextResponse.json(updated);
  },
);

export const DELETE = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("rules.manage");
    const stage = await prisma.stage.findFirst({
      where: { id, pipeline: { workspaceId: user.workspaceId } },
    });
    if (!stage) throw new HttpError(404, "Not found");
    const oppCount = await prisma.opportunity.count({ where: { stageId: id } });
    if (oppCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete a stage that contains opportunities." },
        { status: 400 },
      );
    }
    await prisma.stage.delete({ where: { id: stage.id } });
    return NextResponse.json({ ok: true });
  },
);
