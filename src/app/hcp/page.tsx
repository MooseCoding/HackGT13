import { AutoAcceptPatientsToggle } from "@/components/hcp/AutoAcceptPatientsToggle";
import { Sparkline } from "@/components/hcp/Charts";
import { ClinicalAlertActions } from "@/components/hcp/ClinicalAlertActions";
import { PatientAssignmentActions } from "@/components/hcp/PatientAssignmentActions";
import { carrierLabel, clinicianNetworkProfile } from "@/lib/clinical/insurance";
import { clinicalDashboardData, type ClinicalRosterView } from "@/lib/clinical/operations";
import { hcpReportingMode } from "@/lib/hcp-settings-server";
import { isDemoMode } from "@/lib/mode-server";
import type { Member, PatientSnapshot } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const riskRank = { priority: 0, monitor: 1, stable: 2 } as const;

function rosterView(value?: string): ClinicalRosterView {
  return value === "available" ? "available" : "mine";
}

function NetworkBadge({ member }: { member?: Member }) {
  const label = carrierLabel(member?.insurance);
  if (!label) return null;
  return (
    <span className="inline-flex items-center border border-line bg-ground px-2 py-0.5 text-xs font-semibold text-ink">
      In network · {label}
    </span>
  );
}

function RiskBadge({ level }: { level: PatientSnapshot["riskLevel"] }) {
  const styles = {
    priority: "border-rose-300 bg-rose-50 text-rose-800",
    monitor: "border-amber-300 bg-amber-50 text-amber-800",
    stable: "border-line bg-ground text-mute",
  };
  const labels = { priority: "Priority review", monitor: "Monitor", stable: "Stable" };
  return (
    <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

export default async function HcpHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const params = await searchParams;
  const view = rosterView(params.view);
  const [reportingMode, dashboard, demo] = await Promise.all([
    hcpReportingMode(),
    clinicalDashboardData(view),
    isDemoMode(),
  ]);
  const {
    patients: snapshots,
    members,
    alerts,
    assignments,
    clinicianId,
    rosterCounts,
    autoAcceptPatients,
    lastRunAt,
  } = dashboard;
  const advanced = reportingMode === "advanced";
  const query = params.q?.trim().toLowerCase() ?? "";
  const assignmentByMember = new Map(assignments.map((assignment) => [assignment.memberId, assignment]));
  const visibleSnapshots = query
    ? snapshots.filter((patient) => {
        const member = members.find((candidate) => candidate.id === patient.memberId);
        return `${member?.name ?? ""} ${member?.location ?? ""} ${patient.flags.map((flag) => flag.title).join(" ")}`
          .toLowerCase()
          .includes(query);
      })
    : snapshots;
  const patients = visibleSnapshots.slice().sort((a, b) => riskRank[a.riskLevel] - riskRank[b.riskLevel]);
  const clinicianProfile = clinicianId ? clinicianNetworkProfile(clinicianId) : null;
  const activeAlerts = alerts.filter((alert) => alert.status !== "dismissed");
  const priority = patients.filter((patient) => patient.riskLevel === "priority").length;
  const monitor = patients.filter((patient) => patient.riskLevel === "monitor").length;
  const stable = patients.filter((patient) => patient.riskLevel === "stable").length;

  return (
    <div>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Patient overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mute">
            Add patients who&apos;ve agreed to share, then see how their communication patterns compare to their
            own history.
            {!advanced ? " Simple view shows risk and what changed most. Switch to Advanced for trend charts." : null}
          </p>
        </div>
        {lastRunAt ? (
          <p className="shrink-0 text-xs text-mute">
            Last updated{" "}
            {new Date(lastRunAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        ) : null}
      </div>

      <section className="mt-6 flex flex-wrap gap-2" aria-label="Roster views">
        {[
          { id: "mine" as const, label: "My patients", count: rosterCounts.mine },
          { id: "available" as const, label: "Available to add", count: rosterCounts.available },
        ].map((tab) => {
          const active = view === tab.id;
          const href = tab.id === "mine" ? "/hcp" : "/hcp?view=available";
          return (
            <Link
              key={tab.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 border px-3 py-2 text-sm font-semibold ${
                active ? "border-clinic bg-clinic text-white" : "border-line bg-surface text-ink hover:bg-ground"
              }`}
            >
              {tab.label}
              <span className={`border px-1.5 py-0.5 text-xs ${active ? "border-white text-white" : "border-line bg-ground text-mute"}`}>
                {tab.count}
              </span>
            </Link>
          );
        })}
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Population summary">
        {[
          {
            label: view === "mine" ? "My roster" : "Unassigned patients",
            value: patients.length,
            note: view === "mine" ? "On your panel" : "Waiting for a clinician",
            color: "text-ink",
          },
          { label: "Priority review", value: priority, note: "Moved from their baseline", color: "text-rose-700" },
          { label: "Monitoring", value: monitor, note: `${stable} patient${stable === 1 ? "" : "s"} stable`, color: "text-amber-700" },
        ].map((item) => (
          <div key={item.label} className="border border-line bg-surface p-4">
            <p className="text-xs font-medium text-mute">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
            <p className="mt-1 text-xs text-mute">{item.note}</p>
          </div>
        ))}
      </section>

      {activeAlerts.length ? (
        <section className="mt-6 border border-rose-200 bg-surface p-5" aria-label="Active clinical alerts">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink">Active alerts</h2>
              <p className="mt-1 text-xs text-mute">
                Mark each alert as reviewed, contacted, or dismissed. The signal itself doesn&apos;t change.
              </p>
            </div>
            <span className="rounded-sm border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800">
              {activeAlerts.length} open
            </span>
          </div>
          <div className="mt-4 divide-y divide-line">
            {activeAlerts.map((alert) => {
              const member = members.find((candidate) => candidate.id === alert.memberId);
              return (
                <div key={alert.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center">
                  <div>
                    <Link
                      href={`/hcp/patients/${alert.memberId}`}
                      className="text-sm font-semibold text-ink hover:text-clinic"
                    >
                      {member?.name ?? "Patient"} · {alert.title}
                    </Link>
                    <p className="mt-1 text-xs text-mute">
                      Updated {new Date(alert.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <ClinicalAlertActions alertId={alert.id} initialStatus={alert.status} demo={demo} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "available" && clinicianProfile ? (
        <section className="mt-6 border border-line bg-surface px-5 py-4" aria-label="Insurance network matching">
          <p className="text-sm font-semibold text-ink">
            {patients.length
              ? `${patients.length} in-network patient${patients.length === 1 ? "" : "s"} available`
              : autoAcceptPatients
                ? "Auto-accept is on — new in-network patients join your roster on their own"
                : "Only in-network patients show up here"}
          </p>
          <p className="mt-1 text-sm leading-6 text-mute">
            {clinicianProfile.name} accepts{" "}
            {clinicianProfile.acceptedCarrierIds
              .map((carrierId) => carrierLabel({ carrierId }) ?? carrierId)
              .join(", ")}
            . Patients without matching coverage aren&apos;t listed.
          </p>
          <AutoAcceptPatientsToggle initialEnabled={autoAcceptPatients} demo={demo} />
        </section>
      ) : null}

      <section className="mt-8 overflow-hidden border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-ink">{view === "mine" ? "Patients to review" : "Available patients"}</h2>
            <p className="mt-0.5 text-xs text-mute">
              {view === "mine"
                ? "Sorted by how far each person has moved from their own baseline"
                : "In-network patients you haven&apos;t added yet"}
            </p>
          </div>
          <form
            action="/hcp"
            className="flex items-center gap-2 border border-line bg-ground px-3 py-2 text-xs text-mute"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <label className="sr-only" htmlFor="patient-search">Search patients</label>
            <input
              id="patient-search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Search patients"
              className="w-40 bg-transparent outline-none placeholder:text-mute"
            />
            <button type="submit" className="font-semibold text-clinic">Search</button>
          </form>
        </div>

        {patients.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold text-ink">
              {view === "mine" ? "Your roster is empty." : "No in-network patients available right now."}
            </p>
            <p className="mt-1 text-sm text-mute">
              {view === "mine"
                ? "Add in-network patients from the available list, or turn on auto-accept."
                : "Patients land here when clinician sharing is on and their insurance matches your network."}
            </p>
            {view === "mine" ? (
              <Link href="/hcp?view=available" className="mt-4 inline-flex text-sm font-semibold text-clinic hover:underline">
                Browse available patients
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-line">
            {patients.map((patient) => {
              const member = members.find((candidate) => candidate.id === patient.memberId);
              const leadDomain = patient.domains.slice().sort((a, b) => a.score - b.score)[0];
              const assigned = assignmentByMember.get(patient.memberId);
              const onMyRoster = assigned?.clinicianId === clinicianId;
              const rowClass = advanced
                ? "group grid gap-4 px-5 py-5 hover:bg-ground sm:grid-cols-[minmax(220px,1.2fr)_minmax(180px,0.8fr)_160px_minmax(130px,auto)] sm:items-center"
                : "group grid gap-4 px-5 py-5 hover:bg-ground sm:grid-cols-[minmax(220px,1.2fr)_minmax(180px,0.8fr)_minmax(130px,auto)] sm:items-center";
              const content = (
                <>
                  <div className="flex items-center gap-3.5">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-sm font-semibold text-white"
                      style={{ background: member?.color }}
                    >
                      {member?.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink group-hover:text-clinic">{member?.name}</p>
                      <p className="mt-0.5 truncate text-xs text-mute">
                        {member?.age} years · {member?.location}
                      </p>
                      {view === "available" ? (
                        <div className="mt-1.5">
                          <NetworkBadge member={member} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    {advanced ? (
                      <>
                        <p className="text-xs font-medium text-ink">{leadDomain.label}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-mute">
                          {patient.flags[0]?.title ?? "No major shift from baseline"}
                        </p>
                      </>
                    ) : (
                      <p className="line-clamp-2 text-xs text-mute">
                        {patient.flags[0]?.title ?? "No major shift from baseline"}
                      </p>
                    )}
                  </div>
                  {advanced ? (
                    <Sparkline
                      points={patient.series.slice(-21)}
                      accessor={(point) => point.lexicalDiversity}
                      color={patient.riskLevel === "priority" ? "#e11d48" : patient.riskLevel === "monitor" ? "#d97706" : "#059669"}
                      label={`${member?.name ?? "Patient"} lexical diversity over 21 days`}
                    />
                  ) : null}
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <RiskBadge level={patient.riskLevel} />
                    {view === "available" ? (
                      <PatientAssignmentActions memberId={patient.memberId} action="assign" label="Add" compact demo={demo} />
                    ) : onMyRoster ? (
                      <div className="flex items-center gap-2">
                        <PatientAssignmentActions
                          memberId={patient.memberId}
                          action="release"
                          label="Release"
                          patientName={member?.name}
                          compact
                          demo={demo}
                        />
                        <svg
                          viewBox="0 0 24 24"
                          className="h-4 w-4 text-mute group-hover:text-clinic"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                </>
              );
              if (view === "available") {
                return <div key={patient.memberId} className={rowClass}>{content}</div>;
              }
              return (
                <Link key={patient.memberId} href={`/hcp/patients/${patient.memberId}`} className={rowClass}>
                  {content}
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
