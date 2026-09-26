"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { DEMO_NOW, formatDay } from "@/lib/clock";
import type { CalendarEvent, Member } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const EXAMPLE =
  "Sofia has her soccer tournament this Saturday at 10 AM at Piedmont Park";

export function CalendarBoard({ events, members }: { events: CalendarEvent[]; members: Member[] }) {
  const { me, easy } = useFamily();
  const router = useRouter();
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const names = Object.fromEntries(members.map((m) => [m.id, m]));

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.startsAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  async function create() {
    if (!text.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          familyId: me.familyId, 
          authorId: me.id, 
          text, 
          syncToGoogle 
        }),
      });
      setText("");
      router.refresh();
    } catch (error) {
      console.error("Failed to create event:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteEvent(id: string, googleEventId?: string | null) {
  if (deletingId) return;
  setDeletingId(id);

  try {
    const params = new URLSearchParams();
    params.append("id", id);
    params.append("familyId", me.familyId);
    if (googleEventId) {
      params.append("googleEventId", googleEventId);
    }

    const res = await fetch(`/api/events?${params.toString()}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      throw new Error(message || `Delete failed with status ${res.status}`);
    }

    router.refresh();
  } catch (error) {
    console.error("Failed to delete event:", error);
    // surface it instead of failing silently
    alert("Couldn't delete that event. Please try again.");
  } finally {
    setDeletingId(null);
  }
}

  const soon = events.find((e) => new Date(e.startsAt) > DEMO_NOW);

  return (
    <div>
      <h1 className="text-xl font-semibold">Calendar</h1>
      <p className="mt-1 text-sm text-mute">Type a sentence and Hearth adds the event.</p>
      
      {soon ? (
        <p className="mt-4 border border-line bg-cream px-3 py-2 text-sm">
          Upcoming: <strong>{soon.title}</strong> · {formatDay(soon.startsAt)}
          {soon.location ? ` · ${soon.location}` : ""}
        </p>
      ) : null}
      
      <div className="mt-6 border border-line bg-paper p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's coming up?"
          className={`w-full rounded-sm border border-line px-3 py-2 outline-none focus:border-ember ${
            easy ? "min-h-28 text-base" : "min-h-20 text-sm"
          }`}
        />
        
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="border border-line px-3 py-1.5 text-sm text-mute hover:border-ember"
          >
            Example: Sofia&apos;s soccer tournament
          </button>
          
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-mute hover:text-ink">
              <input
                type="checkbox"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
                className="accent-ember"
              />
              Sync to Google Calendar
            </label>
            
            <button
              type="button"
              onClick={create}
              disabled={isSubmitting || !text.trim()}
              className={`bg-ember px-4 font-medium text-white disabled:opacity-50 ${
                easy ? "py-3 text-base" : "py-2 text-sm"
              }`}
            >
              {isSubmitting ? "Adding..." : "Add event"}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        {grouped.map(([day, list]) => (
          <section key={day} className="mb-6">
            <h2 className="text-sm font-semibold text-mute">{formatDay(list[0].startsAt)}</h2>
            <ul className="mt-2 divide-y divide-line border border-line bg-paper">
              {list.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {e.isGoogleSynced && (
                        <span title="From Google Calendar" className="text-xs">🗓️</span>
                      )}
                      <p className="font-medium">{e.title}</p>
                    </div>
                    <p className="text-sm text-mute">
                      {new Date(e.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      {e.location ? ` · ${e.location}` : ""}
                      {e.attendees && e.attendees.length > 0 ? " · " + e.attendees.map((id) => names[id]?.name.split(" ")[0] || id).join(", ") : ""}
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => deleteEvent(e.id, e.googleEventId)}
                    disabled={deletingId === e.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deletingId === e.id ? "Deleting..." : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}