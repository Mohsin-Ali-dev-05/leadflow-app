import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the Google connection from the database
  const connection = await prisma.calendarConnection.findUnique({
    where: { userId: user.id },
  });

  if (!connection || !connection.refreshToken) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 },
    );
  }

  const { title, startTime } = await req.json();

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/api/auth/google/callback",
  );
  oauth2Client.setCredentials({ refresh_token: connection.refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const startAt = new Date(startTime);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 hour later

  try {
    // 1. Create the event in REAL Google Calendar
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `LeadFlow: ${title}`,
        start: { dateTime: startAt.toISOString() },
        end: { dateTime: endAt.toISOString() },
      },
    });

    // 2. Save to your Appointment table
    await prisma.appointment.create({
      data: {
        workspaceId: user.workspaceId,
        userId: user.id,
        title: title,
        startAt: startAt,
        endAt: endAt,
        googleEventId: event.data.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
