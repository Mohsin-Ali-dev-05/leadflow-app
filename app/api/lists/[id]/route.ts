import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";

export const GET = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("crm.view");
    const list = await prisma.savedList.findFirst({
      where: { id, workspaceId: user.workspaceId, userId: user.id },
    });
    if (!list) throw new HttpError(404, "Not found");
    return NextResponse.json(list);
  },
);

export const DELETE = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("crm.view");
    const res = await prisma.savedList.deleteMany({
      where: { id, workspaceId: user.workspaceId, userId: user.id },
    });
    if (res.count === 0) throw new HttpError(404, "Not found");
    return NextResponse.json({ ok: true });
  },
);
