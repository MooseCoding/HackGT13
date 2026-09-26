import { cookies } from "next/headers";
import { createSupabaseServer } from "./supabase/server";
import type { CalendarEvent } from "./types";

/** Canonical cookies used by Supabase OAuth callback + dedicated Google Calendar OAuth. */
const ACCESS = "hearth_google_access";
const REFRESH = "hearth_google_refresh";
/** Legacy cookie from /api/auth/google/callback */
const LEGACY_REFRESH = "google_refresh_token";
const TZ = "America/New_York";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function saveGoogleTokens(session: {
  provider_token?: string | null;
  provider_refresh_token?: string | null;
}) {
  const jar = await cookies();
  if (session.provider_token) {
    jar.set(ACCESS, session.provider_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 55,
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (session.provider_refresh_token) {
    jar.set(REFRESH, session.provider_refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
  }
}

export async function googleAccessToken(clientToken?: string | null) {
  if (clientToken?.trim()) return clientToken.trim();

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.provider_token) {
      await saveGoogleTokens(session);
      return session.provider_token;
    }
  } catch {
    // Demo / missing Supabase
  }

  const jar = await cookies();
  const cached = jar.get(ACCESS)?.value;
  if (cached) return cached;

  const refresh = jar.get(REFRESH)?.value || jar.get(LEGACY_REFRESH)?.value;
  if (!refresh) return null;

  const access = await refreshAccessToken(refresh);
  if (access) {
    jar.set(ACCESS, access, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 55,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return access;
}

export async function fetchGoogleEvents(
  familyId: string,
  token: string,
  min: Date,
  max: Date,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: min.toISOString(),
    timeMax: max.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) {
    console.error("Google Calendar list failed", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = await res.json();
  return (
    (data.items || []) as Array<{
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      location?: string;
    }>
  ).map((ge) => ({
    id: `google_${ge.id}`,
    familyId,
    title: ge.summary || "Google event",
    startsAt: ge.start?.dateTime || ge.start?.date || min.toISOString(),
    endsAt: ge.end?.dateTime || ge.end?.date,
    location: ge.location || "",
    attendees: [],
    sourceText: ge.summary || "",
    createdBy: "google",
    isGoogleSynced: true,
    googleEventId: ge.id,
  }));
}

export async function createGoogleEvent(token: string, event: CalendarEvent) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: event.title,
      location: event.location,
      start: { dateTime: start.toISOString(), timeZone: TZ },
      end: { dateTime: end.toISOString(), timeZone: TZ },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Google create failed (${res.status})`);
  }
  return res.json();
}

export async function deleteGoogleEvent(token: string, googleEventId: string) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 404) throw new Error(`Google delete failed (${res.status})`);
}
