import { allMembers, optedInPatients } from "@/lib/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

function statusLabel(flags: { severity: string }[]) {
  const high = flags.some((f) => f.severity === "high");
  if (high) return "Needs attention";
  if (flags.length) return "Monitor";
  return "Stable";
}

export default async function HcpHome() {
  const [patients, members] = await Promise.all([optedInPatients(), allMembers()]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Patients</h1>
      <p className="mt-1 text-sm text-mute">
        Opted-in members only. Compared to personal baseline — not a medical device.
      </p>
      <ul className="mt-6 divide-y divide-line border border-line bg-paper">
        {patients.map((p) => {
          const m = members.find((x) => x.id === p.memberId);
          return (
            <li key={p.memberId}>
              <Link href={`/hcp/patients/${p.memberId}`} className="flex items-center gap-4 px-4 py-3 hover:bg-cream">
                <span
                  className="grid h-10 w-10 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: m?.color }}
                >
                  {m?.initials}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{m?.name}</p>
                  <p className="text-sm text-mute">
                    {m?.age} · {m?.location}
                    {p.flags.length ? ` · ${p.flags.length} flag${p.flags.length > 1 ? "s" : ""}` : ""}
                  </p>
                </div>
                <span className="text-sm text-clinic">{statusLabel(p.flags)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
