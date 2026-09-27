import { parseEvent } from "@/lib/calendar-parse";
import { inCalendarWindow } from "@/lib/calendar-window";
import { addEventRow, addReminderRow, membersOf } from "@/lib/data";
import { suggestReminderFromText } from "@/lib/remind-detect";
import type { CalendarEvent, Member, Reminder } from "@/lib/types";

export const FAMILY_ASSISTANT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "check_today_availability",
      description: "Check what is already on the family calendar for today (or a given date).",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Optional ISO date YYYY-MM-DD. Defaults to today in the family timezone context.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "find_common_family_time",
      description: "Find open daytime gaps on the family calendar over the next several days for a shared gathering.",
      parameters: {
        type: "object",
        properties: {
          duration_minutes: { type: "number", description: "Needed duration. Default 60." },
          days_ahead: { type: "number", description: "How many days to scan. Default 7." },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_calendar_event",
      description:
        "Draft a family calendar event from natural language. Does NOT save it. Always draft before creating.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Natural language event line including title, day/date, and time if known.",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "confirm_and_create_event",
      description:
        "Create a previously drafted calendar event after the user confirms. Pass the draft_text from draft_calendar_event.",
      parameters: {
        type: "object",
        properties: {
          draft_text: { type: "string", description: "Exact draft text to parse and save." },
          confirmed: { type: "boolean", description: "Must be true to create." },
        },
        required: ["draft_text", "confirmed"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_reminder",
      description: "Draft a reminder for a family member. Does NOT save it.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Reminder wording, ideally including who and when (e.g. remind Priya to pick up milk tomorrow).",
          },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "confirm_and_create_reminder",
      description: "Create a previously drafted reminder after the user confirms.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string" },
          assignee_id: { type: "string" },
          due_hint: { type: "string" },
          due_at: { type: "string" },
          confirmed: { type: "boolean" },
        },
        required: ["text", "assignee_id", "due_hint", "confirmed"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "navigate_app",
      description: "Suggest an allowlisted in-app destination the UI can open.",
      parameters: {
        type: "object",
        properties: {
          destination: {
            type: "string",
            enum: [
              "messages",
              "calendar",
              "hestia",
              "reminders",
              "circle",
              "settings",
              "assistant",
            ],
          },
        },
        required: ["destination"],
        additionalProperties: false,
      },
    },
  },
] as const;

export type FamilyToolName = (typeof FAMILY_ASSISTANT_TOOLS)[number]["function"]["name"];

export type FamilyToolRuntime = {
  familyId: string;
  memberId: string;
  members: Member[];
  events: CalendarEvent[];
  anchor: Date;
  timeZone?: string;
};

export type PendingAssistantAction =
  | {
      kind: "event";
      draftText: string;
      title: string;
      when: string;
      location?: string;
    }
  | {
      kind: "reminder";
      text: string;
      assigneeId: string;
      assigneeName: string;
      dueHint: string;
      dueAt?: string;
    }
  | {
      kind: "navigate";
      href: string;
      label: string;
    };

const NAV_MAP: Record<string, { href: string; label: string }> = {
  messages: { href: "/family", label: "Messages" },
  calendar: { href: "/family/calendar", label: "Calendar" },
  hestia: { href: "/family/digest", label: "Hestia" },
  reminders: { href: "/family/reminders", label: "Reminders" },
  circle: { href: "/family/circle", label: "Circle" },
  settings: { href: "/family?settings=1", label: "Settings" },
  assistant: { href: "/family?with=assistant", label: "Hearth Assistant" },
};

