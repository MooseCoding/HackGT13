/**
 * Generates eval/hcp-brief/cases.json and excellent-reports.json
 * Reference clock matches DEMO_NOW: 2026-09-25T20:16:00-04:00
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REFERENCE = new Date("2026-09-25T20:16:00-04:00");

function isoDaysAgo(daysAgo, hour = 10, minute = 0) {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateOnly(daysAgo) {
  return isoDaysAgo(daysAgo, 12, 0).slice(0, 10);
}

const BASELINE_WINDOW = { start: dateOnly(44), end: dateOnly(14) };
const CURRENT_WINDOW = { start: dateOnly(14), end: dateOnly(0) };

const RICH = [
  "I walked through the neighborhood garden and shared tea with several friends after the library club.",
  "We planned a family dinner with music, fresh vegetables, and stories from school this week.",
  "The farmers market had wonderful peaches; I bought flowers and called my sister afterward.",
  "I prepared breakfast, organized colorful photographs, and finished a short letter to Marcus.",
  "Our afternoon walk felt peaceful; the maple trees are already turning along Piedmont.",
  "I listened to a radio program about city history and wrote notes for the grandchildren.",
  "Sofia visited with soup; we talked about her classes and the weekend soccer tournament.",
  "I watered the plants, folded laundry, and watched a quiet documentary before bed.",
  "Church friends stopped by with bread. We laughed about the old neighborhood bakery.",
  "I tried a new recipe with rosemary and lemon; everyone asked for the instructions later.",
  "The crossword was challenging today, but I finished most of it with a cup of coffee.",
  "James sent photos from campus. I replied with a story about my first dorm room.",
];

const ORDINARY_FAMILY = [
  "Don't forget umbrella — rain later!",
  "Soccer practice moved to 5.",
  "Who wants pizza Friday?",
  "I can pick up milk.",
  "Love you, call when free.",
  "Parking is easier on the side street.",
  "Sent the photo from last Sunday.",
];

const SPEAKERS = (pid) => [
  { id: pid, role: "patient" },
  { id: `${pid}-daughter`, role: "daughter" },
  { id: `${pid}-son`, role: "son" },
  { id: `${pid}-spouse`, role: "spouse" },
];

let seq = 0;
function mid(pid) {
  seq += 1;
  return `${pid}-m${String(seq).padStart(2, "0")}`;
}

function msg(pid, speaker, daysAgo, hour, body, extra = {}) {
  return {
    id: mid(pid),
    speaker_id: speaker,
    created_at: isoDaysAgo(daysAgo, hour, (seq * 7) % 50),
    body,
    kind: extra.kind ?? "text",
    ...(extra.voice_metrics ? { voice_metrics: extra.voice_metrics } : {}),
  };
}

/** Shared patient lines so baseline vs current stay within personal affect range. */
const STABLE_PATIENT_LINES = [
  RICH[0],
  RICH[1],
  RICH[2],
  RICH[3],
  RICH[4],
  RICH[5],
  RICH[6],
  RICH[7],
  RICH[8],
  RICH[9],
  RICH[10],
  RICH[11],
];

function baselineRich(pid, count = 16) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const daysAgo = 42 - Math.floor((i / count) * 27);
    out.push(msg(pid, pid, daysAgo, 9 + (i % 4), STABLE_PATIENT_LINES[i % STABLE_PATIENT_LINES.length]));
    if (i % 3 === 0) {
      out.push(
        msg(pid, `${pid}-daughter`, daysAgo, 12, ORDINARY_FAMILY[i % ORDINARY_FAMILY.length]),
      );
    }
  }
  return out;
}

function currentStable(pid, count = 10) {
  const out = [];
  // Mirror baseline wording (same rotating lines) so sentiment/affect deltas stay tiny.
  for (let i = 0; i < count; i += 1) {
    const daysAgo = 13 - Math.floor((i / count) * 12);
    out.push(msg(pid, pid, daysAgo, 9 + (i % 4), STABLE_PATIENT_LINES[i % STABLE_PATIENT_LINES.length]));
    if (i % 2 === 0) {
      out.push(msg(pid, `${pid}-son`, daysAgo, 15, ORDINARY_FAMILY[(i + 2) % ORDINARY_FAMILY.length]));
    }
  }
  return out;
}

