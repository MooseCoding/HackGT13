"use client";

import {
  HCP_REPORTING_MODE_LABELS,
  loadHcpSettings,
  saveHcpSettings,
  syncHcpSettingsCookie,
  type HcpReportingMode,
} from "@/lib/hcp-settings";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function modeClass(active: boolean) {
  return active
    ? "border border-line bg-ground text-ink"
    : "text-mute hover:text-ink";
}

export function HcpReportingModeToggle({ initialMode }: { initialMode: HcpReportingMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<HcpReportingMode>(initialMode);

  useEffect(() => {
    const stored = loadHcpSettings().reportingMode;
    if (stored !== initialMode) {
      syncHcpSettingsCookie(stored);
      setMode(stored);
      router.refresh();
      return;
    }
    syncHcpSettingsCookie(initialMode);
  }, [initialMode, router]);

  function select(next: HcpReportingMode) {
    if (next === mode) return;
    setMode(next);
    saveHcpSettings({ reportingMode: next });
    syncHcpSettingsCookie(next);
    router.refresh();
  }

  return (
    <div
      className="flex flex-col gap-1 sm:items-end"
      role="group"
      aria-label="Reporting detail"
    >
      <div className="inline-flex border border-line bg-surface">
        {(["simple", "advanced"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => select(option)}
            className={`min-h-9 px-2.5 text-xs font-semibold sm:px-3 sm:text-sm ${modeClass(mode === option)}`}
          >
            {HCP_REPORTING_MODE_LABELS[option].label}
          </button>
        ))}
      </div>
      <p className="hidden max-w-xs text-right text-[11px] leading-4 text-mute lg:block">
        {HCP_REPORTING_MODE_LABELS[mode].description}
      </p>
    </div>
  );
}
