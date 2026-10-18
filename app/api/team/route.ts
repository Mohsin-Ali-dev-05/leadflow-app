import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, requireUser } from "@/lib/tenant";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { can } from "@/lib/permissions";

const inviteSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  role: z.enum(["ADMIN", "USER"]),
  password: z.string().min(8).max(200).optional(),
});

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const team = await prisma.user.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      baseRole: true,
      availability: true,
      permissions: true,
      timezone: true,
      createdAt: true,
    },
  });
  return NextResponse.json(team);
});

export const POST = handleRoute(async (req: NextRequest) => {
  const admin = await requirePerm("users.manage");
  const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findFirst({
    where: { workspaceId: admin.workspaceId, email },
  });
  if (existing) {
    return NextResponse.json({ error: "User already in workspace" }, { status: 409 });
  }
  const tempPassword = parsed.data.password ?? "password123";
  const user = await prisma.user.create({
    data: {
      workspaceId: admin.workspaceId,
      name: parsed.data.name,
      email,
      passwordHash: await hashPassword(tempPassword),
      baseRole: parsed.data.role,
      availability: "AVAILABLE",
    },
  });
  await audit({
    workspaceId: admin.workspaceId,
    actorId: admin.id,
    eventType: "user.invited",
    targetId: user.id,
    metadata: { role: parsed.data.role, email },
  });
  return NextResponse.json({
    id: user.id,
    email: user.email,
    temporaryPassword: parsed.data.password ? undefined : tempPassword,
  });
});
