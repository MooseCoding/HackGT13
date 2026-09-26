"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { useLargerText } from "@/components/settings/SettingsProvider";
import type { Reminder } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemindersBoard({
  reminders,
  familyId,
}: {
  reminders: Reminder[];
  familyId: string;
}) {
  const { me, members } = useFamily();
  const easy = useLargerText();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name.split(" ")[0] ?? m.name]));

  const open = reminders.filter((r) => r.status === "open");
  const done = reminders.filter((r) => r.status !== "open");

  async function setStatus(id: string, status: Reminder["status"]) {
    setBusyId(id);
    await fetch("/api/reminders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, familyId, status }),
    });
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className={`font-semibold text-ink ${easy ? "text-2xl" : "text-xl"}`}>Reminders</h1>
      <p className="mt-1 text-sm text-mute">
        Pulled from chat when someone asks for a hand. Posting as {me.name.split(" ")[0]}.
      </p>

      <section className="mt-6" aria-labelledby="open-reminders">
        <h2 id="open-reminders" className="text-sm font-medium text-mute">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="mt-3 text-sm text-mute">No open reminders. Ask in chat with “can you…” or “Reminder:”.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {open.map((r) => (
              <li key={r.id} className="border border-rule bg-surface px-4 py-3">
                <p className={`font-medium text-ink ${easy ? "text-lg" : "text-base"}`}>{r.text}</p>
                <p className="mt-1 text-sm text-mute">
                  For {nameById[r.assigneeId] ?? "someone"} · {r.dueHint}
                </p>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void setStatus(r.id, "done")}
                  className="mt-3 rounded-sm border border-rule px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50"
                >
                  Mark done
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length ? (
        <section className="mt-8" aria-labelledby="done-reminders">
          <h2 id="done-reminders" className="text-sm font-medium text-mute">
            Done ({done.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {done.map((r) => (
              <li key={r.id} className="text-sm text-mute line-through">
                {r.text} · {nameById[r.assigneeId]} · {r.dueHint}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
