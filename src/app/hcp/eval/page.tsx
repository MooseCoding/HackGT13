import casesJson from "../../../../eval/hcp-brief/cases.json";
import Link from "next/link";

export const dynamic = "force-dynamic";

type EvalCaseRow = {
  patient_id: string;
  display_name: string;
  expected_label: "stable" | "review_suggested";
  label_reason: string;
  benign_explanation: string;
  expected_evidence_ids: string[];
};

const GOLDEN_IDS = ["P03", "P06", "P09"] as const;

export default function HcpEvalStoryPage() {
  const cases = (casesJson as { cases: EvalCaseRow[] }).cases;
  const golden = GOLDEN_IDS.map((id) => cases.find((row) => row.patient_id === id)).filter(
    (row): row is EvalCaseRow => Boolean(row),
  );

  return (
    <div>
      <Link href="/hcp" className="inline-flex items-center gap-1.5 text-sm font-medium text-mute hover:text-clinic">
        ← Clinician home
      </Link>
      <header className="mt-5">
        <h1 className="text-2xl font-bold text-ink">Golden HCP eval cases</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-mute">
          Three synthetic timelines from <code className="text-xs">eval/hcp-brief</code>. Stable cases stay quiet;
          concerning cases should fire review-suggested flags with cited evidence — without diagnostic language.
        </p>
        <p className="mt-2 text-xs text-mute">
          Run locally: <code className="rounded-sm border border-line bg-ground px-1.5 py-0.5">npm run eval:hcp</code>
        </p>
      </header>

      <ol className="mt-6 space-y-4">
        {golden.map((row) => (
          <li key={row.patient_id} className="border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-mute">{row.patient_id}</p>
                <h2 className="mt-1 text-lg font-bold text-ink">{row.display_name}</h2>
              </div>
              <span
                className={`rounded-sm border px-2.5 py-1 text-xs font-semibold ${
                  row.expected_label === "stable"
                    ? "border-line bg-ground text-mute"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {row.expected_label === "stable" ? "Expect stable" : "Expect review suggested"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink">{row.label_reason}</p>
            <p className="mt-2 text-xs leading-5 text-mute">
              Benign alternative: {row.benign_explanation}
            </p>
            <p className="mt-3 text-xs text-mute">
              Evidence ids: {row.expected_evidence_ids.slice(0, 4).join(", ") || "—"}
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-sm text-mute">
        Full package: 5 stable (P01–P05) and 5 concerning (P06–P10). See{" "}
        <Link href="/hcp/live" className="font-semibold text-clinic hover:underline">
          Live signal
        </Link>{" "}
        for the one-click sustained-shift demo.
      </p>
    </div>
  );
}
