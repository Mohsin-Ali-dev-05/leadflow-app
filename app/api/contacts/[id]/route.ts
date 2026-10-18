import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";

export const PATCH = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = await requirePerm("crm.edit");
    const body = await req.json().catch(() => ({}));
    const res = await prisma.contact.updateMany({
      where: { id, workspaceId: user.workspaceId },
      data: {
        ...(typeof body.name === "string" ? { name: body.name } : {}),
        ...(typeof body.email === "string" ? { email: body.email } : {}),
        ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
      },
    });
    if (res.count === 0) throw new HttpError(404, "Not found");
    return NextResponse.json({ ok: true });
  },
);

export const DELETE = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("crm.delete");
    const res = await prisma.contact.deleteMany({
      where: { id, workspaceId: user.workspaceId },
    });
    if (res.count === 0) throw new HttpError(404, "Not found");
    return NextResponse.json({ ok: true });
  },
);
