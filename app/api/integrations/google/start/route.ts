import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { handleRoute, requireUser } from "@/lib/tenant";
import { googleAuthUrl } from "@/lib/google";

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const state = `${user.id}.${randomBytes(16).toString("hex")}`;
  const store = await cookies();
  store.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(googleAuthUrl(state));
});
