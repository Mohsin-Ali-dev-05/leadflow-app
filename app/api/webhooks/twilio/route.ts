import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage, verifyTwilioSignature } from "@/lib/messaging";

function twiml(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}
function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(req: NextRequest) {
  const workspaceId = process.env.DEMO_WORKSPACE_ID;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "DEMO_WORKSPACE_ID is not configured" },
      { status: 503 },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  let params: Record<string, string> = {};
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    form.forEach((v, k) => {
      params[k] = String(v);
    });
  } else {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 415 });
  }

  const url = process.env.TWILIO_WEBHOOK_URL || req.url;
  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature({ signature, url, params })) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 401 });
  }

  const from = params.From || "";
  const body = params.Body || "";
  const sid = params.MessageSid || params.SmsSid || null;
  if (!from || !body) {
    return NextResponse.json({ error: "Missing From/Body" }, { status: 400 });
  }

  try {
    const result = await ingestInboundMessage({
      workspaceId,
      from,
      body,
      profileName: params.ProfileName || null,
      providerSid: sid,
    });
    if (result.duplicate) {
      return new NextResponse(twiml("Duplicate ignored."), {
        status: 200,
        headers: { "content-type": "text/xml" },
      });
    }
    return new NextResponse(twiml("LeadFlow received your message."), {
      status: 200,
      headers: { "content-type": "text/xml" },
    });
  } catch (error) {
    console.error("Twilio ingest error", error);
    return NextResponse.json({ error: "Failed to ingest" }, { status: 500 });
  }
}
