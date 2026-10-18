import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("rules.manage");
  const { pipelineId, name } = await req.json().catch(() => ({}));
  if (!pipelineId || !name) {
    return NextResponse.json({ error: "pipelineId and name required" }, { status: 400 });
  }
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: pipelineId, workspaceId: user.workspaceId },
  });
  if (!pipeline) throw new HttpError(404, "Pipeline not found");

  const lastStage = await prisma.stage.findFirst({
    where: { pipelineId: pipeline.id },
    orderBy: { position: "desc" },
  });

  const stage = await prisma.stage.create({
    data: {
      pipelineId: pipeline.id,
      name: String(name).slice(0, 80),
      position: (lastStage?.position ?? -1) + 1,
    },
  });
  return NextResponse.json(stage);
});
