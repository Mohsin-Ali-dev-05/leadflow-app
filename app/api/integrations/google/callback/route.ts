import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { exchangeGoogleCode } from "@/lib/google";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(`${appUrl}/login`);
  const url = req.nextUrl;
  const err = url.searchParams.get("error");
  if (err) {
    return NextResponse.redirect(`${appUrl}/calendar?error=${encodeURIComponent(err)}`);
  }
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  const store = await cookies();
  const expected = store.get("gcal_oauth_state")?.value;
  store.delete("gcal_oauth_state");
  if (!expected || expected !== state || !state.startsWith(user.id + ".")) {
    return NextResponse.redirect(`${appUrl}/calendar?error=invalid_state`);
  }
  if (!code) return NextResponse.redirect(`${appUrl}/calendar?error=missing_code`);

  try {
    const tokens = await exchangeGoogleCode(code);
    let email: string | null = null;
    if (tokens.id_token) {
      const parts = tokens.id_token.split(".");
      if (parts[1]) {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf8"),
        );
        email = payload.email ?? null;
      }
    }
    await prisma.calendarConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        googleEmail: email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
      update: {
        googleEmail: email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiryDate: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    });
    await audit({
      workspaceId: user.workspaceId,
      actorId: user.id,
      eventType: "google.connected",
      targetId: user.id,
      metadata: { email },
    });
    return NextResponse.redirect(`${appUrl}/calendar?connected=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "oauth_failed";
    return NextResponse.redirect(
      `${appUrl}/calendar?error=${encodeURIComponent(message)}`,
    );
  }
}
