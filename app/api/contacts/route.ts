import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm } from "@/lib/tenant";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("crm.view");
  const q = req.nextUrl.searchParams.get("q") || undefined;
  const contacts = await prisma.contact.findMany({
    where: {
      workspaceId: user.workspaceId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(contacts);
});

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requirePerm("crm.create");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contact" }, { status: 400 });
  }
  const contact = await prisma.contact.create({
    data: {
      workspaceId: user.workspaceId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
    },
  });
  return NextResponse.json(contact);
});
