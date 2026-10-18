import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { FIELD_TYPES, slugKey } from "@/lib/custom-fields";
import { audit } from "@/lib/audit";

const schema = z.object({
  pipelineId: z.string().min(1),
  key: z.string().min(1).max(40).optional(),
  label: z.string().min(1).max(80),
  type: z.enum(FIELD_TYPES),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("rules.manage");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid field definition" }, { status: 400 });
  }
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: parsed.data.pipelineId, workspaceId: user.workspaceId },
  });
  if (!pipeline) throw new HttpError(404, "Pipeline not found");
  const key = slugKey(parsed.data.key || parsed.data.label);
  if (!key) throw new HttpError(400, "Invalid field key");

  const field = await prisma.customFieldDefinition.create({
    data: {
      pipelineId: pipeline.id,
      key,
      label: parsed.data.label,
      type: parsed.data.type,
      options: parsed.data.type === "dropdown" ? parsed.data.options ?? [] : [],
      required: parsed.data.required ?? false,
    },
  });
  await audit({
    workspaceId: user.workspaceId,
    actorId: user.id,
    eventType: "pipeline.field.created",
    targetId: field.id,
    metadata: { key, pipelineId: pipeline.id },
  });
  return NextResponse.json(field);
});
