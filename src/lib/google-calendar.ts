import { cookies } from "next/headers";
import type { Session } from "@supabase/supabase-js";
import type { CalendarEvent } from "./types";
import { createSupabaseServer } from "./supabase/server";

const ACCESS_COOKIE = "hearth-gcal-access";
const REFRESH_COOKIE = "hearth-gcal-refresh";

async function setTokenCookies(access?: string | null, refresh?: string | null) {
  const jar = await cookies();
  if (access) {
    jar.set(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60,
    });
  }
  if (refresh) {
    jar.set(REFRESH_COOKIE, refresh, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}

/** Persist Google provider tokens after OAuth so Calendar APIs can use them later. */
export async function saveGoogleTokens(session: Session) {
  await setTokenCookies(session.provider_token, session.provider_refresh_token);
}

export async function googleAccessToken(clientToken?: string | null): Promise<string | null> {
  if (clientToken?.trim()) return clientToken.trim();

  try {
    const supabase = await createSupabaseServer();
    const { data } = await supabase.auth.getSession();
    if (data.session?.provider_token) {
      await setTokenCookies(data.session.provider_token, data.session.provider_refresh_token);
      return data.session.provider_token;
    }
  } catch {
    // Demo / missing Supabase — fall through to cookies.
  }

  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

function mapGoogleItem(familyId: string, ge: {
  id?: string;
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}): CalendarEvent {
  const startsAt = ge.start?.dateTime || ge.start?.date || new Date().toISOString();
  return {
    id: `google_${ge.id ?? crypto.randomUUID()}`,
    familyId,
    title: ge.summary || "Google Calendar Event",
    startsAt,
    endsAt: ge.end?.dateTime || ge.end?.date,
    location: ge.location || undefined,
    attendees: [],
    sourceText: ge.summary || "Google Calendar Event",
    createdBy: "google",
    isGoogleSynced: true,
    googleEventId: ge.id ?? null,
  };
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
    maxResults: "50",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Calendar fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { items?: Array<Parameters<typeof mapGoogleItem>[1]> };
  return (data.items ?? []).map((item) => mapGoogleItem(familyId, item));
}

export async function createGoogleEvent(token: string, event: CalendarEvent) {
  const endsAt = event.endsAt
    ? new Date(event.endsAt)
    : new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000);
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      location: event.location,
      description: event.sourceText,
      start: { dateTime: event.startsAt },
      end: { dateTime: endsAt.toISOString() },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Calendar create failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function deleteGoogleEvent(token: string, googleEventId: string) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Calendar delete failed (${res.status}): ${body.slice(0, 200)}`);
  }
}
