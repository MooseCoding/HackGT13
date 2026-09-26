"use client";

import {
  defaultSettings,
  hour12FromTimeFormat,
  isDarkTheme,
  type HearthSettings,
  type SettingKey,
  loadSettings,
  saveSettings,
  syncSettingsCookies,
} from "@/lib/settings";
import { DEMO_TIMEZONE } from "@/lib/clock";
import { resolveTimezone } from "@/lib/timezone";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type SettingsContextValue = {
  settings: HearthSettings;
  setSetting: <K extends SettingKey>(key: K, value: HearthSettings[K]) => void;
  effectiveTimezone: string;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SettingsCtx = createContext<SettingsContextValue | null>(null);

export function useSettings() {
  const value = useContext(SettingsCtx);
  if (!value) throw new Error("SettingsProvider missing");
  return value;
}

function applyTheme(theme: HearthSettings["theme"]) {
  document.documentElement.classList.toggle("dark", isDarkTheme(theme));
}

export function SettingsProvider({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: Partial<HearthSettings>;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<HearthSettings>(() => defaultSettings(fallback));
  const [open, setOpen] = useState(false);
  /** Pin SSR + first client paint to demo zone so chat timestamps match. */
  const [effectiveTimezone, setEffectiveTimezone] = useState(DEMO_TIMEZONE);
  const [hydrated, setHydrated] = useState(false);
  const prevHestiaGeneration = useRef<HearthSettings["hestiaGeneration"] | null>(null);

  useEffect(() => {
    const loaded = loadSettings(fallback);
    setSettings(loaded);
    setEffectiveTimezone(resolveTimezone(loaded.timezone));
    document.documentElement.classList.toggle("easy", loaded.largerText);
    applyTheme(loaded.theme);
    syncSettingsCookies(loaded);
    prevHestiaGeneration.current = loaded.hestiaGeneration;
    setHydrated(true);
  }, [fallback]);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
    syncSettingsCookies(settings);
    document.documentElement.classList.toggle("easy", settings.largerText);
    applyTheme(settings.theme);
    setEffectiveTimezone(resolveTimezone(settings.timezone));
    if (
      prevHestiaGeneration.current !== null &&
      prevHestiaGeneration.current !== settings.hestiaGeneration
    ) {
      prevHestiaGeneration.current = settings.hestiaGeneration;
      router.refresh();
    }
  }, [settings, hydrated, router]);

  useEffect(() => {
    if (!hydrated || settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      applyTheme("system");
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings.theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    function onGeoTimezone() {
      if (settings.timezone === "auto") {
        setEffectiveTimezone(resolveTimezone("auto"));
      }
    }
    window.addEventListener("hearth-geo-timezone", onGeoTimezone);
    return () => window.removeEventListener("hearth-geo-timezone", onGeoTimezone);
  }, [settings.timezone, hydrated]);

  const setSetting = <K extends SettingKey>(key: K, value: HearthSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const value = useMemo(
    () => ({ settings, setSetting, effectiveTimezone, open, setOpen }),
    [settings, effectiveTimezone, open],
  );

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useLargerText() {
  return useSettings().settings.largerText;
}

export function useTimezone() {
  return useSettings().effectiveTimezone;
}

export function useHour12() {
  return hour12FromTimeFormat(useSettings().settings.timeFormat);
}
