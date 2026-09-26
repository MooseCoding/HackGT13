import { LineChart, Metric } from "@/components/hcp/Charts";
import { DEMO_NOW, formatDay, formatWhen } from "@/lib/clock";
import { patientById } from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await patientById(id);
  if (!row) notFound();
  const { member, family, snapshot, posts, events } = row;
  const s = snapshot;
  const checkInEvent = events.find(
    (event) => new Date(event.startsAt) >= DEMO_NOW && event.attendees.includes(member.id),
  );
  const draft = checkInEvent
    ? `Could someone check in with ${member.name.split(" ")[0]} before ${checkInEvent.title}?`
    : `Could someone check in with ${member.name.split(" ")[0]} today?`;
  const checkInHref = `/family?draft=${encodeURIComponent(draft)}`;

  return (
    <div>
      <Link href="/hcp" className="text-sm text-clinic hover:underline">
        ← Patients
      </Link>
      <h1 className="mt-3 text-xl font-semibold">{member.name}</h1>
      <p className="text-sm text-mute">
        {member.age} · {member.role} · {family.name}
      </p>

      <section className="mt-6 border border-clinic/30 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-clinic">Explainable activity insight</p>
        <h2 className="mt-1 text-lg font-semibold">{s.insight.title}</h2>
        <p className="mt-2 text-sm leading-6 text-mute">{s.insight.summary}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-clinic-paper p-3">
            <dt className="text-xs text-mute">
              Recent · {s.insight.currentRange.start} to {s.insight.currentRange.end}
            </dt>
            <dd className="mt-1 font-semibold">{s.insight.currentLabel}</dd>
          </div>
          <div className="rounded-md bg-clinic-paper p-3">
            <dt className="text-xs text-mute">
              Baseline · {s.insight.baselineRange.start} to {s.insight.baselineRange.end}
            </dt>
            <dd className="mt-1 font-semibold">{s.insight.baselineLabel}</dd>
          </div>
        </dl>
        {s.insight.status === "ready" ? (
          <div className="mt-4">
            <p className="text-sm font-medium">Supporting posts</p>
            {s.insight.evidence.length ? (
              <ul className="mt-2 space-y-3">
                {s.insight.evidence.map((evidence) => (
                  <li key={evidence.postId} className="rounded-md border border-clinic/20 bg-clinic-paper/50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs text-mute">{formatWhen(evidence.createdAt)}</p>
                      {evidence.tags?.map((tag) => (
                        <span key={tag} className="rounded bg-clinic/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-clinic">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 leading-6">{evidence.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-mute">No individual late-night posts were found in the recent window.</p>
            )}
          </div>
        ) : null}
        <p className="mt-4 text-xs leading-5 text-mute">
          This compares communication activity only. Word choice and posting patterns do not diagnose mental illness or cognitive disease.
        </p>
      </section>

      {s.insight.status === "ready" ? (
        <section className="mt-4 flex flex-col gap-3 border border-line bg-paper p-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="font-medium">Check in with {member.name.split(" ")[0]}</h2>
            <p className="mt-1 text-sm text-mute">
              {checkInEvent
                ? `Suggested time: ${formatDay(checkInEvent.startsAt)} at ${new Date(checkInEvent.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, around “${checkInEvent.title}.”`
                : "No shared upcoming calendar event was found; send a direct message instead."}
            </p>
          </div>
          <Link href={checkInHref} className="rounded-md bg-clinic px-4 py-2 text-center text-sm font-semibold text-white">
            Check in with {member.name.split(" ")[0]}
          </Link>
        </section>
      ) : null}

      <section className="mt-6 border border-line bg-paper p-4">
        <h2 className="font-medium">Pre-visit brief</h2>
        <p className="mt-2 text-sm leading-6">{s.note}</p>
        {s.flags.length ? (
          <ul className="mt-4 space-y-2">
            {s.flags.map((f) => (
              <li key={f.code} className="border-l-2 border-clinic/40 pl-3 text-sm">
                <p className="font-medium">
                  {f.title} ({f.severity})
                </p>
                <p className="mt-0.5 text-mute">{f.detail}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {s.insight.status === "ready" ? (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2">
            <Metric label="Posts / week" value={s.engagementPerWeek.toFixed(1)} delta={s.engagementDelta} />
            <Metric label="Night activity" value={`${Math.round(s.nightShare * 100)}%`} delta={s.nightShare} invert />
          </section>

          <section className="mt-6 space-y-4 border border-line bg-paper p-4">
            <div>
              <p className="text-sm font-medium text-mute">Daily posts</p>
              <LineChart points={s.series} accessor={(p) => p.posts} />
            </div>
            <div>
              <p className="text-sm font-medium text-mute">Night posts</p>
              <LineChart points={s.series} accessor={(p) => p.nightPosts} />
            </div>
          </section>
        </>
      ) : null}

      <section className="mt-6">
        <h2 className="font-medium">Source timeline</h2>
        <ul className="mt-3 divide-y divide-line border border-line bg-paper">
          {posts.map((p) => (
            <li key={p.id} className="px-3 py-2 text-sm">
              <p className="text-xs text-mute">
                {formatWhen(p.createdAt)} · {p.kind}
              </p>
              <p className="mt-0.5">{p.transcript || p.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
