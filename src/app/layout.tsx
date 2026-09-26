import { DemoBanner } from "@/components/DemoModeSwitch";
import { isSupabaseConfigured } from "@/lib/mode";
import { isDemoMode } from "@/lib/mode-server";
import type { Metadata } from "next";
import { Fraunces, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hearth",
  description: "Family messaging, calendar, weekly summary, and clinician view for opted-in members.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const demo = await isDemoMode();
  return (
    <html lang="en" className={`${nunito.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <DemoBanner demo={demo} canGoLive={isSupabaseConfigured()} />
        {children}
      </body>
    </html>
  );
}
