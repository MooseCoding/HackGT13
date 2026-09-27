export type MentalHealthConcern =
  | "cognitive"
  | "mood"
  | "anxiety"
  | "sleep"
  | "trauma"
  | "psychosis"
  | "mania"
  | "bipolar"
  | "depression"
  | "ptsd"
  | "ocd"
  | "adhd"
  | "schizophrenia"
  | "substance"
  | "eating"
  | "withdrawal";

export type CheckInSuggestion = {
  title: string;
  message: string;
  concern: MentalHealthConcern;
  /** Plain-language concern area - not a diagnosis. */
  label: string;
};

type ConcernRule = {
  concern: MentalHealthConcern;
  label: string;
  patterns: RegExp[];
  title: string;
  message: string;
};

const ALERT_FOOTER =
  "One difficult message does not create a clinical alert. Consider asking someone in your circle to check in directly.";

/** Ordered most-specific / safety-sensitive first; first match wins. */
const CONCERN_RULES: ConcernRule[] = [
  {
    concern: "schizophrenia",
    label: "Schizophrenia",
    patterns: [
      /\bschizophreni[a]?\b/i,
      /\bpsychotic\s+episode\b/i,
      /\b(?:having|in)\s+a\s+psychosis\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Schizophrenia-related language appeared here. Stay calm, listen, and offer steady support - this is not a diagnosis. ${ALERT_FOOTER}`,
  },
  {
    concern: "psychosis",
    label: "Perception change",
    patterns: [
      /\bhearing voices\b/i,
      /\bvoices?\s+(?:tell|telling|told|say|saying)\b/i,
      /\bpeople\s+(?:are\s+)?watching\b/i,
      /\b(?:they'?re|someone'?s)\s+out\s+to\s+get\b/i,
      /\bnot\s+real\b/i,
      /\bcan(?:'t|not)\s+trust\s+(?:anyone|what)\b/i,
      /\bparanoi[a]?\b/i,
      /\b(?:seeing|saw)\s+things\b/i,
    ],
    title: "A gentle check-in may help",
    message: `This sounds unsettling for them. Stay calm and listen without arguing about what is real. ${ALERT_FOOTER}`,
  },
  {
    concern: "bipolar",
    label: "Bipolar",
    patterns: [
      /\bbipolar\b/i,
      /\b(?:hypo)?manic\s+episode\b/i,
      /\bon\s+a\s+(?:hypo)?manic\b/i,
      /\b(?:mood|energy)\s+(?:swings?|cycling)\b/i,
      /\bswinging\s+between\s+(?:high|low|happy|sad)\b/i,
      /\b(?:up|high)\s+and\s+(?:down|low)\s+(?:constantly|all\s+the\s+time)\b/i,
      /\b(?:manic|hypomanic)\s+(?:and|then)\s+depress(?:ed|ive)\b/i,
      /\bdepressive\s+episode\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Bipolar-related mood or energy shifts may be showing up. Ask how they're sleeping and feeling - without labeling them. ${ALERT_FOOTER}`,
  },
  {
    concern: "substance",
    label: "Substance use",
    patterns: [
      /\b(?:drinking|drank)\s+again\b/i,
      /\brelaps(?:e|ed|ing)\b/i,
      /\bneed\s+a\s+drink\b/i,
      /\bcan(?:'t|not)\s+stop\s+drinking\b/i,
      /\busing\s+again\b/i,
      /\b(?:pills?|opioids?)\s+again\b/i,
      /\b(?:high|stoned)\s+all\s+(?:day|the\s+time)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `This may reflect a hard stretch with alcohol or substances. Offer support without shame. ${ALERT_FOOTER}`,
  },
  {
    concern: "mania",
    label: "Elevated energy",
    patterns: [
      /\bhaven(?:'t|t)\s+slept\s+(?:in\s+)?(?:days|a\s+week)\b/i,
      /\bno\s+sleep\s+but\s+(?:feel|feeling)\s+(?:great|amazing|fine)\b/i,
      /\btalking\s+too\s+fast\b/i,
      /\bcan(?:'t|not)\s+stop\s+talking\b/i,
      /\b(?:spending|spent)\s+spree\b/i,
      /\bunstoppable\s+energy\b/i,
      /\bfeel(?:ing)?\s+(?:on\s+top\s+of\s+the\s+world|invincible)\b/i,
      /\btoo\s+many\s+ideas\s+at\s+once\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Energy or sleep patterns sound unusual for them. A calm check-in can help gauge whether they need rest or support. ${ALERT_FOOTER}`,
  },
  {
    concern: "ptsd",
    label: "PTSD",
    patterns: [
      /\bptsd\b/i,
      /\bpost[- ]traumatic\b/i,
      /\bposttraumatic\b/i,
      /\b(?:my|the)\s+trauma\s+(?:is\s+)?(?:back|acting\s+up)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `PTSD-related language showed up. Offer grounding and safety - not pressure to retell the story. ${ALERT_FOOTER}`,
  },
  {
    concern: "trauma",
    label: "Trauma response",
    patterns: [
      /\bflashback\b/i,
      /\b(?:having|had)\s+a\s+flashback\b/i,
      /\breliving\b/i,
      /\btriggered\b/i,
      /\b(?:panic|panicking)\s+attack\b/i,
      /\bcan(?:'t|not)\s+stop\s+shaking\b/i,
      /\bnightmares?\s+(?:every|all)\s+night\b/i,
      /\bstartl(?:e|ed)\s+by\s+(?:everything|every)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `This may reflect a trauma or stress response. Offer grounding and safety - not pressure to explain. ${ALERT_FOOTER}`,
  },
  {
    concern: "ocd",
    label: "OCD",
    patterns: [
      /\bocd\b/i,
      /\bobsessive[- ]compulsive\b/i,
      /\bintrusive\s+thoughts\b/i,
      /\bcan(?:'t|not)\s+stop\s+(?:checking|washing|counting|repeating)\b/i,
      /\b(?:keep|kept)\s+(?:checking|washing|counting)\b/i,
      /\bcompulsion\b/i,
      /\brituals?\s+(?:are\s+)?(?:taking\s+over|everywhere)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `OCD-related routines or intrusive thoughts may be weighing on them. Be patient - don't minimize the distress. ${ALERT_FOOTER}`,
  },
  {
    concern: "adhd",
    label: "ADHD",
    patterns: [
      /\badhd\b/i,
      /\battention\s+deficit\b/i,
      /\bcan(?:'t|not)\s+(?:focus|concentrate|sit\s+still)\b/i,
      /\b(?:so\s+)?scatterbrained\b/i,
      /\bbrain\s+(?:won't|will\s+not)\s+(?:shut\s+up|slow\s+down)\b/i,
      /\b(?:forgot|lose)\s+(?:everything|track)\s+again\b/i,
      /\bhyperactiv(?:e|ity)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `ADHD-related focus or overwhelm may be showing up. Offer practical help rather than "just try harder." ${ALERT_FOOTER}`,
  },
  {
    concern: "depression",
    label: "Depression",
    patterns: [
      /\b(?:major\s+)?depression\b/i,
      /\bclinical(?:ly)?\s+depress(?:ed|ion)\b/i,
      /\bdepressive\s+disorder\b/i,
      /\b(?:in|having)\s+a\s+depressive\s+(?:episode|spiral)\b/i,
      /\b(?:my|the)\s+depression\s+(?:is\s+)?(?:back|worse|acting\s+up)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Depression-related language appeared here. A brief, caring note can matter more than advice. ${ALERT_FOOTER}`,
  },
  {
    concern: "anxiety",
    label: "Anxiety",
    patterns: [
      /\b(?:having|had)\s+a\s+panic\s+attack\b/i,
      /\bpanic(?:king)?\b/i,
      /\bcan(?:'t|not)\s+breathe\b/i,
      /\bheart\s+(?:is\s+)?(?:racing|pounding)\b/i,
      /\b(?:very\s+)?anxious\b/i,
      /\b(?:so\s+)?on\s+edge\b/i,
      /\bracing\s+thoughts\b/i,
      /\b(?:full\s+of\s+)?dread\b/i,
      /\b(?:worried|worrying)\s+(?:about\s+)?everything\b/i,
      /\bcan(?:'t|not)\s+(?:calm|relax)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `They may be carrying a lot of worry right now. A short, steady message can help them feel less alone. ${ALERT_FOOTER}`,
  },
  {
    concern: "eating",
    label: "Eating disorder",
    patterns: [
      /\b(?:eating\s+disorder|anorexi[a]?|bulimi[a]?)\b/i,
      /\b(?:not|haven't|hasn't)\s+(?:been\s+)?eating\b/i,
      /\b(?:can't|cannot)\s+keep\s+food\s+down\b/i,
      /\bthrowing\s+up\b/i,
      /\b(?:binge|binged|binging)\b/i,
      /\b(?:hate|ashamed\s+of)\s+(?:my\s+)?body\b/i,
      /\b(?:starving|fasting)\s+(?:myself|on\s+purpose)\b/i,
      /\bfood\s+is\s+(?:the\s+)?enemy\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Eating-disorder-related language may be weighing on them. Keep the tone warm and practical - not about appearance. ${ALERT_FOOTER}`,
  },
  {
    concern: "mood",
    label: "Low mood",
    patterns: [
      /\b(?:feel(?:ing)?\s+)?hopeless\b/i,
      /\b(?:feel(?:ing)?\s+)?worthless\b/i,
      /\b(?:feel(?:ing)?\s+)?empty\s+inside\b/i,
      /\b(?:don't|do\s+not)\s+care\s+anymore\b/i,
      /\b(?:no|zero)\s+(?:energy|motivation)\b/i,
      /\b(?:crying|cried)\s+(?:all\s+day|nonstop|constantly)\b/i,
      /\b(?:feel(?:ing)?\s+)?numb\b/i,
      /\b(?:feel(?:ing)?\s+)?(?:low|down|depressed)\b/i,
      /\b(?:feel(?:ing)?\s+)?(?:lonely|overwhelmed)\b/i,
      /\bnot\s+feeling\s+(?:well|good|okay|great)\b/i,
      /\b(?:i\s+am|i'm)\s+(?:very\s+)?(?:tired|upset|sad)\b/i,
      /\bwish\s+i\s+(?:wasn't|weren't)\s+here\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Mood language shifted in this message. A brief, caring note can matter more than advice. ${ALERT_FOOTER}`,
  },
  {
    concern: "sleep",
    label: "Sleep disruption",
    patterns: [
      /\bcan(?:'t|not)\s+sleep\b/i,
      /\b(?:haven't|hasn't|hadn't)\s+slept\b/i,
      /\binsomnia\b/i,
      /\b(?:awake|up)\s+(?:all\s+night|since)\b/i,
      /\b(?:2|3|4)\s*am\b/i,
      /\bnightmares?\b/i,
      /\b(?:tossing|turning)\s+all\s+night\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Sleep sounds disrupted for them. Ask how last night went - sometimes that opens the door. ${ALERT_FOOTER}`,
  },
  {
    concern: "cognitive",
    label: "Cognitive change",
    patterns: [
      /\b(?:cannot|can't)\s+(?:find|remember)\b/i,
      /\bi\s+(?:forgot|feel\s+lost)\b/i,
      /\b(?:feel(?:ing)?\s+)?confused\b/i,
      /\b(?:lost|lose)\s+(?:my\s+)?(?:train\s+of\s+thought|place)\b/i,
      /\b(?:where|what)\s+(?:am|was)\s+i\b/i,
      /\b(?:misplaced|can't\s+find)\s+(?:my\s+)?(?:keys|wallet|phone|glasses)\b/i,
      /\bkeep\s+(?:forgetting|repeating)\b/i,
      /\b(?:already|keep)\s+(?:said|told)\s+(?:you|them)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `Memory or orientation language showed up here. Stay patient and offer practical help if they want it. ${ALERT_FOOTER}`,
  },
  {
    concern: "withdrawal",
    label: "Social withdrawal",
    patterns: [
      /\b(?:don't|do\s+not)\s+want\s+(?:to\s+)?(?:see|talk|visit)\b/i,
      /\bleave\s+me\s+alone\b/i,
      /\b(?:cancel(?:led|ing)?|skip(?:ping)?)\s+everything\b/i,
      /\bnot\s+today\b/i,
      /\b(?:staying|stay)\s+in\s+(?:bed|my\s+room)\b/i,
      /\b(?:won't|will\s+not)\s+(?:answer|pick\s+up)\b/i,
      /\b(?:nobody|no\s+one)\s+(?:cares|understands)\b/i,
    ],
    title: "A gentle check-in may help",
    message: `They may be pulling back from the circle. A low-pressure note - no guilt - can still land. ${ALERT_FOOTER}`,
  },
];

const QUICK_CHECK_RE =
  /\b(not feeling|feeling (?:low|lonely|down|overwhelmed|anxious|hopeless|numb)|can't (?:find|remember|sleep|breathe|calm|focus|stop)|forgot|confused|panic|nightmare|relaps|voices?|flashback|withdraw|leave me alone|bipolar|depression|ptsd|ocd|adhd|schizophreni|manic|hypomanic|intrusive thoughts|eating disorder|anorexi|bulimi)\b/i;

/** Cheap first pass before full concern matching. */
export function looksLikeCheckInText(text: string) {
  const normalized = text.trim();
  if (!normalized || normalized.length < 6) return false;
  return QUICK_CHECK_RE.test(normalized);
}

/** 0–100 language-match strength for a detected concern - not diagnostic probability. */
export function scoreDisorderConfidence(text: string, concern: MentalHealthConcern, contextScore = 0): number {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return 0;

  const rule = CONCERN_RULES.find((entry) => entry.concern === concern);
  if (!rule) return 50;

  const matchedPatterns = rule.patterns.filter((pattern) => pattern.test(normalized));
  if (!matchedPatterns.length) return 0;

  let score = 62 + Math.min(18, (matchedPatterns.length - 1) * 9);

  const labelToken = rule.label.toLowerCase();
  if (normalized.includes(concern) || (labelToken.length > 3 && normalized.includes(labelToken))) {
    score += 14;
  }

  if (/\bmy\s+\w+\s+is\s+(?:acting\s+up|back|worse)\b/i.test(normalized)) {
    score += 8;
  }

  score += Math.min(8, Math.round(contextScore / 2));

  return Math.min(99, Math.max(52, score));
}

/** A humane one-message response. This never changes longitudinal clinical risk. */
export function detectCheckInSuggestion(text: string): CheckInSuggestion | null {
  const normalized = text.trim();
  if (!normalized) return null;

  for (const rule of CONCERN_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        title: rule.title,
        message: rule.message,
        concern: rule.concern,
        label: rule.label,
      };
    }
  }
  return null;
}

/** Prefill text for a warm family reply - concern-aware but never diagnostic. */
export function checkInReplyDraft(authorFirstName: string, concern: MentalHealthConcern) {
  const name = authorFirstName.trim() || "you";
  switch (concern) {
    case "cognitive":
      return `Hi ${name}, I'm here. Want help finding anything, or just company for a bit?`;
    case "sleep":
      return `Hey ${name}, thinking of you. How did you sleep last night?`;
    case "anxiety":
      return `Hi ${name}, no rush to reply. I'm here if you want to talk or just sit with someone.`;
    case "trauma":
    case "ptsd":
      return `Hi ${name}, you're safe with us. I'm here whenever you want, no pressure.`;
    case "psychosis":
    case "schizophrenia":
      return `Hi ${name}, I'm on your side. Want me to call or come by?`;
    case "mania":
    case "bipolar":
      return `Hey ${name}, checking in. How have your energy and sleep been lately?`;
    case "depression":
    case "mood":
      return `Hi ${name}, thinking of you today. How are you holding up?`;
    case "ocd":
      return `Hi ${name}, I'm here. No need to explain anything. Just wanted you to know I care.`;
    case "adhd":
      return `Hey ${name}, want me to help you tackle one small thing together?`;
    case "substance":
      return `Hi ${name}, I'm glad you said something. I'm here, no judgment.`;
    case "eating":
      return `Hey ${name}, thinking of you today. Want me to bring dinner or just chat?`;
    case "withdrawal":
      return `Hi ${name}, no pressure to come out. Just wanted you to know we're thinking of you.`;
    default:
      return `Hi ${name}, thinking of you today. How are you holding up?`;
  }
}
