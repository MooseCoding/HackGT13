import { SettingsShell } from "@/components/settings/SettingsShell";
import { ThemeScript } from "@/components/settings/ThemeScript";
import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hearth",
  description:
    "Async family chat, weekly Hestia story, and opt-in clinician view without the group chat burnout.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} h-full`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/instagram-sans-2" />
        <ThemeScript />
      </head>
      <body className="min-h-full font-sans text-base leading-6 antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-paper focus:px-3 focus:py-2 focus:text-ink focus:shadow"
        >
          Skip to main content
        </a>
        <SettingsShell>{children}</SettingsShell>
      </body>
    </html>
  );
}
