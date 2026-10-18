import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const user = await getSessionUser();
  if (!code || !user)
    return NextResponse.redirect("http://localhost:3000/dashboard");

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/google/callback",
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    await prisma.calendarConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
      update: {
        accessToken: tokens.access_token || "",
        refreshToken: tokens.refresh_token || "",
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    });
  } catch (error) {
    console.error("OAuth Error", error);
  }

  return NextResponse.redirect("http://localhost:3000/dashboard");
}
