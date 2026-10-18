import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm } from "@/lib/tenant";

const schema = z.object({
  name: z.string().min(1).max(80),
  entity: z.enum(["leads", "opportunities", "contacts"]),
  filters: z.record(z.string(), z.unknown()).default({}),
});

export const GET = handleRoute(async () => {
  const user = await requirePerm("crm.view");
  const lists = await prisma.savedList.findMany({
    where: { workspaceId: user.workspaceId, userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("crm.view");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid list" }, { status: 400 });
  }
  const list = await prisma.savedList.create({
    data: {
      workspaceId: user.workspaceId,
      userId: user.id,
      name: parsed.data.name,
      entity: parsed.data.entity,
      filters: parsed.data.filters,
    },
  });
  return NextResponse.json(list);
});
