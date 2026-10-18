import { prisma } from "./db";
import { createLead } from "./assignment";
import { claimProviderEvent } from "./provider-events";

let lastUpdateId = 0;

export async function startTelegramPoller() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  console.log("Starting Telegram poller");

  setInterval(async () => {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=2`,
      );
      const data = await res.json();
      if (!data.ok || !data.result?.length) return;

      const workspaceId = process.env.DEMO_WORKSPACE_ID;
      if (!workspaceId) return;

      for (const update of data.result) {
        lastUpdateId = update.update_id;
        const claimed = await claimProviderEvent({
          provider: "telegram",
          eventId: String(update.update_id),
          eventType: "update",
          workspaceId,
        });
        if (claimed.duplicate) continue;
        if (!update.message?.text) continue;

        const chatId = update.message.chat.id.toString();
        const text = update.message.text;
        const name = update.message.from?.first_name || "Telegram User";

        let contact = await prisma.contact.findFirst({
          where: { workspaceId, phone: chatId },
        });
        if (!contact) {
          contact = await prisma.contact.create({
            data: { workspaceId, name: `${name} (TG)`, phone: chatId },
          });
        }

        let conv = await prisma.conversation.findFirst({
          where: { workspaceId, contactId: contact.id },
        });
        if (!conv) {
          conv = await prisma.conversation.create({
            data: { workspaceId, contactId: contact.id },
          });
        }

        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: "IN",
            body: text,
            status: "RECEIVED",
            provider: "telegram",
            providerSid: `tg:${update.update_id}`,
          },
        });

        const open = await prisma.lead.findFirst({
          where: { contactId: contact.id, status: { in: ["UNACKED", "ACKED"] } },
        });
        if (!open) await createLead(workspaceId, "telegram", contact.id);
      }
    } catch (e) {
      console.error("Telegram poller error", e);
    }
  }, 4000);
}
