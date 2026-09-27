import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/components/family/CalendarBoard.tsx",
      "src/components/family/ChatApp.tsx",
      "src/components/family/SocialExtensions.tsx",
      "src/components/home/SignupPage.tsx",
      "src/components/settings/CircleSettingsSection.tsx",
      "src/components/settings/ClinicalSharingSettings.tsx",
      "src/components/settings/InsuranceSettings.tsx",
      "src/components/settings/SettingsPanel.tsx",
      "src/components/settings/SettingsProvider.tsx",
    ],
    rules: {
      // These screens intentionally synchronize server props, browser storage,
      // and async API state after hydration. React's blanket rule reports those
      // synchronization effects even though they are not render-derived state.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
