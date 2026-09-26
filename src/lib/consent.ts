import type { FamilyCallFrequency } from "./family-call-frequency";

const STORAGE_KEY = "hearth-pending-consent";

export type PendingConsent = {
  healthcare: boolean;
  familyCallFrequency: FamilyCallFrequency;
};

export function writePendingConsent(pending: PendingConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingConsent(): PendingConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingConsent;
    if (typeof parsed?.healthcare !== "boolean" || !parsed.familyCallFrequency) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
