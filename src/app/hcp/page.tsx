import { db, optedInPatients } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HcpHome() {
  const patients = optedInPatients();
  const members = db().members;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-800">Impiricus partner</p>
      <h1 className="mt-2 font-serif text-4xl text-slate-900">Longitudinal panel</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Opted-in family members only. Markers are computed against each person&apos;s own baseline — not
        a population cutoff. Prototype for HackGT 13; not a medical device.
      </p>
      <ul className="mt-8 space-y-3">
        {patients.map((p) => {
          const m = members.find((x) => x.id === p.memberId);
          const high = p.flags.some((f) => f.severity === "high");
          return (
            <li key={p.memberId}>
              <Link
                href={`/hcp/patients/${p.memberId}`}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-teal-700"
              >
                <span
                  className="grid h-12 w-12 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: m?.color }}
                >
                  {m?.initials}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{m?.name}</p>
                  <p className="text-sm text-slate-500">
                    {m?.age} · {m?.location} · {p.flags.length === 1 ? "1 flag" : `${p.flags.length} flags`}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                    high ? "bg-rose-100 text-rose-800" : p.flags.length ? "bg-amber-100 text-amber-900" : "bg-teal-50 text-teal-800"
                  }`}
                >
                  {high ? "Priority" : p.flags.length ? "Watch" : "Stable"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
