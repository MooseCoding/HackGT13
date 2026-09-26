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
      <Link href="/hcp" className="text-sm text-clinic hover:underline">
        ← Patients
      </Link>
      <h1 className="mt-3 text-xl font-semibold">{member.name}</h1>
      <p className="text-sm text-mute">
        {member.age} · {member.role} · {family.name}
      </p>

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

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Lexical diversity" value={s.lexicalDiversity.toFixed(2)} delta={s.lexicalDiversityDelta} />
        <Metric label="Sentence length" value={`${s.meanSentenceLength.toFixed(1)} w`} delta={s.sentenceLengthDelta} />
        <Metric label="Posts / week" value={s.engagementPerWeek.toFixed(1)} delta={s.engagementDelta} />
        <Metric label="Night activity" value={`${Math.round(s.nightShare * 100)}%`} delta={s.nightShare} invert />
      </section>

      <section className="mt-6 space-y-4 border border-line bg-paper p-4">
        <div>
          <p className="text-sm font-medium text-mute">Lexical diversity</p>
          <LineChart points={s.series} accessor={(p) => p.lexicalDiversity} />
        </div>
        <div>
          <p className="text-sm font-medium text-mute">Sentiment</p>
          <LineChart points={s.series} accessor={(p) => p.sentiment} />
        </div>
        <div>
          <p className="text-sm font-medium text-mute">Daily posts</p>
          <LineChart points={s.series} accessor={(p) => p.posts} />
        </div>
        <div>
          <p className="text-sm font-medium text-mute">Night posts</p>
          <LineChart points={s.series} accessor={(p) => p.nightPosts} />
        </div>
      </section>

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
