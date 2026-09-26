const POSITIVE = new Set(
  "love loved loving happy joy joyful proud grateful thankful beautiful wonderful great good glad excited warm hug hugs miss peace calm laugh laughing delicious proudest blessing blessed family together proud".split(
    " ",
  ),
);
const NEGATIVE = new Set(
  "sad lonely tired afraid worried lost confuse confused forget forgot forgotten purse can't cannot hate angry upset pain ache empty dark late can'tfind gone missing cry crying hopeless".split(
    " ",
  ),
);

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function sentences(text: string) {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function lexicalDiversity(text: string) {
  const tokens = tokenize(text);
  if (tokens.length < 4) return 0.5;
  const unique = new Set(tokens);
  return unique.size / tokens.length;
}

export function meanSentenceLength(text: string) {
  const s = sentences(text);
  if (!s.length) return tokenize(text).length;
  const lens = s.map((x) => tokenize(x).length);
  return lens.reduce((a, b) => a + b, 0) / lens.length;
}

export function sentimentScore(text: string) {
  const tokens = tokenize(text);
  if (!tokens.length) return 0;
  let score = 0;
  for (const t of tokens) {
    if (POSITIVE.has(t)) score += 1;
    if (NEGATIVE.has(t)) score -= 1;
  }
  return Math.max(-1, Math.min(1, score / Math.sqrt(tokens.length)));
}

export function repetitionScore(texts: string[]) {
  const phrases = texts
    .flatMap((t) => sentences(t).map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()))
    .filter((s) => s.split(" ").length >= 3);
  if (phrases.length < 2) return 0;
  const counts = new Map<string, number>();
  for (const p of phrases) counts.set(p, (counts.get(p) ?? 0) + 1);
  const repeats = [...counts.values()].filter((n) => n > 1).reduce((a, b) => a + b, 0);
  const stemRepeats = nearDuplicates(phrases);
  return Math.min(1, (repeats + stemRepeats) / phrases.length);
}

function nearDuplicates(phrases: string[]) {
  let n = 0;
  for (let i = 0; i < phrases.length; i++) {
    for (let j = i + 1; j < phrases.length; j++) {
      const a = new Set(phrases[i].split(" "));
      const b = phrases[j].split(" ");
      const overlap = b.filter((w) => a.has(w)).length;
      if (overlap / Math.max(b.length, 1) > 0.7 && phrases[i] !== phrases[j]) n += 1;
    }
  }
  return n;
}

export function hourOf(iso: string) {
  return new Date(iso).getHours();
}
