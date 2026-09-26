import type { DailyPoint } from "@/lib/types";

export function LineChart({
  points,
  accessor,
  color = "#0f766e",
}: {
  points: DailyPoint[];
  accessor: (p: DailyPoint) => number;
  color?: string;
}) {
  const w = 560;
  const h = 140;
  const pad = 8;
  const vals = points.map(accessor);
  const max = Math.max(...vals, 0.01);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((accessor(p) - min) / span) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full">
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={coords.join(" ")} />
    </svg>
  );
}

export function Metric({
  label,
  value,
  delta,
  invert,
}: {
  label: string;
  value: string;
  delta: number;
  invert?: boolean;
}) {
  const down = delta < -0.02;
  const warn = invert ? !down && delta > 0.02 : down;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      <p className={`mt-1 text-sm ${warn ? "text-rose-700" : "text-teal-700"}`}>
        {delta >= 0 ? "+" : ""}
        {Math.round(delta * 100)}% vs baseline
      </p>
    </div>
  );
}
