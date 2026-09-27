"use client";

import { demoLiveSignalSnapshot } from "@/lib/demo-client";
import type { PatientSnapshot } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

const steps = [
  { label: "Webhook verified", detail: "Meta signature and patient consent confirmed" },
  { label: "Voice transcribed", detail: "Audio processed; original file deleted" },
  { label: "Signals extracted", detail: "Pace, pauses, repetition, word choice, tone" },
  { label: "Baseline compared", detail: "Last 14 days vs their prior 30 days" },
  { label: "Brief sent", detail: "Clinical review queue updated" },
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
    const snapshot = demoLiveSignalSnapshot();
    for (let index = 1; index < steps.length; index += 1) {
      setActiveStep(index);
      await wait(650);
    }
    setSnapshot(snapshot);
    setRunning(false);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-sm border-4 border-chrome-bg bg-[#efeae2]">
        <div className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-emerald-100 text-xs font-bold text-emerald-800">RO</span>
            <div>
              <p className="text-sm font-semibold">Familyr Signal</p>
              <p className="text-[10px] text-emerald-100">Familyr intake · online</p>
            </div>
          </div>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92Z" />
          </svg>
        </div>
        <div className="flex min-h-[500px] flex-col justify-end p-4">
          <div className="mb-auto border border-line bg-surface px-3 py-2 text-center text-[10px] text-mute">
            Messages and calls stay protected by consent settings. Clinicians never see the raw audio.
          </div>
          <div className="ml-auto max-w-[88%] rounded-sm rounded-br-none border border-line bg-[#d9fdd3] p-3">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-[#128c7e] text-white">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="m8 5 11 7-11 7Z" />
                </svg>
              </span>
              <div className="flex flex-1 items-center gap-0.5" aria-hidden="true">
                {[9, 16, 12, 23, 8, 27, 18, 11, 25, 15, 8, 20, 13, 7, 17, 10].map((height, index) => (
                  <span key={index} className="w-1 bg-[#128c7e]" style={{ height }} />
                ))}
              </div>
              <span className="text-[10px] text-mute">0:19</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink">
              &ldquo;The list. The stew. I am feeling low today. I cannot find the list.&rdquo;
            </p>
            <p className="mt-1 text-right text-[9px] text-mute">1:14 AM ✓✓</p>
          </div>
          <div
            className={`mt-3 max-w-[88%] border border-line bg-surface p-3 text-xs leading-5 text-ink ${
              activeStep >= 1 ? "block" : "hidden"
            }`}
          >
            Got it privately. I&apos;ve updated your communication trend - no diagnosis, and your family chat stays
            private.
          </div>
          <button
            type="button"
            onClick={runDemo}
            disabled={running}
            className="mt-5 rounded-sm bg-[#128c7e] px-4 py-3 text-sm font-semibold text-white hover:bg-[#075e54] disabled:cursor-wait disabled:opacity-70"
          >
            {running ? "Working through the signal…" : snapshot ? "Play it again" : "Receive voice note"}
          </button>
        </div>
      </section>

      <div className="space-y-5">
        <section className="border border-line bg-surface p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-bold text-ink">From voice note to clinical brief</h2>
              <p className="mt-1 text-sm text-mute">Each step runs with consent and privacy limits in place.</p>
            </div>
          </div>
          <ol className="mt-6 grid gap-3 md:grid-cols-5">
            {steps.map((step, index) => {
              const done = activeStep >= index;
              return (
                <li
                  key={step.label}
                  className={`border p-3 ${done ? "border-line bg-surface" : "border-line bg-ground"}`}
                >
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-sm text-xs font-bold ${
                      done ? "border border-clinic bg-clinic text-white" : "border border-line bg-surface text-mute"
                    }`}
                  >
                    {done ? "✓" : index + 1}
                  </div>
                  <p className={`mt-3 text-xs font-semibold ${done ? "text-ink" : "text-mute"}`}>{step.label}</p>
                  <p className="mt-1 text-[10px] leading-4 text-mute">{step.detail}</p>
                </li>
              );
            })}
          </ol>
          {error ? (
            <p className="mt-4 border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
              {error} Open Familyr through &ldquo;Preview the demo family&rdquo; first.
            </p>
          ) : null}
        </section>

        <section className={`border bg-surface p-5 ${snapshot ? "border-rose-200" : "border-line"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-mute">Clinical review queue</p>
              <h2 className="mt-1 text-lg font-bold text-ink">Ruth Okonkwo</h2>
            </div>
            <span
              className={`rounded-sm border px-3 py-1.5 text-xs font-semibold ${
                snapshot?.riskLevel === "priority"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-line bg-ground text-mute"
              }`}
            >
              {snapshot?.riskLevel === "priority" ? "Priority review" : "Holding steady"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Speech pace", value: snapshot?.voice.wordsPerMinute ? `${snapshot.voice.wordsPerMinute.toFixed(0)} wpm` : "103 wpm", change: snapshot ? "↓ from baseline" : "Their usual pace" },
              { label: "Pause share", value: snapshot?.voice.pauseRatio != null ? `${Math.round(snapshot.voice.pauseRatio * 100)}%` : "10%", change: snapshot ? "↑ from baseline" : "Their usual rate" },
              { label: "Signals combined", value: snapshot ? snapshot.flags.length.toString() : "0", change: snapshot ? `${snapshot.confidence} confidence` : "No alert yet" },
            ].map((metric) => (
              <div key={metric.label} className="border border-line bg-ground p-4">
                <p className="text-[10px] font-semibold text-mute">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{metric.value}</p>
                <p className="mt-1 text-xs text-mute">{metric.change}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border border-line bg-ground p-4">
            <div className="flex items-center gap-2">
              <span className="border border-line bg-ground px-2 py-1 text-[10px] font-semibold text-clinic">
                Pre-visit brief
              </span>
              <span className="text-[10px] text-mute">Message text hidden</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-ink">
              {snapshot?.note ??
                "Waiting for a real shift from their baseline. One hard day on its own won't trigger an alert."}
            </p>
          </div>
          {snapshot ? (
            <Link href="/hcp/patients/ruth" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-clinic hover:underline">
              Open patient review <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </section>
      </div>
    </div>
  );
}
