"use client";

import type { PatientSnapshot } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

const steps = [
  { label: "Webhook verified", detail: "Meta signature + explicit patient consent" },
  { label: "Voice transcribed", detail: "Audio processed; original media discarded" },
  { label: "Signals extracted", detail: "Pace, pauses, repetition, language, affect" },
  { label: "Baseline compared", detail: "14 recent days vs personal 30-day history" },
  { label: "Clinical brief routed", detail: "Impiricus review queue updated" },
];

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function LiveSignalDemo() {
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [snapshot, setSnapshot] = useState<PatientSnapshot | null>(null);
  const [error, setError] = useState("");

  async function runDemo() {
    setRunning(true);
    setSnapshot(null);
    setError("");
    setActiveStep(0);
    await wait(650);
    const response = await fetch("/api/clinical/demo-signal", { method: "POST" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Could not run the signal simulation.");
      setRunning(false);
      return;
    }
    const result = (await response.json()) as { patient?: { snapshot?: PatientSnapshot } };
    for (let index = 1; index < steps.length; index += 1) {
      setActiveStep(index);
      await wait(650);
    }
    setSnapshot(result.patient?.snapshot ?? null);
    setRunning(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-[2rem] border-[8px] border-slate-900 bg-[#efeae2] shadow-2xl shadow-slate-300/60">
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">RO</span>
            <div><p className="text-sm font-semibold">Hearth Signal</p><p className="text-[10px] text-emerald-100">WhatsApp Business · online</p></div>
          </div>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92Z" /></svg>
        </div>
        <div className="flex min-h-[500px] flex-col justify-end p-4">
          <div className="mb-auto rounded-lg bg-white/80 px-3 py-2 text-center text-[10px] text-slate-500">Messages and calls are protected by consent controls. Raw audio is not shown to clinicians.</div>
          <div className="ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-[#d9fdd3] p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#128c7e] text-white">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>
              </span>
              <div className="flex flex-1 items-center gap-0.5" aria-hidden="true">
                {[9, 16, 12, 23, 8, 27, 18, 11, 25, 15, 8, 20, 13, 7, 17, 10].map((height, index) => <span key={index} className="w-1 rounded-full bg-[#128c7e]/70" style={{ height }} />)}
              </div>
              <span className="text-[10px] text-slate-500">0:19</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-700">“The list. The stew. I am feeling low today. I cannot find the list.”</p>
            <p className="mt-1 text-right text-[9px] text-slate-400">1:14 AM ✓✓</p>
          </div>
          <div className={`mt-3 max-w-[88%] rounded-xl rounded-bl-sm bg-white p-3 text-xs leading-5 text-slate-700 shadow-sm transition-all ${activeStep >= 1 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
            Received privately. I&apos;ve updated your communication trend—no diagnosis was made and your family chat stays private.
          </div>
          <button
            type="button"
            onClick={runDemo}
            disabled={running}
            className="mt-5 rounded-xl bg-[#128c7e] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#075e54] disabled:cursor-wait disabled:opacity-70"
          >
            {running ? "Analyzing live signal…" : snapshot ? "Replay incoming voice note" : "Receive WhatsApp voice note"}
          </button>
        </div>
      </section>

      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Live agent trace</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">From ordinary voice note to clinical context</h2></div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Privacy boundary active</span>
          </div>
          <ol className="mt-6 grid gap-3 md:grid-cols-5">
            {steps.map((step, index) => {
              const done = activeStep >= index;
              return (
                <li key={step.label} className={`relative rounded-xl border p-3 transition-all duration-500 ${done ? "border-blue-200 bg-blue-50 shadow-sm" : "border-slate-200 bg-slate-50/50"}`}>
                  <div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${done ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>{done ? "✓" : index + 1}</div>
                  <p className={`mt-3 text-xs font-semibold ${done ? "text-blue-900" : "text-slate-500"}`}>{step.label}</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">{step.detail}</p>
                </li>
              );
            })}
          </ol>
          {error ? <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error} Open Hearth through “Preview the demo family” first.</p> : null}
        </section>

        <section className={`rounded-2xl border bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)] transition-all duration-700 ${snapshot ? "border-rose-200 opacity-100" : "border-slate-200 opacity-70"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-medium text-slate-500">Impiricus clinical queue</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Ruth Okonkwo</h2></div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${snapshot?.riskLevel === "priority" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{snapshot?.riskLevel === "priority" ? "Priority review" : "Stable baseline"}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Speech pace", value: snapshot?.voice.wordsPerMinute ? `${snapshot.voice.wordsPerMinute.toFixed(0)} wpm` : "103 wpm", change: snapshot ? "↓ from baseline" : "Personal baseline" },
              { label: "Pause share", value: snapshot?.voice.pauseRatio != null ? `${Math.round(snapshot.voice.pauseRatio * 100)}%` : "10%", change: snapshot ? "↑ from baseline" : "Personal baseline" },
              { label: "Signals combined", value: snapshot ? snapshot.flags.length.toString() : "0", change: snapshot ? `${snapshot.confidence} confidence` : "No alert" },
            ].map((metric) => <div key={metric.label} className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{metric.label}</p><p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.change}</p></div>)}
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-2"><span className="rounded bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase text-blue-700">Agent brief</span><span className="text-[10px] text-slate-400">No raw message exposed</span></div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{snapshot?.note ?? "Waiting for a consented baseline shift. A single difficult day does not create a clinical alert."}</p>
          </div>
          {snapshot ? <Link href="/hcp/patients/ruth" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">Open explainable patient review <span aria-hidden="true">→</span></Link> : null}
        </section>
      </div>
    </div>
  );
}
