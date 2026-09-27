import { cookies } from "next/headers";
import { CAL_WEEKS } from "./calendar-window";
import { patchEventRow } from "./data";
import { createSupabaseServer } from "./supabase/server";
import type { CalendarEvent } from "./types";

/** Canonical cookies used by Supabase OAuth callback + dedicated Google Calendar OAuth. */
const ACCESS = "hearth_google_access";
const REFRESH = "hearth_google_refresh";
/** Legacy cookie from /api/auth/google/callback */
const LEGACY_REFRESH = "google_refresh_token";
const TZ = "America/New_York";
const PRIMARY = "primary";
export const FAMILY_TITLE_PREFIX = "Family -- ";
export const GOOGLE_EVENT_COUNT = 5;

type GCalEvent = {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
};

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

/** Drop cached OAuth tokens after 401/403 or explicit disconnect. */
export async function clearGoogleTokens() {
  const jar = await cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
  jar.delete(LEGACY_REFRESH);
}

export async function googleAccessToken(clientToken?: string | null) {
  if (clientToken?.trim()) return clientToken.trim();

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.provider_token) {
      return session.provider_token;
    }
  } catch {
    // Demo / missing Supabase
  }

  const jar = await cookies();
  const refresh = jar.get(REFRESH)?.value || jar.get(LEGACY_REFRESH)?.value;
  if (refresh) {
    const access = await refreshAccessToken(refresh);
    if (access) {
      jar.set(ACCESS, access, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 55,
        secure: process.env.NODE_ENV === "production",
      });
      return access;
    }
  }

  const cached = jar.get(ACCESS)?.value;
  if (cached) return cached;

  return null;
}

async function listEventPage(token: string, params: Record<string, string>) {
  const qs = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    ...params,
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${PRIMARY}/events?${qs}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      await clearGoogleTokens();
      return { items: [] as GCalEvent[], nextPageToken: undefined as string | undefined };
    }
    const err = await res.text().catch(() => "");
    console.warn(`Google Calendar list failed (${res.status}):`, err.slice(0, 200));
    return { items: [] as GCalEvent[], nextPageToken: undefined as string | undefined };
  }
  const data = await res.json();
  return { items: (data.items || []) as GCalEvent[], nextPageToken: data.nextPageToken as string | undefined };
}

function eventStart(ge: GCalEvent, fallback: Date) {
  return new Date(ge.start?.dateTime || ge.start?.date || fallback.toISOString());
}

function isFamilyTitle(title: string) {
  return title.toLowerCase().startsWith(FAMILY_TITLE_PREFIX.toLowerCase());
}

function mapGoogleEvent(ge: GCalEvent, familyId: string, fallback: Date): CalendarEvent {
  const title = ge.summary || "Google event";
  return {
    id: `google_${ge.id}`,
    familyId,
    title,
    startsAt: ge.start?.dateTime || ge.start?.date || fallback.toISOString(),
    endsAt: ge.end?.dateTime || ge.end?.date,
    location: ge.location || "",
    attendees: [],
    sourceText: title,
    createdBy: "google",
    calendarScope: isFamilyTitle(title) ? "family" : "mine",
    isGoogleSynced: true,
    googleEventId: ge.id,
    googleCalendarId: PRIMARY,
  };
}

/** Fetch Google events within the same ±CAL_WEEKS window as the Familyr calendar. */
export async function fetchGoogleInWindow(
  familyId: string,
  token: string,
  anchor: Date,
): Promise<CalendarEvent[]> {
  const min = new Date(anchor);
  min.setDate(min.getDate() - CAL_WEEKS * 7);
  const max = new Date(anchor);
  max.setDate(max.getDate() + CAL_WEEKS * 7);

  const all: GCalEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 6; page++) {
    const result = await listEventPage(token, {
      timeMin: min.toISOString(),
      timeMax: max.toISOString(),
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });
    all.push(...result.items);
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
  }

  const seen = new Set<string>();
  const merged: CalendarEvent[] = [];
  for (const ge of all) {
    if (seen.has(ge.id)) continue;
    seen.add(ge.id);
    merged.push(mapGoogleEvent(ge, familyId, anchor));
  }
  return merged.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Pull the previous `count` and next `count` events from the user's real Google Calendar. */
