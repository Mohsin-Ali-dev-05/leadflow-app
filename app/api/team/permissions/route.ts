import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePerm } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  await requirePerm("users.manage");
  const { userId, permissions } = await req.json(); // permissions is an object like { "crm.delete": true }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { permissions },
  });
  return NextResponse.json(updated);
}
