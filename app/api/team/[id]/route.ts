import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import { reassignDueToAbsence } from "@/lib/assignment";
import type { Perm } from "@/lib/permissions";

const ALL_PERMS: Perm[] = [
  "crm.view",
  "crm.create",
  "crm.edit",
  "crm.delete",
  "crm.export",
  "crm.value.view",
  "rules.manage",
  "integrations.manage",
  "audit.view",
  "users.manage",
];

const schema = z.object({
  role: z.enum(["ADMIN", "USER"]).optional(),
  availability: z.enum(["AVAILABLE", "BUSY", "ON_LEAVE", "OFFLINE"]).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  timezone: z.string().min(1).max(80).optional(),
  telegramChatId: z.string().max(80).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
});

export const PATCH = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const admin = await requirePerm("users.manage");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id, workspaceId: admin.workspaceId },
    });
    if (!target) throw new HttpError(404, "User not found");
    if (target.baseRole === "OWNER") {
      throw new HttpError(400, "Owner role cannot be changed here");
    }
    if (parsed.data.role === "ADMIN" && admin.baseRole !== "OWNER") {
      throw new HttpError(403, "Only the owner can promote admins");
    }
    if (parsed.data.permissions) {
      for (const key of Object.keys(parsed.data.permissions)) {
        if (!ALL_PERMS.includes(key as Perm)) {
          throw new HttpError(400, `Unknown permission ${key}`);
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data: {
        ...(parsed.data.role ? { baseRole: parsed.data.role } : {}),
        ...(parsed.data.availability
          ? { availability: parsed.data.availability }
          : {}),
        ...(parsed.data.permissions
          ? { permissions: parsed.data.permissions }
          : {}),
        ...(parsed.data.timezone ? { timezone: parsed.data.timezone } : {}),
        ...(parsed.data.telegramChatId !== undefined
          ? { telegramChatId: parsed.data.telegramChatId }
          : {}),
        ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      },
    });

    await audit({
      workspaceId: admin.workspaceId,
      actorId: admin.id,
      eventType: "user.updated",
      targetId: updated.id,
      metadata: parsed.data as Record<string, unknown>,
    });

    if (
      parsed.data.availability &&
      parsed.data.availability !== "AVAILABLE" &&
      target.availability === "AVAILABLE"
    ) {
      await reassignDueToAbsence(updated.id);
    }

    return NextResponse.json({ ok: true });
  },
);