export async function fetchGoogleAroundNow(
  familyId: string,
  token: string,
  now: Date,
  count = GOOGLE_EVENT_COUNT,
): Promise<CalendarEvent[]> {
  const min = new Date(now);
  min.setFullYear(min.getFullYear() - 1);

  const pastAll: GCalEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 8; page++) {
    const result = await listEventPage(token, {
      timeMin: min.toISOString(),
      timeMax: now.toISOString(),
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });
    pastAll.push(...result.items);
    if (!result.nextPageToken) break;
    pageToken = result.nextPageToken;
  }

  const past = pastAll
    .filter((e) => eventStart(e, now).getTime() < now.getTime())
    .sort((a, b) => eventStart(a, now).getTime() - eventStart(b, now).getTime())
    .slice(-count);

  const { items: future } = await listEventPage(token, {
    timeMin: now.toISOString(),
    maxResults: String(count),
  });

  const seen = new Set<string>();
  const merged: CalendarEvent[] = [];
  for (const ge of [...past, ...future]) {
    if (seen.has(ge.id)) continue;
    seen.add(ge.id);
    merged.push(mapGoogleEvent(ge, familyId, now));
  }
  return merged.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Keep the original offset from Familyr events - don't mix UTC ISO with a local timeZone. */
function googleDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hasOffset = /[+-]\d{2}:\d{2}$|Z$/i.test(iso.trim());
  if (hasOffset) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export async function createGoogleEvent(token: string, event: CalendarEvent) {
  const startIso = googleDateTime(event.startsAt);
  const endIso = event.endsAt
    ? googleDateTime(event.endsAt)
    : googleDateTime(new Date(new Date(event.startsAt).getTime() + 60 * 60 * 1000).toISOString());
  const title =
    event.calendarScope === "family" && !isFamilyTitle(event.title)
      ? `${FAMILY_TITLE_PREFIX}${event.title}`
      : event.title;
  const useTimeZone = !/[+-]\d{2}:\d{2}$|Z$/i.test(startIso.trim());
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${PRIMARY}/events`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: title,
      location: event.location || undefined,
      start: useTimeZone ? { dateTime: startIso, timeZone: TZ } : { dateTime: startIso },
      end: useTimeZone ? { dateTime: endIso, timeZone: TZ } : { dateTime: endIso },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(err || `Google create failed (${res.status})`);
  }
  const data = (await res.json()) as { id?: string };
  return { id: data.id ?? "" };
}

export async function syncEventToGoogle(token: string, event: CalendarEvent): Promise<CalendarEvent> {
  const created = await createGoogleEvent(token, event);
  if (!created.id) return event;
  const synced = {
    ...event,
    googleEventId: created.id,
    isGoogleSynced: true,
    googleCalendarId: PRIMARY,
  };
  await patchEventRow(event.id, event.familyId, {
    googleEventId: created.id,
    isGoogleSynced: true,
    googleCalendarId: PRIMARY,
  });
  return synced;
}

/** Push one or more local events to Google when a token is available. */
export async function syncEventsToGoogle(
  token: string,
  events: CalendarEvent[],
): Promise<{ events: CalendarEvent[]; synced: number; errors: string[] }> {
  const saved: CalendarEvent[] = [];
  const errors: string[] = [];
  let synced = 0;
  for (const event of events) {
    try {
      const row = await syncEventToGoogle(token, event);
      saved.push(row);
      if (row.googleEventId) synced += 1;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "Google sync failed");
      saved.push(event);
    }
  }
  return { events: saved, synced, errors };
}

export async function deleteGoogleEvent(token: string, googleEventId: string) {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${PRIMARY}/events/${encodeURIComponent(googleEventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok && res.status !== 404) throw new Error(`Google delete failed (${res.status})`);
}