function dayKey(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function formatWhen(iso: string, timeZone?: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: timeZone || "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export type FamilyToolResult = {
  ok: boolean;
  summary: string;
  data?: Record<string, unknown>;
  pending?: PendingAssistantAction;
};

export async function executeFamilyTool(
  name: string,
  rawArgs: Record<string, unknown>,
  runtime: FamilyToolRuntime,
): Promise<FamilyToolResult> {
  switch (name as FamilyToolName) {
    case "check_today_availability": {
      const target =
        typeof rawArgs.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawArgs.date)
          ? rawArgs.date
          : dayKey(runtime.anchor.toISOString(), runtime.timeZone);
      const hits = runtime.events.filter((event) => dayKey(event.startsAt, runtime.timeZone) === target);
      return {
        ok: true,
        summary:
          hits.length === 0
            ? `No family events on ${target}.`
            : `${hits.length} event(s) on ${target}.`,
        data: {
          date: target,
          events: hits.map((event) => ({
            title: event.title,
            when: formatWhen(event.startsAt, runtime.timeZone),
            location: event.location ?? null,
          })),
        },
      };
    }
    case "find_common_family_time": {
      const duration = Math.max(30, Number(rawArgs.duration_minutes) || 60);
      const daysAhead = Math.min(14, Math.max(1, Number(rawArgs.days_ahead) || 7));
      const suggestions: Array<{ start: string; label: string }> = [];
      for (let day = 0; day < daysAhead && suggestions.length < 5; day += 1) {
        for (const hour of [10, 14, 16, 18]) {
          const start = new Date(runtime.anchor);
          start.setHours(0, 0, 0, 0);
          start.setDate(start.getDate() + day);
          start.setHours(hour, 0, 0, 0);
          if (start.getTime() < runtime.anchor.getTime()) continue;
          const end = new Date(start.getTime() + duration * 60_000);
          const conflict = runtime.events.some((event) => {
            const a = new Date(event.startsAt).getTime();
            const endIso = event.endsAt || event.startsAt;
            const b = new Date(endIso).getTime();
            return a < end.getTime() && b > start.getTime();
          });
          if (!conflict) {
            suggestions.push({
              start: start.toISOString(),
              label: formatWhen(start.toISOString(), runtime.timeZone),
            });
          }
          if (suggestions.length >= 5) break;
        }
      }
      return {
        ok: true,
        summary: suggestions.length
          ? `Found ${suggestions.length} open slot(s).`
          : "No clear open slots in the next days.",
        data: { suggestions, duration_minutes: duration },
      };
    }
    case "draft_calendar_event": {
      const text = String(rawArgs.text ?? "").trim();
      if (!text) return { ok: false, summary: "Need event text to draft." };
      try {
        const event = parseEvent(text, runtime.members, runtime.memberId, runtime.familyId, runtime.anchor);
        if (!inCalendarWindow(event.startsAt, runtime.anchor)) {
          return {
            ok: false,
            summary: "That date is outside the calendar window Hearth can edit right now.",
            data: { draft_text: text },
          };
        }
        const pending: PendingAssistantAction = {
          kind: "event",
          draftText: text,
          title: event.title,
          when: formatWhen(event.startsAt, runtime.timeZone),
          location: event.location,
        };
        return {
          ok: true,
          summary: `Draft ready: ${event.title} on ${pending.when}. Ask the user to confirm before creating.`,
          data: { draft: pending },
          pending,
        };
      } catch (error) {
        return {
          ok: false,
          summary: error instanceof Error ? error.message : "Could not draft that event.",
        };
      }
    }
    case "confirm_and_create_event": {
      if (rawArgs.confirmed !== true) {
        return { ok: false, summary: "Creation cancelled — confirmation was false." };
      }
      const draftText = String(rawArgs.draft_text ?? "").trim();
      if (!draftText) return { ok: false, summary: "Missing draft_text." };
      const event = parseEvent(
        draftText,
        runtime.members,
        runtime.memberId,
        runtime.familyId,
        runtime.anchor,
      );
      if (!inCalendarWindow(event.startsAt, runtime.anchor)) {
        return { ok: false, summary: "That date is outside the editable calendar window." };
      }
      const saved = await addEventRow(event);
      return {
        ok: true,
        summary: `Created “${saved.title}” on ${formatWhen(saved.startsAt, runtime.timeZone)}.`,
        data: {
          event: {
            id: saved.id,
            title: saved.title,
            startsAt: saved.startsAt,
            location: saved.location ?? null,
          },
        },
      };
    }
    case "draft_reminder": {
      const text = String(rawArgs.text ?? "").trim();
      if (!text) return { ok: false, summary: "Need reminder text." };
      const suggestion = suggestReminderFromText(text, runtime.members, runtime.memberId, runtime.anchor);
      if (!suggestion) {
        return {
          ok: false,
          summary: "Could not tell who/when for that reminder. Ask for a name and day.",
        };
      }
      const assignee = runtime.members.find((member) => member.id === suggestion.assigneeId);
      const pending: PendingAssistantAction = {
        kind: "reminder",
        text: suggestion.text,
        assigneeId: suggestion.assigneeId,
        assigneeName: assignee?.name.split(" ")[0] ?? "someone",
        dueHint: suggestion.dueHint,
        dueAt: suggestion.dueAt,
      };
      return {
        ok: true,
        summary: `Draft reminder for ${pending.assigneeName}: ${pending.text} (${pending.dueHint}). Confirm to create.`,
        data: { draft: pending },
        pending,
      };
    }
    case "confirm_and_create_reminder": {
      if (rawArgs.confirmed !== true) {
        return { ok: false, summary: "Creation cancelled — confirmation was false." };
      }
      const text = String(rawArgs.text ?? "").trim();
      const assigneeId = String(rawArgs.assignee_id ?? "");
      const dueHint = String(rawArgs.due_hint ?? "").trim();
      if (!text || !assigneeId || !dueHint) {
        return { ok: false, summary: "Reminder needs text, assignee_id, and due_hint." };
      }
      const members = runtime.members.length ? runtime.members : await membersOf(runtime.familyId);
      if (!members.some((member) => member.id === assigneeId)) {
        return { ok: false, summary: "Unknown assignee for this circle." };
      }
      const reminder: Reminder = {
        id: `rem-${Date.now()}`,
        familyId: runtime.familyId,
        assigneeId,
        text,
        dueAt: typeof rawArgs.due_at === "string" ? rawArgs.due_at : undefined,
        dueHint,
        sourceText: text,
        createdBy: runtime.memberId,
        createdAt: runtime.anchor.toISOString(),
        status: "open",
      };
      const saved = await addReminderRow(reminder);
      return {
        ok: true,
        summary: `Reminder saved for ${members.find((m) => m.id === assigneeId)?.name ?? "member"}: ${saved.text}.`,
        data: { reminder: { id: saved.id, text: saved.text, dueHint: saved.dueHint } },
      };
    }
    case "navigate_app": {
      const destination = String(rawArgs.destination ?? "");
      const dest = NAV_MAP[destination];
      if (!dest) {
        return {
          ok: false,
          summary: `Destination not allowlisted. Use one of: ${Object.keys(NAV_MAP).join(", ")}.`,
        };
      }
      const pending: PendingAssistantAction = { kind: "navigate", href: dest.href, label: dest.label };
      return {
        ok: true,
        summary: `Ready to open ${dest.label}.`,
        data: dest,
        pending,
      };
    }
    default:
      return { ok: false, summary: `Unknown tool: ${name}` };
  }
}
