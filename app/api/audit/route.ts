import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm } from "@/lib/tenant";

export const GET = handleRoute(async () => {
  const user = await requirePerm("audit.view");
  const logs = await prisma.auditLog.findMany({
    where: { workspaceId: user.workspaceId },
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
});

export async function PATCH() {
  return NextResponse.json(
    { error: "Audit logs are append-only" },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Audit logs are append-only" },
    { status: 405 },
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Audit logs are append-only" },
    { status: 405 },
  );
}