function caseDef({
  patient_id,
  display_name,
  expected_label,
  label_reason,
  benign_explanation,
  buildMessages,
  evidencePicker,
}) {
  seq = 0;
  const messages = buildMessages(patient_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  // renumber ids in chronological order for readability
  const renumbered = messages.map((m, i) => ({
    ...m,
    id: `${patient_id}-m${String(i + 1).padStart(2, "0")}`,
  }));
  const expected_evidence_ids = evidencePicker(renumbered);
  return {
    patient_id,
    display_name,
    speakers: SPEAKERS(patient_id),
    baseline_window: BASELINE_WINDOW,
    current_window: CURRENT_WINDOW,
    messages: renumbered,
    expected_label,
    label_reason,
    expected_evidence_ids,
    benign_explanation,
  };
}

const cases = [
  caseDef({
    patient_id: "P01",
    display_name: "Elena Rivera (synthetic)",
    expected_label: "stable",
    label_reason:
      "Current 14-day posts keep similar vocabulary, daytime rhythm, and engagement versus the prior 30 days.",
    benign_explanation: "Family travel weekend produced a few quieter days without other pattern change.",
    buildMessages: (pid) => [...baselineRich(pid, 18), ...currentStable(pid, 12)],
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P01" && m.created_at >= isoDaysAgo(14)).slice(0, 3).map((m) => m.id),
  }),
  caseDef({
    patient_id: "P02",
    display_name: "Harold Kim (synthetic)",
    expected_label: "stable",
    label_reason: "Steady social cadence and varied phrasing across both windows; ordinary family logistics dominate.",
    benign_explanation: "Hearing-aid battery changes briefly delayed replies but content stayed specific and varied.",
    buildMessages: (pid) => [...baselineRich(pid, 17), ...currentStable(pid, 11)],
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P02").slice(-4).map((m) => m.id),
  }),
  caseDef({
    patient_id: "P03",
    display_name: "Ruth Okonkwo (synthetic)",
    expected_label: "stable",
    label_reason: "No material baseline shift; morning posting and lexical variety remain within personal range.",
    benign_explanation: "Grandchild visit increased photo chatter from others; patient messages stayed typical.",
    buildMessages: (pid) => [...baselineRich(pid, 16), ...currentStable(pid, 10)],
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P03" && m.created_at >= isoDaysAgo(10)).slice(0, 3).map((m) => m.id),
  }),
  caseDef({
    patient_id: "P04",
    display_name: "Priya Shah (synthetic)",
    expected_label: "stable",
    label_reason: "Affect and engagement metrics track baseline; content includes planning and storytelling.",
    benign_explanation: "Mild cold mentioned once; no sustained change in timing or repetition.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 15);
      const cur = currentStable(pid, 10);
      // Mild cold mentioned once — should not dominate affect metrics.
      cur.push(
        msg(
          pid,
          pid,
          6,
          11,
          "Slight sniffle this morning, then tea and a lovely walk through the neighborhood garden with friends.",
        ),
      );
      return [...base, ...cur];
    },
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P04" && m.created_at >= isoDaysAgo(14)).slice(0, 3).map((m) => m.id),
  }),
  caseDef({
    patient_id: "P05",
    display_name: "James Alvarez (synthetic)",
    expected_label: "stable",
    label_reason: "Voice and text samples remain fluent; no sleep-timing or engagement drop versus baseline.",
    benign_explanation: "Hackathon weekend meant late family messages from others, not from the patient.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 14);
      base.push(
        msg(pid, pid, 30, 10, "Voice note about the garden tomatoes and the recipe Sofia requested.", {
          kind: "voice",
          voice_metrics: { wordsPerMinute: 138, pauseRatio: 0.12, hesitationRate: 0.04 },
        }),
      );
      const cur = currentStable(pid, 10);
      cur.push(
        msg(pid, pid, 3, 10, "Quick voice update: market trip went well and I found the ripe peaches.", {
          kind: "voice",
          voice_metrics: { wordsPerMinute: 134, pauseRatio: 0.13, hesitationRate: 0.05 },
        }),
      );
      cur.push(msg(pid, `${pid}-daughter`, 2, 23, "Still at the hackathon — don't wait up!"));
      return [...base, ...cur];
    },
    evidencePicker: (msgs) => msgs.filter((m) => m.kind === "voice").map((m) => m.id),
  }),
  caseDef({
    patient_id: "P06",
    display_name: "Margaret Chen (synthetic)",
    expected_label: "review_suggested",
    label_reason: "Current window shows repeated near-identical questions about the medication list versus a varied baseline.",
    benign_explanation: "New pharmacy packaging could explain confusion; still warrants human review of the pattern.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 16);
      const cur = [];
      const repeated = "Where is the list for my morning pills.";
      for (let i = 0; i < 8; i += 1) {
        cur.push(msg(pid, pid, 12 - i, 22 + (i % 2), repeated));
      }
      cur.push(msg(pid, `${pid}-daughter`, 5, 9, "Mom, the list is on the fridge — I can call at lunch."));
      cur.push(msg(pid, pid, 4, 23, repeated));
      cur.push(msg(pid, pid, 2, 0, "Where is the list for my morning pills."));
      cur.push(msg(pid, `${pid}-son`, 1, 18, "Who wants pizza Friday?"));
      return [...base, ...cur];
    },
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P06" && m.body.toLowerCase().includes("where is the list")).map((m) => m.id),
  }),
  caseDef({
    patient_id: "P07",
    display_name: "Walter Brooks (synthetic)",
    expected_label: "review_suggested",
    label_reason: "Current chat repeatedly references missed clinic appointments and confusion about dates.",
    benign_explanation: "Transportation cancellation is mentioned once; pattern of missed visits still needs review.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 15);
      const cur = [
        msg(pid, pid, 12, 10, "I think I missed the clinic appointment again yesterday."),
        msg(pid, `${pid}-spouse`, 12, 11, "I can drive next time — tell me the date."),
        msg(pid, pid, 10, 15, "Was the doctor visit Tuesday or Thursday? I never made it."),
        msg(pid, pid, 8, 9, "Missed the appointment. The bus did not come."),
        msg(pid, pid, 7, 14, "Did we already cancel the follow-up or did I forget again?"),
        msg(pid, `${pid}-daughter`, 7, 15, "I'll call the office tomorrow morning."),
        msg(pid, pid, 5, 11, "I missed another appointment. Sorry."),
        msg(pid, pid, 3, 16, "What day was the clinic? I keep missing it."),
        msg(pid, pid, 2, 10, "Missed the appointment again; I wrote it wrong."),
        msg(pid, `${pid}-son`, 1, 19, "Soccer practice moved to 5."),
        msg(pid, pid, 1, 20, "Please remind me about the clinic. I missed the last two."),
      ];
      return [...base, ...cur];
    },
    evidencePicker: (msgs) =>
      msgs
        .filter((m) => m.speaker_id === "P07" && /missed|appointment|clinic|forget/i.test(m.body))
        .map((m) => m.id),
  }),
  caseDef({
    patient_id: "P08",
    display_name: "Dorothy Hale (synthetic)",
    expected_label: "review_suggested",
    label_reason: "Posting shifted into late-night hours with shorter, more restless messages versus daytime baseline.",
    benign_explanation: "Noisy construction next door could disturb sleep; timing shift still merits review.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 16);
      const cur = [];
      const nightLines = [
        "Still awake. Is anyone there.",
        "Cannot sleep again. Checking the clock.",
        "It is so late. Are the lights supposed to be on.",
        "Wide awake. Thinking about tomorrow.",
        "Cannot sleep. Walking the hallway.",
        "Still up. The street is quiet.",
        "Awake again. Checking messages.",
        "Late night. Hard to rest.",
      ];
      for (let i = 0; i < nightLines.length; i += 1) {
        cur.push(msg(pid, pid, 13 - i, i % 2 === 0 ? 23 : 1, nightLines[i]));
      }
      cur.push(msg(pid, `${pid}-spouse`, 4, 8, "Construction starts early — maybe try earplugs?"));
      cur.push(msg(pid, pid, 3, 0, "Still awake. Is anyone there."));
      return [...base, ...cur];
    },
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P08" && m.created_at >= isoDaysAgo(14)).map((m) => m.id).slice(0, 6),
  }),
  caseDef({
    patient_id: "P09",
    display_name: "Arthur Nguyen (synthetic)",
    expected_label: "review_suggested",
    label_reason: "Marked drop in patient-authored messages and shorter affect-flattened replies versus an active baseline.",
    benign_explanation: "Visiting relatives may have reduced typing time; withdrawal pattern still flagged for review.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 20);
      const cur = [
        msg(pid, `${pid}-daughter`, 12, 10, "Dad, want to join dinner Sunday?"),
        msg(pid, pid, 11, 18, "Ok."),
        msg(pid, `${pid}-son`, 9, 12, "Sent the photo from last Sunday."),
        msg(pid, pid, 8, 19, "Fine."),
        msg(pid, `${pid}-daughter`, 6, 9, "Call when free?"),
        msg(pid, pid, 5, 20, "Later."),
        msg(pid, `${pid}-spouse`, 3, 11, "Who wants pizza Friday?"),
        msg(pid, pid, 2, 21, "No."),
        msg(pid, `${pid}-daughter`, 1, 16, "Love you."),
      ];
      return [...base, ...cur];
    },
    evidencePicker: (msgs) =>
      msgs.filter((m) => m.speaker_id === "P09" && m.created_at >= isoDaysAgo(14)).map((m) => m.id),
  }),
  caseDef({
    patient_id: "P10",
    display_name: "Helen Ortiz (synthetic)",
    expected_label: "review_suggested",
    label_reason:
      "Combined signals: increased phrase repetition, late-night activity, and reduced lexical variety versus baseline.",
    benign_explanation: "Recent move disrupted routines; multiple concurrent changes still justify clinician review.",
    buildMessages: (pid) => {
      const base = baselineRich(pid, 18);
      const cur = [];
      const line = "Did I take the pills. Did I take the pills.";
      for (let i = 0; i < 6; i += 1) {
        cur.push(msg(pid, pid, 12 - i, 23, line));
      }
      cur.push(msg(pid, pid, 5, 1, "Where are the boxes. Where are the boxes."));
      cur.push(msg(pid, pid, 4, 0, "Did I take the pills. Did I take the pills."));
      cur.push(msg(pid, pid, 3, 22, "Still unpacking. Still unpacking."));
      cur.push(msg(pid, `${pid}-daughter`, 3, 9, "I can help label the kitchen shelves tonight."));
      cur.push(msg(pid, pid, 2, 1, "Did I take the pills."));
      cur.push(msg(pid, `${pid}-son`, 1, 17, "Parking is easier on the side street."));
      return [...base, ...cur];
    },
    evidencePicker: (msgs) =>
      msgs
        .filter((m) => m.speaker_id === "P10" && /pills|boxes|unpacking/i.test(m.body))
        .map((m) => m.id),
  }),
];

