import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Generate the url that will be used for authorization
  const authUrl = oauth2Client.generateAuthUrl({
    // 'offline' gets a refresh token so the app can sync in the background
    access_type: "offline",
    // 'consent' forces the prompt to appear so you always get a refresh token during testing for Hack GT
    prompt: "consent",
    // Scopes dictate what the app is allowed to do on the user's behalf
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  // Redirect the user to Google's OAuth 2.0 server
  return NextResponse.redirect(authUrl);
}