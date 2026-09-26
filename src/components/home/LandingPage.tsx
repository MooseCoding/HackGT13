"use client";

import { GoogleSignInButton } from "@/components/home/GoogleSignInButton";
import type { PublicSupabaseConfig } from "@/lib/supabase/public";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LandingPage({
  next,
  authError,
  signedIn,
  needsOnboarding,
  supabaseConfig,
}: {
  next: string;
  authError: boolean;
  signedIn: boolean;
  needsOnboarding: boolean;
  supabaseConfig: PublicSupabaseConfig | null;
}) {
  const [demoBusy, setDemoBusy] = useState(false);
  const router = useRouter();

  async function openDemo(destination = "/hcp/live") {
    setDemoBusy(true);
    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demo: true }),
    });
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="min-h-full bg-[#07140f] text-white">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400 text-lg font-bold text-emerald-950">H</span>
            <span><span className="block font-brand text-lg leading-5">Hearth Signal</span><span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Ambient care intelligence</span></span>
          </Link>
          {signedIn ? <Link href={needsOnboarding ? "/onboarding" : "/hcp"} className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">{needsOnboarding ? "Finish setup" : "Open dashboard"}</Link> : null}
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />Built for families who do not want another app</div>
            <h1 className="font-brand mt-6 text-5xl leading-[1.02] tracking-[-0.04em] sm:text-6xl">The early signal hiding in everyday conversation.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Hearth turns consented WhatsApp messages and voice notes into privacy-preserving changes in communication, mood, and connection—then gives clinicians context between visits.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => openDemo("/hcp/live")} disabled={demoBusy} className="rounded-xl bg-emerald-400 px-5 py-3.5 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-950/30 hover:bg-emerald-300 disabled:opacity-60">{demoBusy ? "Preparing live signal…" : "Run the 60-second demo"}</button>
              <button type="button" onClick={() => openDemo("/family")} disabled={demoBusy} className="rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10">Explore the family experience</button>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Decision support only. Not a diagnosis or medical device.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">Live agent trace</p><p className="mt-1 text-sm text-slate-400">WhatsApp voice note · Ruth · 1:14 AM</p></div><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">Consent verified</span></div>
              <div className="mt-5 space-y-3">
                {[
                  ["Voice analyzed", "49 wpm · 44% pause share", "emerald"],
                  ["Baseline compared", "3 independent shifts detected", "blue"],
                  ["Impiricus brief", "Priority review · moderate confidence", "rose"],
                ].map(([label, detail, color], index) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
                    <span className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${color === "emerald" ? "bg-emerald-400 text-emerald-950" : color === "blue" ? "bg-blue-400 text-blue-950" : "bg-rose-400 text-rose-950"}`}>{index + 1}</span>
                    <div><p className="text-sm font-semibold">{label}</p><p className="mt-0.5 text-xs text-slate-400">{detail}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4"><p className="text-xs font-semibold text-emerald-200">Privacy by design</p><p className="mt-1 text-xs leading-5 text-slate-400">Clinicians receive longitudinal signals and confidence—not a copy of the family conversation.</p></div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.03]">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-3">
            {[
              ["01", "Use what already exists", "WhatsApp, voice notes, and phone—not another social network."],
              ["02", "Notice change, not keywords", "Personal 30-day baselines combine language, voice, timing, and engagement."],
              ["03", "Route context, not conclusions", "The agent creates an explainable HCP brief for human clinical review."],
            ].map(([number, title, body]) => <article key={number}><p className="font-mono text-xs text-emerald-300">{number}</p><h2 className="mt-3 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{body}</p></article>)}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_420px] lg:items-center">
          <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">For real deployments</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Explicit consent at every boundary.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Family members choose whether to share derived signals. A single difficult message suggests a compassionate check-in; only sustained, multi-signal change enters the clinician queue.</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
            <h2 className="font-semibold">{signedIn ? "Your account is ready" : "Connect your care circle"}</h2>
            <p className="mt-1 text-sm text-slate-400">{signedIn ? (needsOnboarding ? "Add members and set consent next." : "Open your private workspace.") : "Google sign-in for the full multi-family experience."}</p>
            {authError ? <p className="mt-3 text-sm text-rose-300" role="alert">Google sign-in did not finish. Try again.</p> : null}
            <div className="mt-4">{signedIn ? <Link href={needsOnboarding ? "/onboarding" : "/hcp"} className="flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-slate-950">{needsOnboarding ? "Set up care circle" : "Open clinical dashboard"}</Link> : <GoogleSignInButton next={next} supabaseConfig={supabaseConfig} />}</div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-5 text-center text-xs text-slate-500">Hearth Signal · Built at HackGT 13 for Impiricus + Meta</footer>
    </div>
  );
}
