import { buildDisorderDemoPosts, scanDisorderSignals, DISORDER_DEMO_SCRIPT } from "@/lib/clinical/disorder-scan";
import { patientById } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { addPost, db } from "@/lib/store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (!(await isDemoMode())) {
    return NextResponse.json({ error: "The disorder signal simulation is only available in demo mode." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { memberId?: string };
  const memberId = body.memberId ?? "elena";
  const patient = await patientById(memberId);
  if (!patient?.member.clinicalOptIn) {
    return NextResponse.json({ error: "Patient not found or clinical sharing is off." }, { status: 404 });
  }

  const demoIds = new Set(DISORDER_DEMO_SCRIPT.map((item) => item.id));
  const store = db();
  store.posts = store.posts.filter((post) => !demoIds.has(post.id));

  const intakePosts = buildDisorderDemoPosts(memberId, patient.member.familyId);
  intakePosts.forEach(addPost);

  const hits = scanDisorderSignals(intakePosts);
  const refreshed = await patientById(memberId);

  return NextResponse.json({
    hits,
    patient: refreshed
      ? {
          memberId: refreshed.member.id,
          snapshot: refreshed.snapshot,
        }
      : null,
  });
}
