import { Metric, TrendChart } from "@/components/hcp/Charts";
import { ClinicalInterventionPanel } from "@/components/hcp/ClinicalInterventionPanel";
import { ClinicalMusePanel } from "@/components/hcp/ClinicalMusePanel";
import { DisorderCheckDemo } from "@/components/hcp/DisorderCheckDemo";
import { PatientAssignmentActions } from "@/components/hcp/PatientAssignmentActions";
import { WeeklyReportDownload } from "@/components/hcp/WeeklyReportDownload";
import { PatientExpandedSection } from "@/components/hcp/PatientExpandedSection";
import { assignmentForMember, currentClinicianId } from "@/lib/clinical/assignments";
import { formatWhen } from "@/lib/clock";
import { clinicalPatientById } from "@/lib/clinical/operations";
import { isDemoMode } from "@/lib/mode-server";
import type { ClinicalFlag, PatientSnapshot } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function RiskBadge({ level }: { level: PatientSnapshot["riskLevel"] }) {
  const styles = {
    priority: "border-rose-300 bg-rose-50 text-rose-800",
    monitor: "border-amber-300 bg-amber-50 text-amber-800",
    stable: "border-line bg-ground text-mute",
  };
  const labels = { priority: "Priority review", monitor: "Monitor", stable: "Stable" };
  return (
    <span className={`rounded-sm border px-2.5 py-1 text-xs font-semibold ${styles[level]}`}>{labels[level]}</span>
  );
}

