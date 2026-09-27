import { SettingsShell } from "@/components/settings/SettingsShell";
import { ThemeScript } from "@/components/settings/ThemeScript";
import type { Metadata } from "next";
import { Architects_Daughter, Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const architectsDaughter = Architects_Daughter({
  variable: "--font-brand",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Familyr",
  description:
    "Async family chat, weekly Hestia story, and opt-in clinician view without the group chat burnout.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${architectsDaughter.variable} h-full`} suppressHydrationWarning>
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
