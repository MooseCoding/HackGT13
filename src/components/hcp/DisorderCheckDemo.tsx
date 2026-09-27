"use client";

import { formatWhen } from "@/lib/clock";
import { demoDisorderScan } from "@/lib/demo-client";
import type { DisorderSignalHit } from "@/lib/clinical/disorder-scan";
import type { PatientSnapshot } from "@/lib/types";
import { useState } from "react";

const previewMessages = [
  "My bipolar is acting up. I have not slept in three days.",
  "My depression is worse this week. I do not want to see anyone.",
  "Had a flashback during dinner. My PTSD is acting up again.",
  "I cannot stop checking the locks because of my OCD.",
];

const CONTEXT_TAG_LABELS: Record<string, string> = {
  "late-night": "Late night",
  repetition: "Repetition",
  trauma: "Trauma",
  loneliness: "Loneliness",
  "low-mood": "Low mood",
};

function titleCaseTag(tag: string) {
  return tag.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function contextTagsForHit(hit: DisorderSignalHit) {
  const skip = new Set([hit.concern, hit.label.toLowerCase()]);
  return hit.tags
    .filter((tag) => !skip.has(tag.toLowerCase()))
    .map((tag) => CONTEXT_TAG_LABELS[tag] ?? titleCaseTag(tag));
}

export function DisorderCheckDemo({
  memberId,
  patientFirstName,
  familyId,
}: {
  memberId: string;
  patientFirstName: string;
  familyId: string;
}) {
  const [running, setRunning] = useState(false);
  const [hits, setHits] = useState<DisorderSignalHit[] | null>(null);
  const [snapshot, setSnapshot] = useState<PatientSnapshot | null>(null);
  const [error, setError] = useState("");

  async function runDemo() {
    setRunning(true);
    setError("");
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    const result = demoDisorderScan(memberId, familyId);
    setHits(result.hits);
    setSnapshot(result.snapshot);
    setRunning(false);
  }

  return (
    <section className="mt-5 border border-line bg-surface p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-mute">Demo only</p>
          <h2 className="mt-1 text-lg font-bold text-ink">Mental health language check</h2>
          <p className="mt-2 text-sm leading-6 text-mute">
            Simulates messages from {patientFirstName}. Disorder-related language gets tagged for your
            review. It never shows in family chat and it&apos;s not a diagnosis.
          </p>
        </div>
        <button
          type="button"
          onClick={runDemo}
          disabled={running}
          className="shrink-0 rounded-sm bg-clinic px-4 py-2.5 text-sm font-semibold text-white hover:bg-clinic/90 disabled:cursor-wait disabled:opacity-70"
        >
          {running ? "Checking messages…" : hits ? "Run again" : "Run language check"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="border border-line bg-ground p-4">
          <p className="text-xs font-semibold text-mute">Sample messages</p>
          <ol className="mt-3 space-y-2">
            {previewMessages.map((message, index) => (
              <li key={message} className="flex gap-2 border border-line bg-surface px-3 py-2 text-xs leading-5 text-ink">
                <span className="shrink-0 font-semibold text-mute">{index + 1}.</span>
                <span>&ldquo;{message}&rdquo;</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border border-line bg-ground p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-mute">Flagged concern areas</p>
            {hits ? (
              <span className="rounded-sm border border-line bg-surface px-2 py-0.5 text-[10px] font-semibold text-mute">
                {hits.length} flagged
              </span>
            ) : null}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}
          {!hits && !error ? (
            <p className="mt-3 text-sm leading-6 text-mute">
              Run the check to see bipolar, depression, PTSD, and OCD language tags on the clinician brief only.
            </p>
          ) : null}
          {hits && hits.length === 0 && !error ? (
            <p className="mt-3 border border-line bg-surface p-3 text-sm leading-6 text-mute">
              No disorder-related language was flagged in these messages.
            </p>
          ) : null}
          {hits?.length ? (
            <ol className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {hits.map((hit) => {
                const contextTags = contextTagsForHit(hit);
                return (
                  <li key={hit.id} className="border border-line border-l-2 border-l-clinic bg-surface p-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-sm font-semibold text-ink">{hit.label}</p>
                        <span className="rounded-sm border border-clinic/30 bg-clinic/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-clinic">
                          {hit.confidence}%
                        </span>
                      </div>
                      <time className="text-[11px] text-mute">{formatWhen(hit.receivedAt)}</time>
                    </div>
                    {contextTags.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {contextTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-sm border border-line bg-accent-tint px-1.5 py-0.5 text-[10px] font-medium text-clinic"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 border border-line bg-ground px-2.5 py-2 text-xs leading-5 text-ink">
                      &ldquo;{hit.clinicianPreview}&rdquo;
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-mute">
                      {hit.label}-related language tagged for your review. Withheld from family chat - not a diagnosis.
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {snapshot ? (
            <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-mute">
              Updated brief confidence: <span className="font-semibold capitalize text-ink">{snapshot.confidence}</span>
              {" · "}
              {`${snapshot.insight.evidence.length} source event${snapshot.insight.evidence.length === 1 ? "" : "s"} with message text hidden`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
