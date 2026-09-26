import { now } from "@/lib/clock";
import {
  addReminderRow,
  patchReminderRow,
  postingIdentity,
  remindersOf,
  requireFamilyAccess,
  resolveFamilyId,
} from "@/lib/data";
import { isDemoMode } from "@/lib/mode-server";
import type { Reminder, ReminderStatus } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const familyId = req.nextUrl.searchParams.get("familyId") || (await resolveFamilyId());
  try {
    await requireFamilyAccess(familyId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied." },
      { status: 403 },
    );
  }
  const reminders = await remindersOf(familyId);
  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      familyId: string;
      authorId: string;
      assigneeId: string;
      text: string;
      dueAt?: string;
      dueHint: string;
      sourceText: string;
      sourcePostId?: string;
    };
    if (!body.text?.trim() || !body.assigneeId || !body.dueHint) {
      return NextResponse.json({ error: "Reminder needs a person, text, and when." }, { status: 400 });
    }
    const identity = await postingIdentity(body.familyId, body.authorId);
    const demo = await isDemoMode();
    const reminder: Reminder = {
      id: `rem-${Date.now()}`,
      familyId: identity.familyId,
      assigneeId: body.assigneeId,
      text: body.text.trim(),
      dueAt: body.dueAt,
      dueHint: body.dueHint,
      sourceText: body.sourceText || body.text,
      sourcePostId: body.sourcePostId,
      createdBy: identity.memberId,
      createdAt: demo ? now() : new Date().toISOString(),
      status: "open",
    };
    const saved = await addReminderRow(reminder);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create reminder." },
      { status: 403 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      id: string;
      familyId?: string;
      status?: ReminderStatus;
      snoozedUntil?: string;
    };
    if (!body.id) {
      return NextResponse.json({ error: "Missing reminder id." }, { status: 400 });
    }
    const familyId = body.familyId || (await resolveFamilyId());
    await requireFamilyAccess(familyId);
    const patch: Partial<Reminder> = {};
    if (body.status) patch.status = body.status;
    if (body.snoozedUntil) patch.snoozedUntil = body.snoozedUntil;
    const saved = await patchReminderRow(body.id, familyId, patch);
    if (!saved) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update reminder." },
      { status: 403 },
    );
  }
}
