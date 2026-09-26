"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";

const THEME_KEY = "hearth-theme";
const TEXT_KEY = "hearth-larger-text";
const TZ_KEY = "hearth-timezone";

type SettingsContextValue = {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
  largerText: boolean;
  setLargerText: (value: boolean) => void;
  applyLargerTextDefault: (value: boolean) => void;
  timezone: string | undefined;
  setTimezone: (tz: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // ignore
  }
  return "system";
}

function applyThemeClass(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const prefersDark =
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

function applyEasyClass(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("easy", on);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [largerText, setLargerTextState] = useState(false);
  const [timezone, setTimezoneState] = useState<string | undefined>(undefined);
  const [textLocked, setTextLocked] = useState(false);

  useEffect(() => {
    const initialTheme = readTheme();
    setThemeState(initialTheme);
    applyThemeClass(initialTheme);

    try {
      const savedText = window.localStorage.getItem(TEXT_KEY);
      if (savedText === "1" || savedText === "0") {
        const on = savedText === "1";
        setLargerTextState(on);
        applyEasyClass(on);
        setTextLocked(true);
      }
      const savedTz = window.localStorage.getItem(TZ_KEY);
      if (savedTz && savedTz !== "auto") setTimezoneState(savedTz);
    } catch {
      // ignore
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") applyThemeClass("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const setLargerText = useCallback((value: boolean) => {
    setLargerTextState(value);
    applyEasyClass(value);
    setTextLocked(true);
    try {
      window.localStorage.setItem(TEXT_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const applyLargerTextDefault = useCallback(
    (value: boolean) => {
      if (textLocked) return;
      setLargerTextState(value);
      applyEasyClass(value);
    },
    [textLocked],
  );

  const setTimezone = useCallback((tz: string) => {
    if (tz === "auto") {
      setTimezoneState(undefined);
      try {
        window.localStorage.setItem(TZ_KEY, "auto");
      } catch {
        // ignore
      }
      return;
    }
    setTimezoneState(tz);
    try {
      window.localStorage.setItem(TZ_KEY, tz);
    } catch {
      // ignore
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        largerText,
        setLargerText,
        applyLargerTextDefault,
        timezone,
        setTimezone,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("Settings hooks must be used within SettingsProvider");
  }
  return ctx;
}

export function useLargerText() {
  return useSettings().largerText;
}

export function useTimezone() {
  return useSettings().timezone;
}

export function useTheme() {
  return useSettings().theme;
}

export function useSettingsActions() {
  const { setTheme, setLargerText, setTimezone, applyLargerTextDefault, theme, largerText, timezone } =
    useSettings();
  return { setTheme, setLargerText, setTimezone, applyLargerTextDefault, theme, largerText, timezone };
}