function excellentReport(c) {
  const stable = c.expected_label === "stable";
  return {
    patient_id: c.patient_id,
    reporting_period: {
      baseline_window: c.baseline_window,
      current_window: c.current_window,
    },
    headline: stable
      ? `No material personal-baseline shift detected for ${c.patient_id} in the recent 14-day window versus the prior 30 days.`
      : `Review suggested for ${c.patient_id}: consented chat shows a change versus personal baseline that warrants clinician attention.`,
    status: c.expected_label,
    changes: stable
      ? [
          {
            code: "none_material",
            summary: "Lexical variety, engagement cadence, and timing remain within this person's recent baseline range.",
          },
        ]
      : [
          {
            code:
              c.patient_id === "P06"
                ? "repetition_change"
                : c.patient_id === "P08"
                  ? "sleep_shift"
                  : c.patient_id === "P09"
                    ? "engagement_change"
                    : c.patient_id === "P07"
                      ? "affect_change"
                      : "repetition_change",
            summary: c.label_reason,
          },
        ],
    evidence_ids: c.expected_evidence_ids.slice(0, 6),
    limitations: [
      "Signals reflect consented family communication patterns, not a clinical examination.",
      "Changes may reflect travel, device access, illness, housing moves, or family dynamics.",
      "Absence of chat does not prove absence of symptoms.",
      c.benign_explanation,
    ],
    suggested_clinician_actions: stable
      ? ["document_and_monitor"]
      : c.patient_id === "P10" || c.patient_id === "P06"
        ? ["review_evidence", "contact_patient_or_caregiver", "consider_clinical_screening"]
        : ["review_evidence", "contact_patient_or_caregiver"],
  };
}

const packageJson = {
  package: "hearth-hcp-brief-eval",
  version: "1.0.0",
  reference_datetime: REFERENCE.toISOString(),
  timezone: "America/New_York",
  cases,
};

const reports = {
  package: "hearth-hcp-excellent-reports",
  format: "Hearth Weekly HCP Brief",
  note: "Synthetic excellent examples authored to the Hearth schema; not Impiricus templates.",
  reports: cases.map(excellentReport),
};

writeFileSync(join(__dirname, "cases.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
writeFileSync(join(__dirname, "excellent-reports.json"), `${JSON.stringify(reports, null, 2)}\n`);

for (const c of cases) {
  const n = c.messages.length;
  const patientMsgs = c.messages.filter((m) => m.speaker_id === c.patient_id).length;
  if (n < 20 || n > 50) throw new Error(`${c.patient_id} message count ${n} out of range`);
  console.log(
    `${c.patient_id} ${c.expected_label.padEnd(17)} messages=${String(n).padStart(2)} patient_msgs=${String(patientMsgs).padStart(2)} evidence=${c.expected_evidence_ids.length}`,
  );
}
console.log(`Wrote ${cases.length} cases and ${reports.reports.length} excellent reports.`);
