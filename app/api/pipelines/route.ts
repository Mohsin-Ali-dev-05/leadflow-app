import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, requireUser } from "@/lib/tenant";
import { can } from "@/lib/permissions";
import { HttpError } from "@/lib/errors";

export const GET = handleRoute(async () => {
  const user = await requireUser();
  if (!can(user, "crm.view") && !can(user, "rules.manage")) {
    throw new HttpError(403, "Forbidden");
  }
  const pipelines = await prisma.pipeline.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      stages: { orderBy: { position: "asc" } },
      customFields: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(pipelines);
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("rules.manage");
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Sales Pipeline").slice(0, 80);

  const pipeline = await prisma.pipeline.create({
    data: {
      workspaceId: user.workspaceId,
      name,
      stages: {
        create: [
          { name: "New", position: 0, requiredFieldKeys: [] },
          { name: "Contacted", position: 1, requiredFieldKeys: [] },
          { name: "Proposal", position: 2, requiredFieldKeys: ["budget"] },
          { name: "Closed Won", position: 3, requiredFieldKeys: [] },
        ],
      },
      customFields: {
        create: [
          { key: "budget", label: "Estimated Budget", type: "number" },
          { key: "timeline", label: "Timeline", type: "text" },
        ],
      },
    },
    include: { stages: true, customFields: true },
  });
  return NextResponse.json(pipeline);
});
