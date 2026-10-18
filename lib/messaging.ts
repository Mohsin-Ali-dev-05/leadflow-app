import crypto from "crypto";
import { prisma } from "./db";
import { createLead } from "./assignment";
import { claimProviderEvent } from "./provider-events";

function twilioCreds() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from =
    process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_SMS_FROM || "";
  return { accountSid, authToken, from };
}

export function verifyTwilioSignature(p: {
  signature: string | null;
  url: string;
  params: Record<string, string>;
}) {
  const { authToken } = twilioCreds();
  if (!authToken) return false;
  if (!p.signature) return false;
  const data =
    p.url +
    Object.keys(p.params)
      .sort()
      .map((k) => k + p.params[k])
      .join("");
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(p.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function sendProviderMessage(p: {
  workspaceId: string;
  toPhone: string;
  body: string;
  conversationId?: string;
}) {
  const { accountSid, authToken, from } = twilioCreds();
  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM or TWILIO_SMS_FROM.",
    );
  }

  const contact = await prisma.contact.findFirst({
    where: { workspaceId: p.workspaceId, phone: p.toPhone },
  });
  if (!contact) throw new Error("Contact not found for this phone number");

  let conversation =
    (p.conversationId
      ? await prisma.conversation.findFirst({
          where: { id: p.conversationId, workspaceId: p.workspaceId },
        })
      : null) ??
    (await prisma.conversation.findFirst({
      where: { workspaceId: p.workspaceId, contactId: contact.id },
    }));
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { workspaceId: p.workspaceId, contactId: contact.id },
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUT",
      body: p.body,
      status: "QUEUED",
      provider: "twilio",
    },
  });

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const to = from.startsWith("whatsapp:")
    ? p.toPhone.startsWith("whatsapp:")
      ? p.toPhone
      : `whatsapp:${p.toPhone}`
    : p.toPhone;
  const params = new URLSearchParams({ To: to, From: from, Body: p.body });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: params,
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: "FAILED",
          error: data.message || `Twilio HTTP ${res.status}`,
        },
      });
      throw new Error(data.message || `Twilio HTTP ${res.status}`);
    }
    return prisma.message.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        providerSid: data.sid,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Twilio")) throw error;
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "send failed",
      },
    });
    throw error;
  }
}

export async function ingestInboundMessage(p: {
  workspaceId: string;
  from: string;
  body: string;
  profileName?: string | null;
  providerSid?: string | null;
}) {
  const phone = p.from.replace(/^whatsapp:/, "");
  if (p.providerSid) {
    const claimed = await claimProviderEvent({
      provider: "twilio",
      eventId: p.providerSid,
      eventType: "inbound_message",
      workspaceId: p.workspaceId,
    });
    if (claimed.duplicate) {
      const existing = await prisma.message.findUnique({
        where: { providerSid: p.providerSid },
      });
      return { duplicate: true, message: existing };
    }
  }

  let contact = await prisma.contact.findFirst({
    where: { workspaceId: p.workspaceId, phone },
  });
  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        workspaceId: p.workspaceId,
        name: p.profileName || phone,
        phone,
      },
    });
  }

  let conv = await prisma.conversation.findFirst({
    where: { workspaceId: p.workspaceId, contactId: contact.id },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: { workspaceId: p.workspaceId, contactId: contact.id },
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conv.id,
      direction: "IN",
      body: p.body,
      status: "RECEIVED",
      provider: "twilio",
      providerSid: p.providerSid,
    },
  });

  const open = await prisma.lead.findFirst({
    where: {
      contactId: contact.id,
      status: { in: ["UNACKED", "ACKED"] },
    },
  });
  if (!open) {
    await createLead(p.workspaceId, "whatsapp", contact.id);
  }

  return { duplicate: false, message };
}

/** @deprecated Use sendProviderMessage. Kept name for existing imports. */
export async function sendWhatsAppMessage(
  workspaceId: string,
  toPhone: string,
  body: string,
) {
  return sendProviderMessage({ workspaceId, toPhone, body });
}
