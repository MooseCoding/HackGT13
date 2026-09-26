"use client";

import { useSettingsActions } from "@/components/settings/SettingsProvider";
import { useEffect } from "react";

export function FamilySettingsDefaults({ largerTextDefault }: { largerTextDefault: boolean }) {
  const { applyLargerTextDefault } = useSettingsActions();
  useEffect(() => {
    applyLargerTextDefault(largerTextDefault);
  }, [applyLargerTextDefault, largerTextDefault]);
  return null;
}
