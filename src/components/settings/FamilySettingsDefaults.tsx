"use client";

import { useSettings } from "@/components/settings/SettingsProvider";
import { useEffect, useRef } from "react";

export function FamilySettingsDefaults({ largerTextDefault }: { largerTextDefault: boolean }) {
  const { setSetting, settings } = useSettings();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current || settings.largerText) return;
    applied.current = true;
    setSetting("largerText", largerTextDefault);
  }, [largerTextDefault, setSetting, settings.largerText]);

  return null;
}