function severityStyle(severity: ClinicalFlag["severity"]) {
  if (severity === "high") return "border-rose-200 bg-rose-50 text-rose-800";
  if (severity === "elevated") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-line bg-ground text-clinic";
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row, assignment, clinicianId, demo] = await Promise.all([
    clinicalPatientById(id),
    assignmentForMember(id),
    currentClinicianId(),
    isDemoMode(),
  ]);
  if (!row) notFound();
  const { member, family, snapshot: snapshot } = row;
  const onMyRoster = assignment?.clinicianId === clinicianId;
  const unassigned = !assignment;
  const firstName = member.name.split(" ")[0];

  return (
    <div>
      <Link href="/hcp" className="inline-flex items-center gap-1.5 text-sm font-medium text-mute hover:text-clinic">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Patient overview
      </Link>

      <header className="mt-5 flex flex-col justify-between gap-5 border border-line bg-surface p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span
            className="grid h-14 w-14 place-items-center rounded-sm text-base font-semibold text-white"
            style={{ background: member.color }}
          >
            {member.initials}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-ink">{member.name}</h1>
              <RiskBadge level={snapshot.riskLevel} />
            </div>
            <p className="mt-1 text-sm text-mute">{member.age} years · {member.role} · {family.name}</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-medium text-mute">Review focus</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {snapshot.flags[0]?.title ?? "Holding steady against their baseline"}
          </p>
        </div>
      </header>

      {unassigned ? (
        <section className="mt-5 border border-line bg-surface p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-ink">Not on your roster yet</p>
              <p className="mt-1 text-sm text-mute">
                Add {firstName} to your roster to see their trend history and pre-visit brief.
              </p>
            </div>
            <PatientAssignmentActions memberId={member.id} action="assign" label="Add patient" demo={demo} />
          </div>
        </section>
      ) : null}

      {!onMyRoster ? (
        <section className="mt-5 border border-line bg-surface p-5">
          <p className="text-sm text-mute">
            Add this patient from the available list to see their signals and pre-visit brief.
          </p>
          <Link href="/hcp?view=available" className="mt-3 inline-flex text-sm font-semibold text-clinic hover:underline">
            Back to available list
          </Link>
        </section>
      ) : (
      <>
      <section className="mt-5 overflow-hidden border border-line bg-surface">
        <div className="border-b border-line bg-surface px-5 py-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <p className="text-sm font-semibold text-ink">Pre-visit brief</p>
            <WeeklyReportDownload memberId={member.id} />
          </div>
          <p className="mt-3 max-w-4xl font-letter text-base leading-7 text-ink">{snapshot.note}</p>
        </div>
        <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs font-semibold text-mute">Suggested next step</p>
            <p className="mt-1 text-sm leading-6 text-ink">{snapshot.nextStep}</p>
          </div>
          <ClinicalInterventionPanel patientFirstName={firstName} riskLevel={snapshot.riskLevel} />
        </div>
      </section>

      {demo && onMyRoster && member.clinicalOptIn ? (
        <DisorderCheckDemo memberId={member.id} patientFirstName={firstName} familyId={member.familyId} />
      ) : null}

      <section className="mt-5 grid gap-3 md:grid-cols-3" aria-label="Clinical domains">
        {snapshot.domains.map((domain) => (
          <div key={domain.key} className="flex items-center gap-4 border border-line bg-surface p-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center border border-line bg-ground text-lg font-semibold text-ink">
              {domain.score}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{domain.label}</p>
              <p className="mt-1 text-xs leading-5 text-mute">
                {domain.trend === "changed"
                  ? "Moved from baseline"
                  : domain.trend === "watch"
                    ? "Worth a closer look"
                    : "Within their baseline"}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-5 border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink">What changed</h2>
          <span className="rounded-sm border border-line bg-ground px-2 py-1 text-xs font-semibold text-mute">
            {snapshot.flags.length}
          </span>
        </div>
        {snapshot.flags.length ? (
          <ol className="mt-4 space-y-3">
            {snapshot.flags.map((flag) => (
              <li key={flag.code} className="flex items-start justify-between gap-3 border border-line p-3.5">
                <p className="text-sm font-semibold text-ink">{flag.title}</p>
                <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold ${severityStyle(flag.severity)}`}>
                  {flag.severity}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-5 border border-line bg-ground p-4 text-sm leading-6 text-mute">
            No significant changes from their baseline in this period.
          </div>
        )}
      </section>

      <PatientExpandedSection
        title="Full metrics & trends"
        description="Charts, baseline numbers, confidence, and where signals came from."
      >
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.8fr)]">
          <section>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-ink">42-day trend</h3>
                <p className="mt-1 text-xs text-mute">
                  Lexical diversity from shared text and voice-note transcripts
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-mute">
                <span className="h-2 w-2 rounded-sm bg-ember" />
                Lexical diversity
              </div>
            </div>
            <div className="mt-5">
              <TrendChart
                points={snapshot.series}
                accessor={(point) => point.lexicalDiversity}
                label={`${member.name} lexical diversity over 42 days`}
              />
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

          <aside>
            <div className="border border-line bg-ground p-4">
              <p className="text-xs font-medium text-mute">Confidence in the signal</p>
              <p className="mt-1 text-sm font-semibold capitalize text-ink">{snapshot.confidence}</p>
              <p className="mt-0.5 text-xs text-mute">
                {snapshot.currentSampleSize + snapshot.baselineSampleSize} observations
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <h3 className="font-bold text-ink">Change detail</h3>
              <span className="rounded-sm border border-line bg-ground px-2 py-1 text-xs font-semibold text-mute">
                {snapshot.flags.length}
              </span>
            </div>
            {snapshot.flags.length ? (
              <ol className="mt-4 space-y-3">
                {snapshot.flags.map((flag) => (
                  <li key={flag.code} className="border border-line p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{flag.title}</p>
                      <span className={`rounded-sm border px-2 py-0.5 text-[10px] font-semibold ${severityStyle(flag.severity)}`}>
                        {flag.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-mute">{flag.detail}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
                      <div>
                        <dt className="text-mute">Current</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{flag.current}</dd>
                      </div>
                      <div>
                        <dt className="text-mute">Baseline</dt>
                        <dd className="mt-0.5 font-semibold text-ink">{flag.baseline}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-4 border border-line bg-ground p-4 text-sm leading-6 text-mute">
                No significant changes from their baseline in this period.
              </div>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-xs font-semibold text-mute">Time windows</p>
              <p className="mt-2 text-xs leading-5 text-mute">
                Recent: {snapshot.insight.currentRange.start}–{snapshot.insight.currentRange.end}
              </p>
              <p className="text-xs leading-5 text-mute">
                Baseline: {snapshot.insight.baselineRange.start}–{snapshot.insight.baselineRange.end}
              </p>
            </div>
          </aside>
        </div>

        <section className="border-t border-line p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-bold text-ink">Where the signals came from</h3>
              <p className="mt-1 text-xs text-mute">
                When each signal was recorded and which posts contributed. Message and transcript text stays private.
              </p>
            </div>
            <span className="text-xs text-mute">{snapshot.insight.title}</span>
          </div>
          {snapshot.insight.evidence.length ? (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {snapshot.insight.evidence.map((evidence) => (
                <li key={evidence.postId} className="border border-line bg-ground p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-medium text-mute">{formatWhen(evidence.createdAt)}</p>
                    {evidence.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm border border-line bg-ground px-1.5 py-0.5 text-[10px] font-semibold text-clinic"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 border border-line bg-surface px-3 py-2 text-xs text-mute">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-clinic" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Content hidden · numbers only
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border border-line bg-ground p-4 text-sm text-mute">
              Not enough data yet to show source posts.
            </p>
          )}
        </section>
      </PatientExpandedSection>

      <ClinicalMusePanel memberId={member.id} patientName={member.name} />

      <section className="mt-5 flex flex-col justify-between gap-3 border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center">
        <p className="text-sm text-mute">
          On your panel since {new Date(assignment.assignedAt).toLocaleDateString()}.
        </p>
        <PatientAssignmentActions
          memberId={member.id}
          action="release"
          label="Release from roster"
          patientName={member.name}
          demo={demo}
        />
      </section>
      </>
      )}
    </div>
  );
}
