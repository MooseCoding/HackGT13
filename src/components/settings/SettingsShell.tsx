import { SettingsProvider } from "@/components/settings/SettingsProvider";
import type { ReactNode } from "react";

export function SettingsShell({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>;
}
