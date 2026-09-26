import { atDay } from "@/lib/clock";
import { patientById } from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import { addPost, resetStore } from "@/lib/store";
import type { Post } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST() {
  if (!(await isDemoMode())) {
    return NextResponse.json({ error: "The deterministic simulation is only available in demo mode." }, { status: 403 });
  }
  resetStore();
  const signalPosts: Post[] = [
    {
      id: "wa-demo-ruth-1",
      familyId: "okonkwo",
      authorId: "ruth",
      kind: "voice",
      body: "WhatsApp voice note",
      transcript: "I am tired. I was going to make the stew, the stew. I cannot remember where I put the list.",
      voiceSeconds: 23,
      createdAt: atDay(5, 23, 38),
      channel: "whatsapp",
      externalMessageId: "demo-ruth-1",
      rawRetained: false,
      audioMetrics: { durationSeconds: 23, wordsPerMinute: 58, pauseRatio: 0.36, averagePauseSeconds: 1.5, hesitationRate: 0.13 },
    },
    {
      id: "wa-demo-ruth-2",
      familyId: "okonkwo",
      authorId: "ruth",
      kind: "text",
      body: "Did I tell you about the stew. I think I told you. Where is the list.",
      createdAt: atDay(3, 0, 22),
      channel: "whatsapp",
      externalMessageId: "demo-ruth-2",
      rawRetained: false,
    },
    {
      id: "wa-demo-ruth-3",
      familyId: "okonkwo",
      authorId: "ruth",
      kind: "voice",
      body: "WhatsApp voice note",
      transcript: "The list. The stew. I am feeling low today. I cannot find the list.",
      voiceSeconds: 19,
      createdAt: atDay(1, 1, 14),
      channel: "whatsapp",
      externalMessageId: "demo-ruth-3",
      rawRetained: false,
      audioMetrics: { durationSeconds: 19, wordsPerMinute: 49, pauseRatio: 0.44, averagePauseSeconds: 1.8, hesitationRate: 0.18 },
    },
  ];
  signalPosts.forEach(addPost);
  const patient = await patientById("ruth");
  return NextResponse.json({
    patient: patient
      ? {
          member: patient.member,
          snapshot: patient.snapshot,
          latest: signalPosts.at(-1),
        }
      : null,
  });
}
