import type { DailyPoint } from "@/lib/types";

export function LineChart({
  points,
  accessor,
  color = "#2563eb",
}: {
  points: DailyPoint[];
  accessor: (p: DailyPoint) => number;
  color?: string;
}) {
  const w = 560;
  const h = 120;
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
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" strokeWidth="1" />
      <polyline fill="none" stroke={color} strokeWidth="2" points={coords.join(" ")} />
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
    <div className="border border-line bg-paper p-3">
      <p className="text-xs text-mute">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      <p className={`text-xs ${warn ? "text-red-600" : "text-clinic"}`}>
        {delta >= 0 ? "+" : ""}
        {Math.round(delta * 100)}% vs baseline
      </p>
    </div>
  );
}
