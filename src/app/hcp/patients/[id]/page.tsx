import { Metric, TrendChart } from "@/components/hcp/Charts";
import { formatDay, formatWhen } from "@/lib/clock";
import { clinicalPatientById } from "@/lib/clinical/operations";
import type { ClinicalFlag, PatientSnapshot } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function RiskBadge({ level }: { level: PatientSnapshot["riskLevel"] }) {
  const styles = {
    priority: "border-rose-200 bg-rose-50 text-rose-700",
    monitor: "border-amber-200 bg-amber-50 text-amber-700",
    stable: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  const labels = { priority: "Priority review", monitor: "Monitor", stable: "Stable" };
  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[level]}`}>{labels[level]}</span>;
}

function severityStyle(severity: ClinicalFlag["severity"]) {
  if (severity === "high") return "bg-rose-100 text-rose-700";
  if (severity === "elevated") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await clinicalPatientById(id);
  if (!row) notFound();
  const { member, family, snapshot: snapshot } = row;
  const checkInEvent = row.events.find(
    (event) => new Date(event.startsAt) >= new Date(snapshot.assessedAt) && event.attendees.includes(member.id),
  );
  const firstName = member.name.split(" ")[0];
  const draft = checkInEvent
    ? `Could someone check in with ${firstName} before ${checkInEvent.title}?`
    : `Could someone check in with ${firstName} today?`;

  return (
    <div>
      <Link href="/hcp" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-blue-700">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        Patient overview
      </Link>

      <header className="mt-5 flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full text-base font-semibold text-white ring-4 ring-slate-50" style={{ background: member.color }}>
            {member.initials}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{member.name}</h1>
              <RiskBadge level={snapshot.riskLevel} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{member.age} years · {member.role} · {family.name}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-slate-400">Signal confidence</p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-800">{snapshot.confidence}</p>
          <p className="mt-0.5 text-xs text-slate-400">{snapshot.currentSampleSize + snapshot.baselineSampleSize} observations</p>
        </div>
      </header>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white px-5 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-white">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v18M3 12h18" /></svg>
            </span>
            Agent-generated pre-visit brief
          </div>
          <p className="mt-3 max-w-4xl text-[15px] leading-7 text-slate-700">{snapshot.note}</p>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold text-slate-500">Suggested clinical action</p>
            <p className="mt-1 text-sm leading-6 text-slate-800">{snapshot.nextStep}</p>
          </div>
          <Link href={`/family?draft=${encodeURIComponent(draft)}`} className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
            Coordinate check-in
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Clinical domains">
        {snapshot.domains.map((domain) => {
          const color = domain.trend === "changed" ? "#e11d48" : domain.trend === "watch" ? "#d97706" : "#059669";
          return (
            <div key={domain.key} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${domain.score * 3.6}deg, #e2e8f0 0deg)` }}>
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-semibold text-slate-900">{domain.score}</div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{domain.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{domain.description}</p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">42-day signal timeline</h2>
              <p className="mt-1 text-xs text-slate-500">Lexical diversity from consented text and voice-note transcripts</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-blue-600" />Lexical diversity</div>
          </div>
          <div className="mt-5">
            <TrendChart points={snapshot.series} accessor={(point) => point.lexicalDiversity} label={`${member.name} lexical diversity over 42 days`} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Metric label="Lexical diversity" value={snapshot.lexicalDiversity.toFixed(2)} baseline={snapshot.lexicalDiversityBaseline.toFixed(2)} delta={snapshot.lexicalDiversityDelta} />
            <Metric label="Sentence length" value={`${snapshot.meanSentenceLength.toFixed(1)} words`} baseline={`${snapshot.meanSentenceLengthBaseline.toFixed(1)} words`} delta={snapshot.sentenceLengthDelta} />
            <Metric label="Interactions / week" value={snapshot.engagementPerWeek.toFixed(1)} baseline={snapshot.engagementBaseline.toFixed(1)} delta={snapshot.engagementDelta} />
            <Metric label="Late-night activity" value={percent(snapshot.nightShare)} baseline={percent(snapshot.nightShareBaseline)} delta={snapshot.nightShare - snapshot.nightShareBaseline} invert />
            {snapshot.voice.wordsPerMinute !== null ? <Metric label="Voice pace" value={`${snapshot.voice.wordsPerMinute.toFixed(0)} wpm`} baseline={snapshot.voice.wordsPerMinuteBaseline === null ? "No baseline" : `${snapshot.voice.wordsPerMinuteBaseline.toFixed(0)} wpm`} delta={snapshot.voice.wordsPerMinuteBaseline ? snapshot.voice.wordsPerMinute / snapshot.voice.wordsPerMinuteBaseline - 1 : null} /> : null}
            {snapshot.voice.pauseRatio !== null ? <Metric label="Voice pause share" value={percent(snapshot.voice.pauseRatio)} baseline={snapshot.voice.pauseRatioBaseline === null ? "No baseline" : percent(snapshot.voice.pauseRatioBaseline)} delta={snapshot.voice.pauseRatioBaseline === null ? null : snapshot.voice.pauseRatio - snapshot.voice.pauseRatioBaseline} invert /> : null}
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Detected shifts</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{snapshot.flags.length}</span>
          </div>
          {snapshot.flags.length ? (
            <ol className="mt-4 space-y-3">
              {snapshot.flags.map((flag) => (
                <li key={flag.code} className="rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{flag.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityStyle(flag.severity)}`}>{flag.severity}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{flag.detail}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <div><dt className="text-slate-400">Current</dt><dd className="mt-0.5 font-semibold text-slate-700">{flag.current}</dd></div>
                    <div><dt className="text-slate-400">Baseline</dt><dd className="mt-0.5 font-semibold text-slate-700">{flag.baseline}</dd></div>
                  </dl>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">No material personal-baseline shifts were detected in this window.</div>
          )}
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">Comparison windows</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">Recent: {snapshot.insight.currentRange.start}–{snapshot.insight.currentRange.end}</p>
            <p className="text-xs leading-5 text-slate-500">Baseline: {snapshot.insight.baselineRange.start}–{snapshot.insight.baselineRange.end}</p>
          </div>
        </aside>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-semibold text-slate-900">Signal provenance</h2>
            <p className="mt-1 text-xs text-slate-500">Explainable event metadata selected by the agent. Private message and transcript content is withheld.</p>
          </div>
          <span className="text-xs text-slate-400">{snapshot.insight.title}</span>
        </div>
        {snapshot.insight.evidence.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {snapshot.insight.evidence.map((evidence) => (
              <li key={evidence.postId} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-medium text-slate-400">{formatWhen(evidence.createdAt)}</p>
                  {evidence.tags?.map((tag) => <span key={tag} className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">{tag}</span>)}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-500">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
                  Content withheld · derived signal only
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No excerpts are available until the minimum observation threshold is met.</p>
        )}
      </section>

      {checkInEvent ? (
        <p className="mt-4 text-xs text-slate-400">Next shared context: {formatDay(checkInEvent.startsAt)} · {checkInEvent.title}</p>
      ) : null}
      <p className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-900">
        Decision support only. Signals may be affected by language, device access, travel, illness, or changes in family communication. Confirm clinically before acting.
      </p>
    </div>
  );
}
