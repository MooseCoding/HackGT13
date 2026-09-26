import { Sparkline } from "@/components/hcp/Charts";
import { ClinicalAlertActions } from "@/components/hcp/ClinicalAlertActions";
import { clinicalDashboardData } from "@/lib/clinical/operations";
import type { PatientSnapshot } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const riskRank = { priority: 0, monitor: 1, stable: 2 } as const;

function RiskBadge({ level }: { level: PatientSnapshot["riskLevel"] }) {
  const styles = {
    priority: "border-rose-200 bg-rose-50 text-rose-700",
    monitor: "border-amber-200 bg-amber-50 text-amber-700",
    stable: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  const labels = { priority: "Priority review", monitor: "Monitor", stable: "Stable" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[level]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[level]}
    </span>
  );
}

export default async function HcpHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ patients: snapshots, members, alerts, lastRunAt }, params] = await Promise.all([
    clinicalDashboardData(),
    searchParams,
  ]);
  const query = params.q?.trim().toLowerCase() ?? "";
  const visibleSnapshots = query
    ? snapshots.filter((patient) => {
        const member = members.find((candidate) => candidate.id === patient.memberId);
        return `${member?.name ?? ""} ${member?.location ?? ""} ${patient.flags.map((flag) => flag.title).join(" ")}`
          .toLowerCase()
          .includes(query);
      })
    : snapshots;
  const patients = visibleSnapshots.slice().sort((a, b) => riskRank[a.riskLevel] - riskRank[b.riskLevel]);
  const activeAlerts = alerts.filter((alert) => alert.status !== "dismissed");
  const priority = patients.filter((patient) => patient.riskLevel === "priority").length;
  const monitor = patients.filter((patient) => patient.riskLevel === "monitor").length;
  const stable = patients.filter((patient) => patient.riskLevel === "stable").length;
  const signals = patients.reduce((total, patient) => total + patient.flags.length, 0);

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Clinical intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Patient overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Longitudinal signals from consented family interactions, measured against each patient&apos;s own baseline.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          {lastRunAt ? `Agent last ran ${new Date(lastRunAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Awaiting first persisted run"}
        </div>
      </div>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Population summary">
        {[
          { label: "Opted-in patients", value: patients.length, note: "Active monitoring", color: "text-slate-900" },
          { label: "Priority review", value: priority, note: "Baseline shifts", color: "text-rose-600" },
          { label: "Monitoring", value: monitor, note: "Non-urgent changes", color: "text-amber-600" },
          { label: "Signals detected", value: signals, note: `${stable} patient${stable === 1 ? "" : "s"} stable`, color: "text-blue-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className={`mt-2 text-3xl font-semibold tracking-tight ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-xs text-slate-400">{item.note}</p>
          </div>
        ))}
      </section>

      {activeAlerts.length ? (
        <section className="mt-6 rounded-2xl border border-rose-100 bg-white p-5 shadow-[0_6px_24px_rgba(15,23,42,0.04)]" aria-label="Active clinical alerts">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-semibold text-slate-900">Active alerts</h2><p className="mt-1 text-xs text-slate-500">Assign a review state without changing the underlying screening signal.</p></div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">{activeAlerts.length} open</span>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {activeAlerts.map((alert) => {
              const member = members.find((candidate) => candidate.id === alert.memberId);
              return (
                <div key={alert.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                  <div><Link href={`/hcp/patients/${alert.memberId}`} className="text-sm font-semibold text-slate-900 hover:text-blue-700">{member?.name ?? "Patient"} · {alert.title}</Link><p className="mt-1 text-xs text-slate-500">Updated {new Date(alert.updatedAt).toLocaleString()}</p></div>
                  <ClinicalAlertActions alertId={alert.id} initialStatus={alert.status} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_24px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Clinical review queue</h2>
            <p className="mt-0.5 text-xs text-slate-500">Prioritized by magnitude and number of personal-baseline shifts</p>
          </div>
          <form action="/hcp" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
            </svg>
            <label className="sr-only" htmlFor="patient-search">Search patients</label>
            <input id="patient-search" name="q" defaultValue={params.q ?? ""} placeholder="Search patients" className="w-40 bg-transparent outline-none placeholder:text-slate-400" />
            <button type="submit" className="font-semibold text-blue-700">Search</button>
          </form>
        </div>

        {patients.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-medium text-slate-800">No patients are sharing clinical insights.</p>
            <p className="mt-1 text-sm text-slate-500">Patients appear after explicitly enabling clinician sharing.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((patient) => {
              const member = members.find((candidate) => candidate.id === patient.memberId);
              const leadDomain = patient.domains.slice().sort((a, b) => a.score - b.score)[0];
              return (
                <Link
                  key={patient.memberId}
                  href={`/hcp/patients/${patient.memberId}`}
                  className="group grid gap-4 px-5 py-5 transition-colors hover:bg-slate-50/80 sm:grid-cols-[minmax(220px,1.2fr)_minmax(180px,0.8fr)_160px_130px] sm:items-center"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ring-4 ring-slate-50"
                      style={{ background: member?.color }}
                    >
                      {member?.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{member?.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{member?.age} years · {member?.location}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700">{leadDomain.label}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                      {patient.flags[0]?.title ?? "No material baseline shift"}
                    </p>
                  </div>
                  <Sparkline
                    points={patient.series.slice(-21)}
                    accessor={(point) => point.lexicalDiversity}
                    color={patient.riskLevel === "priority" ? "#e11d48" : patient.riskLevel === "monitor" ? "#d97706" : "#059669"}
                    label={`${member?.name ?? "Patient"} lexical diversity over 21 days`}
                  />
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <RiskBadge level={patient.riskLevel} />
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-300 group-hover:text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-blue-900">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
        </svg>
        Hearth provides explainable screening signals for clinical review. It does not diagnose disease, replace validated screening tools, or recommend treatment.
      </div>
    </div>
  );
}
