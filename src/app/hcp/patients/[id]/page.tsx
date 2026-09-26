import { LineChart, Metric } from "@/components/hcp/Charts";
import { formatWhen } from "@/lib/clock";
import { patientById } from "@/lib/store";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = patientById(id);
  if (!row) notFound();
  const { member, family, snapshot, posts } = row;
  const s = snapshot;

  return (
    <div>
      <Link href="/hcp" className="text-sm font-semibold text-teal-800">
        ← Panel
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{member.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {member.age} · {member.role} · {family.name} · consented {member.clinicalOptIn ? "yes" : "no"}
          </p>
        </div>
        <p className="max-w-sm text-xs leading-5 text-slate-500">
          14-day window vs prior 30-day personal baseline. Passive signals from family posts and voice
          transcripts only.
        </p>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Lexical diversity" value={s.lexicalDiversity.toFixed(2)} delta={s.lexicalDiversityDelta} />
        <Metric
          label="Sentence length"
          value={`${s.meanSentenceLength.toFixed(1)} w`}
          delta={s.sentenceLengthDelta}
        />
        <Metric label="Posts / week" value={s.engagementPerWeek.toFixed(1)} delta={s.engagementDelta} />
        <Metric label="Night activity" value={`${Math.round(s.nightShare * 100)}%`} delta={s.nightShare} invert />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lexical diversity</p>
          <LineChart points={s.series} accessor={(p) => p.lexicalDiversity} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sentiment</p>
          <LineChart points={s.series} accessor={(p) => p.sentiment} color="#b45309" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily posts</p>
          <LineChart points={s.series} accessor={(p) => p.posts} color="#334155" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Night posts</p>
          <LineChart points={s.series} accessor={(p) => p.nightPosts} color="#be123c" />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Agent pre-diagnosis note</p>
        <p className="mt-3 leading-7 text-slate-800">{s.note}</p>
        <ul className="mt-4 space-y-2">
          {s.flags.map((f) => (
            <li key={f.code} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-bold">
                {f.title} · {f.severity}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{f.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">Source timeline</h2>
        <ol className="mt-4 space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs text-slate-500">{formatWhen(p.createdAt)} · {p.kind}</p>
              <p className="mt-1 text-sm leading-6">{p.transcript || p.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
