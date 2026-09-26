import { mergedEventsOf } from "./calendar-data";
import { calendarAnchor } from "./clock";
import { getAccountConsent } from "./consent-server";
import { addEventRow, familyById, membersOf } from "./data";
import { proposeFamilyCalls } from "./family-call-schedule";
import { isDemoMode } from "./mode-server";
import { syncEventsToGoogle } from "./google-calendar";
import type { CalendarEvent } from "./types";

export async function scheduleFamilyCallsForCircle(
  familyId: string,
  createdBy: string,
  opts?: { googleToken?: string; force?: boolean },
): Promise<{ events: CalendarEvent[]; count: number; googleSynced: number; skipped?: boolean }> {
  const family = await familyById(familyId);
  if (!family.autoAddFamilyCalls && !opts?.force) {
    return { events: [], count: 0, googleSynced: 0, skipped: true };
  }

  const { familyCallFrequency } = await getAccountConsent();
  if (familyCallFrequency === "none") {
    return { events: [], count: 0, googleSynced: 0, skipped: true };
  }

  const demo = await isDemoMode();
  const anchor = calendarAnchor(demo);
  const members = await membersOf(familyId);
  const merged = await mergedEventsOf(familyId, {
    clientToken: opts?.googleToken,
    anchor,
  });
  const proposed = proposeFamilyCalls(merged, {
    familyId,
    createdBy,
    members,
    anchor,
    frequency: familyCallFrequency,
  });

  const localRows: CalendarEvent[] = [];
  for (const event of proposed) {
    localRows.push(await addEventRow(event));
  }

  let saved = localRows;
  let googleSynced = 0;
  if (opts?.googleToken && localRows.length) {
    const result = await syncEventsToGoogle(opts.googleToken, localRows);
    saved = result.events;
    googleSynced = result.synced;
  }

  return { events: saved, count: saved.length, googleSynced };
}
