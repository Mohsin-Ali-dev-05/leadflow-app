import { prisma } from "./db";

function appUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function leadLink(leadId: string) {
  return `${appUrl()}/leads/${leadId}`;
}

async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `Telegram HTTP ${res.status}`);
  }
  return String(data.result?.message_id ?? "telegram");
}

async function sendResendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.RESEND_FROM || "LeadFlow <noreply@example.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Resend HTTP ${res.status}`);
  }
  return String(data.id ?? "resend");
}

async function sendTwilioSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    throw new Error("Twilio SMS is not configured");
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
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
    throw new Error(data.message || `Twilio HTTP ${res.status}`);
  }
  return String(data.sid ?? "twilio");
}

export async function notifyEscalation(p: {
  workspaceId: string;
  leadId: string;
  userId: string | null;
  level: number;
  reason: string;
}) {
  const idempotencyKey = `esc:${p.leadId}:${p.level}:${p.userId ?? "none"}`;
  const existing = await prisma.notificationDelivery.findUnique({
    where: { idempotencyKey },
  });
  if (existing) return existing;

  const user = p.userId
    ? await prisma.user.findUnique({ where: { id: p.userId } })
    : null;
  const link = leadLink(p.leadId);
  const body = `Lead ${p.leadId} escalated (level ${p.level}). Reason: ${p.reason}. Open: ${link}`;

  const row = await prisma.notificationDelivery.create({
    data: {
      workspaceId: p.workspaceId,
      userId: p.userId,
      leadId: p.leadId,
      channel: "pending",
      toAddress: user?.telegramChatId || user?.email || "unroutable",
      subject: `Lead escalated (L${p.level})`,
      body,
      link,
      status: "PENDING",
      idempotencyKey,
    },
  });

  try {
    let channel = "log";
    let toAddress = "console";
    let providerRef: string | undefined;

    if (user?.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
      channel = "telegram";
      toAddress = user.telegramChatId;
      providerRef = await sendTelegram(user.telegramChatId, body);
    } else if (user?.phone && process.env.TWILIO_SMS_FROM) {
      channel = "sms";
      toAddress = user.phone;
      providerRef = await sendTwilioSms(user.phone, body);
    } else if (user?.email && process.env.RESEND_API_KEY) {
      channel = "email";
      toAddress = user.email;
      providerRef = await sendResendEmail(
        user.email,
        `Lead escalated (L${p.level})`,
        body,
      );
    } else {
      console.warn(`[notify] No provider configured for escalation ${p.leadId}`);
      channel = "unconfigured";
      toAddress = user?.email || "none";
    }

    return prisma.notificationDelivery.update({
      where: { id: row.id },
      data: {
        channel,
        toAddress,
        providerRef,
        status: channel === "unconfigured" ? "SKIPPED" : "SENT",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "notify failed";
    return prisma.notificationDelivery.update({
      where: { id: row.id },
      data: { status: "FAILED", error: message },
    });
  }
}
