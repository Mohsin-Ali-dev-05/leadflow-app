import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, requireUser, HttpError } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import {
  missingRequired,
  normalizeValues,
  validateValues,
} from "@/lib/custom-fields";
import { audit } from "@/lib/audit";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  if (!can(user, "crm.view")) throw new HttpError(403, "Forbidden");
  const url = req.nextUrl;
  const stageId = url.searchParams.get("stageId") || undefined;
  const q = url.searchParams.get("q") || undefined;
  const minValue = url.searchParams.get("minValue");

  const opps = await prisma.opportunity.findMany({
    where: {
      workspaceId: user.workspaceId,
      ...(stageId ? { stageId } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      ...(minValue ? { valueCents: { gte: Number(minValue) } } : {}),
    },
    include: { stage: true, contact: true, pipeline: true },
    orderBy: { createdAt: "desc" },
  });

  const canViewValue = can(user, "crm.value.view");
  return NextResponse.json(
    opps.map((o) => ({
      ...o,
      valueCents: canViewValue ? o.valueCents : null,
    })),
  );
});

const createSchema = z.object({
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  title: z.string().min(1).max(200),
  valueCents: z.number().int().nonnegative().optional(),
  contactId: z.string().nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  currency: z.string().min(3).max(8).optional(),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("crm.create");
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const pipeline = await prisma.pipeline.findFirst({
    where: { id: parsed.data.pipelineId, workspaceId: user.workspaceId },
    include: { customFields: true, stages: true },
  });
  if (!pipeline) throw new HttpError(404, "Pipeline not found");
  const stage = pipeline.stages.find((s) => s.id === parsed.data.stageId);
  if (!stage) throw new HttpError(400, "Stage does not belong to this pipeline");

  const defs = pipeline.customFields;
  const values = normalizeValues(defs, parsed.data.customFields ?? {});
  const typeErrors = validateValues(defs, values);
  if (typeErrors.length) {
    return NextResponse.json({ error: typeErrors.join("; ") }, { status: 400 });
  }
  const missing = missingRequired(defs, values, stage.requiredFieldKeys);
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 },
    );
  }

  const opp = await prisma.opportunity.create({
    data: {
      workspaceId: user.workspaceId,
      pipelineId: pipeline.id,
      stageId: stage.id,
      title: parsed.data.title,
      valueCents: parsed.data.valueCents || 0,
      currency: parsed.data.currency || "USD",
      contactId: parsed.data.contactId || null,
      customFields: values,
    },
  });
  await audit({
    workspaceId: user.workspaceId,
    actorId: user.id,
    eventType: "opportunity.created",
    targetId: opp.id,
  });
  return NextResponse.json(opp);
});
