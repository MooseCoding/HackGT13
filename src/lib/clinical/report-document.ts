import type { PatientSnapshot } from "../types";
import type { ClinicalReport } from "./reports";

/**
 * Renders a weekly screening brief as a self-contained, printable HTML document.
 * Source message text is deliberately left out: the document lists evidence by
 * timestamp and tag so it can be filed or shared without exposing family chat.
 */

type ReportDocumentInput = {
  report: ClinicalReport;
  patient: { name: string; age: number };
  snapshot: PatientSnapshot;
  snapshotMatchesReport: boolean;
  autoPrint?: boolean;
};

const RISK_LABEL: Record<PatientSnapshot["riskLevel"], string> = {
  stable: "Stable",
  monitor: "Monitor",
  priority: "Priority review",
};

function esc(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
  });
}

function pct(delta: number | null) {
  if (delta === null || !Number.isFinite(delta)) return "—";
  const rounded = Math.round(delta * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/** Signed scales (sentiment) read better as a point difference than a percent. */
function diff(current: number, baseline: number) {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return "—";
  const d = Number((current - baseline).toFixed(2));
  return `${d > 0 ? "+" : ""}${d} pts`;
}

function num(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number(value.toFixed(digits)).toString();
}

function share(value: number) {
  return `${Math.round(value * 100)}%`;
}

function metricRows(s: PatientSnapshot) {
  const rows: Array<[string, string, string, string]> = [
    ["Lexical diversity", num(s.lexicalDiversity), num(s.lexicalDiversityBaseline), pct(s.lexicalDiversityDelta)],
    ["Mean sentence length (words)", num(s.meanSentenceLength, 1), num(s.meanSentenceLengthBaseline, 1), pct(s.sentenceLengthDelta)],
    ["Repetition score", num(s.repetitionScore), num(s.repetitionBaseline), pct(s.repetitionDelta)],
    ["Sentiment (−1 to +1)", num(s.sentiment), num(s.sentimentBaseline), diff(s.sentiment, s.sentimentBaseline)],
    ["Messages per week", num(s.engagementPerWeek, 1), num(s.engagementBaseline, 1), pct(s.engagementDelta)],
    ["Morning share of activity", share(s.morningShare), share(s.morningShareBaseline), pct(s.morningShareDelta)],
    ["Late-night share of activity", share(s.nightShare), share(s.nightShareBaseline), "—"],
    ["Reply time (hours)", num(s.responseHours, 1), num(s.responseHoursBaseline, 1), pct(s.responseLatencyDelta)],
  ];
  if (s.voice.currentSamples > 0 || s.voice.baselineSamples > 0) {
    rows.push(
      ["Speech rate (words/min)", num(s.voice.wordsPerMinute, 0), num(s.voice.wordsPerMinuteBaseline, 0), "—"],
      ["Pause ratio", num(s.voice.pauseRatio), num(s.voice.pauseRatioBaseline), "—"],
      ["Hesitation rate", num(s.voice.hesitationRate), num(s.voice.hesitationRateBaseline), "—"],
    );
  }
  return rows
    .map(([label, current, baseline, change]) =>
      `<tr><td>${esc(label)}</td><td class="n">${esc(current)}</td><td class="n">${esc(baseline)}</td><td class="n">${esc(change)}</td></tr>`)
    .join("");
}

export function reportFileName(patientName: string, generatedAt: string) {
  const slug = patientName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "patient";
  return `hearth-weekly-brief-${slug}-${generatedAt.slice(0, 10)}.html`;
}

export function renderClinicalReportHtml(input: ReportDocumentInput) {
  const { report, patient, snapshot } = input;
  const insight = snapshot.insight;
  const reviewed = report.status !== "draft";
  const flags = snapshot.flags.length
    ? snapshot.flags.map((flag) => `
        <tr>
          <td><strong>${esc(flag.title)}</strong><div class="sub">${esc(flag.detail)}</div></td>
          <td>${esc(flag.domain)}</td>
          <td><span class="sev sev-${esc(flag.severity)}">${esc(flag.severity)}</span></td>
          <td>${esc(flag.current)}</td>
          <td>${esc(flag.baseline)}</td>
        </tr>`).join("")
    : `<tr><td colspan="5">No material shift from the personal baseline.</td></tr>`;
  const domains = snapshot.domains.map((domain) => `
      <div class="domain">
        <div class="domain-head"><span>${esc(domain.label)}</span><span class="trend trend-${esc(domain.trend)}">${esc(domain.trend)}</span></div>
        <div class="sub">${esc(domain.description)}</div>
      </div>`).join("");
  const evidence = insight.evidence.length
    ? insight.evidence.map((item, index) => `
        <tr><td class="n">${index + 1}</td><td>${esc(dateTime(item.createdAt))}</td><td>${esc((item.tags ?? []).join(", ") || "—")}</td><td class="mono">${esc(item.postId)}</td></tr>`).join("")
    : `<tr><td colspan="4">No individual messages were cited.</td></tr>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Weekly screening brief · ${esc(patient.name)} · ${esc(day(report.generatedAt))}</title>
<style>
  :root { --ink:#1c1917; --mute:#57534e; --line:#e7e5e4; --soft:#fafaf9; --clinic:#0f766e; --warn:#b45309; --bad:#b91c1c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f5f5f4; color: var(--ink); font: 14px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .page { max-width: 820px; margin: 24px auto; background: #fff; border: 1px solid var(--line); padding: 40px 44px; }
  header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid var(--ink); padding-bottom: 16px; }
  .brand { font-weight: 800; letter-spacing: .02em; color: var(--clinic); text-transform: uppercase; font-size: 12px; }
  h1 { margin: 4px 0 0; font-size: 24px; line-height: 1.2; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--mute); margin: 28px 0 8px; }
  .meta { text-align: right; font-size: 12px; color: var(--mute); }
  .meta strong { color: var(--ink); }
  .status { display: inline-block; margin-top: 6px; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  .status-draft { background: #fef3c7; color: #92400e; }
  .status-reviewed, .status-signed { background: #ccfbf1; color: #115e59; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-top: 20px; }
  .summary div { background: var(--soft); padding: 10px 12px; }
  .summary .k { font-size: 11px; color: var(--mute); text-transform: uppercase; letter-spacing: .05em; }
  .summary .v { font-weight: 700; font-size: 15px; margin-top: 2px; }
  .risk-priority { color: var(--bad); } .risk-monitor { color: var(--warn); } .risk-stable { color: var(--clinic); }
  .brief { font-size: 15px; }
  ul.findings { margin: 8px 0 0; padding-left: 20px; }
  .next { border-left: 3px solid var(--clinic); background: #f0fdfa; padding: 10px 14px; margin-top: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--mute); background: var(--soft); }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; }
  .sub { color: var(--mute); font-size: 12px; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; color: var(--mute); }
  .sev { font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .sev-high { color: var(--bad); } .sev-elevated { color: var(--warn); } .sev-watch { color: var(--mute); }
  .domains { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .domain { border: 1px solid var(--line); padding: 10px 12px; }
  .domain-head { display: flex; justify-content: space-between; font-weight: 700; }
  .trend { font-size: 11px; text-transform: uppercase; }
  .trend-changed { color: var(--bad); } .trend-watch { color: var(--warn); } .trend-stable { color: var(--clinic); }
  .note { font-size: 12px; color: var(--mute); }
  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }
  .sign div { border-top: 1px solid var(--ink); padding-top: 6px; font-size: 12px; color: var(--mute); }
  footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--line); font-size: 11px; color: var(--mute); }
  .toolbar { max-width: 820px; margin: 16px auto 0; display: flex; justify-content: flex-end; gap: 8px; }
  .toolbar button { font: inherit; font-weight: 600; padding: 8px 14px; border: 1px solid var(--clinic); background: var(--clinic); color: #fff; border-radius: 3px; cursor: pointer; }
  @media (max-width: 640px) { .page { padding: 24px 18px; margin: 0; } .summary { grid-template-columns: 1fr 1fr; } .domains { grid-template-columns: 1fr; } header { flex-direction: column; } .meta { text-align: left; } }
  @media print {
    body { background: #fff; }
    .page { border: 0; margin: 0; padding: 0; max-width: none; }
    .toolbar { display: none; }
    tr, .domain, .next { break-inside: avoid; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">Print or save as PDF</button></div>
<main class="page">
  <header>
    <div>
      <div class="brand">Familyr · Clinician weekly screening brief</div>
      <h1>${esc(patient.name)}</h1>
      <div class="sub">Age ${esc(patient.age)} · Member ID <span class="mono">${esc(report.memberId)}</span></div>
    </div>
    <div class="meta">
      <div>Generated <strong>${esc(dateTime(report.generatedAt))}</strong></div>
      <div>Assessed ${esc(dateTime(snapshot.assessedAt))}</div>
      <span class="status status-${esc(report.status)}">${reviewed ? `Clinician ${esc(report.status)}` : "Draft · not yet reviewed"}</span>
      ${report.reviewedAt ? `<div>Reviewed ${esc(dateTime(report.reviewedAt))}</div>` : ""}
    </div>
  </header>

  <section class="summary" aria-label="Summary">
    <div><div class="k">Screening level</div><div class="v risk-${esc(snapshot.riskLevel)}">${esc(RISK_LABEL[snapshot.riskLevel])}</div></div>
    <div><div class="k">Confidence</div><div class="v">${esc(snapshot.confidence)}</div></div>
    <div><div class="k">Current window</div><div class="v">${esc(snapshot.windowDays)} days · ${esc(snapshot.currentSampleSize)} msgs</div></div>
    <div><div class="k">Personal baseline</div><div class="v">${esc(snapshot.baselineDays)} days · ${esc(snapshot.baselineSampleSize)} msgs</div></div>
  </section>

  <h2>Brief</h2>
  <p class="brief">${esc(report.brief)}</p>
  <ul class="findings">${report.findings.map((finding) => `<li>${esc(finding)}</li>`).join("")}</ul>
  <div class="next"><strong>Suggested next step:</strong> ${esc(report.recommendedNextStep)}</div>

  <h2>Signals by domain</h2>
  <div class="domains">${domains}</div>

  <h2>Flags compared with this person's baseline</h2>
  <table>
    <thead><tr><th>Signal</th><th>Domain</th><th>Severity</th><th>Current</th><th>Baseline</th></tr></thead>
    <tbody>${flags}</tbody>
  </table>

  <h2>Measurements</h2>
  <table>
    <thead><tr><th>Metric</th><th class="n">Current</th><th class="n">Baseline</th><th class="n">Change</th></tr></thead>
    <tbody>${metricRows(snapshot)}</tbody>
  </table>
  <p class="note">Current window ${esc(day(insight.currentRange.start))} – ${esc(day(insight.currentRange.end))}; baseline ${esc(day(insight.baselineRange.start))} – ${esc(day(insight.baselineRange.end))}.${input.snapshotMatchesReport ? "" : " Measurements shown are from the latest snapshot, which is newer than this brief."}</p>

  <h2>Evidence cited</h2>
  <table>
    <thead><tr><th class="n">#</th><th>Observed</th><th>Tags</th><th>Evidence ID</th></tr></thead>
    <tbody>${evidence}</tbody>
  </table>
  <p class="note">Message text is withheld from this document. Open the patient in Familyr to view the source messages.</p>

  <div class="sign">
    <div>Reviewing clinician</div>
    <div>Date</div>
  </div>

  <footer>
    Screening support only. This brief describes changes in how this person communicates relative to their own history; it is not a diagnosis and not a medical device output. Changes can reflect illness, travel, device access, language or ordinary life events and require clinical confirmation.<br>
    Provenance: ${esc(report.modelProvider)} · ${esc(report.modelName)} · prompt ${esc(report.promptVersion)} · report <span class="mono">${esc(report.id)}</span> · snapshot <span class="mono">${esc(report.snapshotId)}</span>
  </footer>
</main>
${input.autoPrint ? "<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script>" : ""}
</body>
</html>`;
}
