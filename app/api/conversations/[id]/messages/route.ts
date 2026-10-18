import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleRoute, requirePerm, HttpError } from "@/lib/tenant";
import { sendProviderMessage } from "@/lib/messaging";
import { audit } from "@/lib/audit";

export const GET = handleRoute(
  async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const user = await requirePerm("crm.view");
    const conv = await prisma.conversation.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: {
        contact: true,
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) throw new HttpError(404, "Not found");
    return NextResponse.json(conv);
  },
);

export const POST = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const user = await requirePerm("crm.edit");
    const body = await req.json().catch(() => ({}));
    const text = String(body.body || "").trim();
    if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 });
    const conv = await prisma.conversation.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: { contact: true },
    });
    if (!conv) throw new HttpError(404, "Not found");
    if (!conv.contact.phone) {
      throw new HttpError(400, "Contact has no phone number");
    }
    const message = await sendProviderMessage({
      workspaceId: user.workspaceId,
      toPhone: conv.contact.phone,
      body: text,
      conversationId: conv.id,
    });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "message.sent",
      targetId: message.id,
      metadata: { conversationId: conv.id },
    });
    return NextResponse.json(message);
  },
);
