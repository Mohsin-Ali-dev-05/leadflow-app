import { prisma } from "./db";
import { HttpError } from "./errors";

function clientId() {
  return process.env.GOOGLE_CLIENT_ID || "";
}
function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}
function redirectUri() {
  const app = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return process.env.GOOGLE_REDIRECT_URI || `${app}/api/integrations/google/callback`;
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "openid",
  "email",
].join(" ");

export function googleConfigured() {
  return Boolean(clientId() && clientSecret());
}

export function googleAuthUrl(state: string) {
  if (!googleConfigured()) {
    throw new HttpError(
      503,
      "Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "Google token error");
  }
  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    id_token?: string;
  };
}

export async function exchangeGoogleCode(code: string) {
  return tokenRequest({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
}

async function refreshAccess(refreshToken: string) {
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
  });
}

export async function getValidAccessToken(userId: string) {
  const conn = await prisma.calendarConnection.findUnique({
    where: { userId },
  });
  if (!conn) throw new HttpError(400, "Google Calendar is not connected");
  if (conn.expiryDate && conn.expiryDate.getTime() > Date.now() + 60_000) {
    return { accessToken: conn.accessToken, conn };
  }
  if (!conn.refreshToken) {
    throw new HttpError(401, "Google authorization expired. Reconnect Calendar.");
  }
  const tokens = await refreshAccess(conn.refreshToken);
  const updated = await prisma.calendarConnection.update({
    where: { userId },
    data: {
      accessToken: tokens.access_token,
      expiryDate: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope ?? conn.scope,
    },
  });
  return { accessToken: updated.accessToken, conn: updated };
}

export async function googleApi(
  accessToken: string,
  path: string,
  init?: RequestInit,
) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Google API HTTP ${res.status}`);
  }
  return data;
}

export async function detectConflicts(p: {
  userId: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
}) {
  const local = await prisma.appointment.findMany({
    where: {
      userId: p.userId,
      status: { not: "CANCELLED" },
      startAt: { lt: p.endAt },
      endAt: { gt: p.startAt },
    },
  });
  if (local.length) {
    return { conflict: true as const, source: "local" as const, events: local };
  }

  const { accessToken } = await getValidAccessToken(p.userId);
  const busy = await googleApi(accessToken, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: p.startAt.toISOString(),
      timeMax: p.endAt.toISOString(),
      timeZone: p.timezone,
      items: [{ id: "primary" }],
    }),
  });
  const slots = busy.calendars?.primary?.busy ?? [];
  if (slots.length) {
    return { conflict: true as const, source: "google" as const, events: slots };
  }
  return { conflict: false as const };
}
