import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import {
  missingRequired,
  normalizeValues,
  validateValues,
} from "@/lib/custom-fields";
import { asRecord } from "@/lib/json";
import { audit } from "@/lib/audit";

export const GET = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("crm.view");
    const opp = await prisma.opportunity.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: {
        stage: true,
        pipeline: { include: { stages: true, customFields: true } },
        contact: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!opp) throw new HttpError(404, "Not found");
    return NextResponse.json(opp);
  },
);

export const PATCH = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = await requirePerm("crm.edit");
    const body = await req.json().catch(() => ({}));

    const opp = await prisma.opportunity.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { pipeline: { include: { customFields: true, stages: true } } },
    });
    if (!opp) throw new HttpError(404, "Not found");

    const defs = opp.pipeline.customFields;
    const nextFields =
      body.customFields !== undefined
        ? {
            ...asRecord(opp.customFields),
            ...normalizeValues(defs, body.customFields),
          }
        : asRecord(opp.customFields);

    if (body.customFields !== undefined) {
      const typeErrors = validateValues(defs, body.customFields);
      if (typeErrors.length) {
        return NextResponse.json({ error: typeErrors.join("; ") }, { status: 400 });
      }
    }

    let stageId = opp.stageId;
    if (body.stageId && body.stageId !== opp.stageId) {
      const newStage = opp.pipeline.stages.find((s) => s.id === body.stageId);
      if (!newStage) throw new HttpError(400, "Invalid stage");
      const missing = missingRequired(defs, nextFields, newStage.requiredFieldKeys);
      if (missing.length) {
        return NextResponse.json(
          { error: `Blocked: Missing required fields: ${missing.join(", ")}` },
          { status: 400 },
        );
      }
      stageId = newStage.id;
    }

    const updated = await prisma.opportunity.update({
      where: { id: opp.id },
      data: {
        stageId,
        customFields: nextFields,
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.valueCents === "number"
          ? { valueCents: body.valueCents }
          : {}),
      },
    });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "opportunity.updated",
      targetId: opp.id,
      metadata: { stageId, fields: Boolean(body.customFields) },
    });
    return NextResponse.json({ ok: true, opportunity: updated });
  },
);

export const DELETE = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("crm.delete");
    const res = await prisma.opportunity.deleteMany({
      where: { id, workspaceId: user.workspaceId },
    });
    if (res.count === 0) throw new HttpError(404, "Not found");
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "opportunity.deleted",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  },
);
