import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const { conversationId, body } = await req.json();

  // 1. Fetch the conversation to get the contact's phone (which is the Telegram Chat ID)
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true },
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  // 2. Send the message to Telegram (if it's a Telegram contact)
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (token && conversation.contact.phone) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: conversation.contact.phone,
          text: body,
        }),
      });
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      // We still save to DB even if Telegram fails, so the UI doesn't break
    }
  }

  // 3. Save the outbound message to your database so it shows in the Chat UI
  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: "OUT",
      body,
      status: "SENT",
    },
  });

  return NextResponse.json(message);
}
