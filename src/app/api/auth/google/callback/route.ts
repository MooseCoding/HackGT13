import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/family/calendar", req.url));
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const response = NextResponse.redirect(new URL("/family/calendar", req.url));

    if (tokens.refresh_token) {
      response.cookies.set("google_refresh_token", tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, 
      });
    }

    return response;
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return NextResponse.redirect(new URL("/family/calendar?error=auth_failed", req.url));
  }
}