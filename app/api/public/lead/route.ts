import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createLead } from "@/lib/assignment";

const schema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(80),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const workspace = await prisma.workspace.findUnique({
    where: { id: parsed.data.workspaceId },
  });
  if (!workspace) {
    return NextResponse.json({ error: "Unknown workspace" }, { status: 404 });
  }
  const contact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
    },
  });
  const lead = await createLead(workspace.id, "web_form", contact.id);
  return NextResponse.json({ ok: true, leadId: lead.id });
}
