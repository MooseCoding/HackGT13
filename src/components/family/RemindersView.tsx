"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { useLargerText } from "@/components/settings/SettingsProvider";
import { formatReminderDue, formatReminderSource, isHearthReminderSource } from "@/lib/remind-detect";
import type { Member, Reminder } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function Avatar({ member, size = 36 }: { member?: Member; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, background: member?.color ?? "#8696a0" }}
      aria-hidden
    >
      {member?.initials ?? "?"}
    </span>
  );
}

function ReminderRow({
  reminder,
  assignee,
  creator,
  easy,
  onDone,
  onSnooze,
  busy,
}: {
  reminder: Reminder;
  assignee?: Member;
  creator?: Member;
  easy: boolean;
  onDone: () => void;
  onSnooze: () => void;
  busy: boolean;
}) {
  const due = formatReminderDue(reminder);
  const source = reminder.sourceText ? formatReminderSource(reminder.sourceText) : "";
  const fromHearth = reminder.sourceText ? isHearthReminderSource(reminder.sourceText) : false;
  const isDone = reminder.status === "done";

  return (
    <li className={`border border-rule bg-paper p-4 ${isDone ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar member={assignee} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className={`font-semibold text-ink ${easy ? "text-lg" : "text-base"}`}>{reminder.text}</p>
            <span className="text-xs text-mute">for {assignee?.name.split(" ")[0] ?? "someone"}</span>
          </div>
          <p className="mt-1 text-sm text-clinic">{due}</p>
          {source ? (
            <blockquote className="mt-2 border-l-2 border-rule pl-3 text-sm italic text-mute">
              &ldquo;{source.length > 120 ? `${source.slice(0, 117)}…` : source}&rdquo;
              {!fromHearth && creator ? (
                <span className="not-italic"> — {creator.name.split(" ")[0]}</span>
              ) : null}
            </blockquote>
          ) : null}
          {reminder.status === "snoozed" && reminder.snoozedUntil ? (
            <p className="mt-1 text-xs text-mute">Snoozed until {formatReminderDue({ ...reminder, dueAt: reminder.snoozedUntil })}</p>
          ) : null}
        </div>
      </div>
      {!isDone ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onDone}
            className={`rounded-sm bg-ember px-3 font-medium text-white hover:bg-ember-dark disabled:opacity-50 ${easy ? "min-h-11 py-2 text-base" : "py-1.5 text-sm"}`}
          >
            Done
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSnooze}
            className={`rounded-sm border border-rule bg-surface px-3 font-medium text-ink hover:bg-accent-tint disabled:opacity-50 ${easy ? "min-h-11 py-2 text-base" : "py-1.5 text-sm"}`}
          >
            Snooze
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function RemindersView({
  reminders: initial,
  members,
  familyName,
}: {
  reminders: Reminder[];
  members: Member[];
  familyName: string;
}) {
  const { me } = useFamily();
  const easy = useLargerText();
  const router = useRouter();
  const [reminders, setReminders] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newText, setNewText] = useState("");
  const [newAssignee, setNewAssignee] = useState(me?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

  const open = reminders.filter((r) => r.status === "open" || r.status === "snoozed");
  const done = reminders.filter((r) => r.status === "done");

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  async function markDone(id: string) {
    setBusyId(id);
    const res = await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, familyId: me.familyId, authorId: me.id, status: "done" }),
    });
    setBusyId(null);
    if (res.ok) {
      const updated = (await res.json()) as Reminder;
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast("Marked done");
    }
  }

  async function snooze(id: string) {
    setBusyId(id);
    const res = await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, familyId: me.familyId, authorId: me.id, snoozeDays: 1 }),
    });
    setBusyId(null);
    if (res.ok) {
      const updated = (await res.json()) as Reminder;
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast("Snoozed until tomorrow");
    }
  }

  async function addManual() {
    const text = newText.trim();
    if (!text || !newAssignee) return;
    setAdding(true);
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId: me.familyId,
        authorId: me.id,
        assigneeId: newAssignee,
        text,
        dueHint: "soon",
        sourceText: text,
      }),
    });
    setAdding(false);
    if (res.ok) {
      const saved = (await res.json()) as Reminder;
      setReminders((prev) => [saved, ...prev]);
      setNewText("");
      showToast("Reminder added");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="border-b border-rule pb-4">
        <h1 className={`font-bold ${easy ? "text-2xl" : "text-xl"}`}>Reminders</h1>
        <p className="mt-1 text-sm leading-6 text-mute">
          {familyName} — things people said they&apos;d do, or pulled from the calendar. Add your own too.
        </p>
      </header>

      {toast ? (
        <p className="mt-4 border border-rule bg-accent-tint px-3 py-2 text-sm font-medium text-ink" role="status">
          {toast}
        </p>
      ) : null}

      <section className="mt-5 border border-rule bg-surface p-4">
        <h2 className={`font-semibold ${easy ? "text-lg" : "text-base"}`}>Add a reminder</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="sr-only">Reminder</span>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManual();
                }
              }}
              placeholder="Call Elena Sunday"
              className={`w-full border border-rule bg-paper px-3 py-2 outline-none focus:border-accent ${easy ? "text-base" : "text-sm"}`}
            />
          </label>
          <label>
            <span className="sr-only">For</span>
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className={`min-h-11 border border-rule bg-paper px-2 ${easy ? "text-base" : "text-sm"}`}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.split(" ")[0]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addManual}
            disabled={adding || !newText.trim()}
            className={`shrink-0 rounded-sm bg-ember px-4 font-medium text-white hover:bg-ember-dark disabled:opacity-50 ${easy ? "min-h-11 py-2 text-base" : "py-2 text-sm"}`}
          >
            Add
          </button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className={`mb-3 font-semibold ${easy ? "text-lg" : "text-base"}`}>
          Open <span className="text-mute">({open.length})</span>
        </h2>
        {open.length ? (
          <ul className="space-y-3">
            {open.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                assignee={byId[r.assigneeId]}
                creator={byId[r.createdBy]}
                easy={easy}
                busy={busyId === r.id}
                onDone={() => markDone(r.id)}
                onSnooze={() => snooze(r.id)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">
            Nothing open.{" "}
            <Link href="/family" className="font-medium text-clinic hover:underline">
              Say something in chat
            </Link>{" "}
            and we&apos;ll suggest turning it into a reminder.
          </p>
        )}
      </section>

      {done.length ? (
        <section className="mt-8">
          <h2 className={`mb-3 font-semibold ${easy ? "text-lg" : "text-base"}`}>
            Done <span className="text-mute">({done.length})</span>
          </h2>
          <ul className="space-y-3">
            {done.map((r) => (
              <ReminderRow
                key={r.id}
                reminder={r}
                assignee={byId[r.assigneeId]}
                creator={byId[r.createdBy]}
                easy={easy}
                busy={false}
                onDone={() => {}}
                onSnooze={() => {}}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
