import type { DailyPoint } from "@/lib/types";

function chartGeometry(points: DailyPoint[], accessor: (point: DailyPoint) => number, width: number, height: number) {
  const pad = 8;
  const values = points.map(accessor);
  const max = Math.max(...values, 0.01);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const coordinates = points.map((point, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - ((accessor(point) - min) / span) * (height - pad * 2);
    return { x, y };
  });
  return { pad, coordinates, line: coordinates.map(({ x, y }) => `${x},${y}`).join(" ") };
}

export function Sparkline({
  points,
  accessor,
  color = "#2563eb",
  label,
}: {
  points: DailyPoint[];
  accessor: (point: DailyPoint) => number;
  color?: string;
  label: string;
}) {
  const width = 160;
  const height = 42;
  const { coordinates, line } = chartGeometry(points, accessor, width, height);
  const area = coordinates.length ? `8,${height - 8} ${line} ${width - 8},${height - 8}` : "";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full" role="img" aria-label={label}>
      <polygon points={area} fill={color} opacity="0.08" />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={line} />
    </svg>
  );
}

export function TrendChart({
  points,
  accessor,
  color = "#2563eb",
  label,
}: {
  points: DailyPoint[];
  accessor: (point: DailyPoint) => number;
  color?: string;
  label: string;
}) {
  const width = 720;
  const height = 180;
  const { pad, coordinates, line } = chartGeometry(points, accessor, width, height);
  const area = coordinates.length ? `${pad},${height - pad} ${line} ${width - pad},${height - pad}` : "";
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label={label}>
        {[0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1={pad}
            y1={height * fraction - pad / 2}
            x2={width - pad}
            y2={height * fraction - pad / 2}
            stroke="#e2e8f0"
            strokeDasharray="4 5"
          />
        ))}
        <polygon points={area} fill={color} opacity="0.07" />
        <polyline fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={line} />
        {coordinates.map(({ x, y }, index) =>
          accessor(points[index]) > 0 ? <circle key={points[index].date} cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" /> : null,
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{points.at(0)?.date.slice(5)}</span>
        <span>{points.at(-1)?.date.slice(5)}</span>
      </div>
    </div>
  );
}

export function Metric({
  label,
  value,
  baseline,
  delta,
  invert,
}: {
  label: string;
  value: string;
  baseline?: string;
  delta: number | null;
  invert?: boolean;
}) {
  const changed = delta !== null && Math.abs(delta) > 0.02;
  const adverse = delta !== null && (invert ? delta > 0.02 : delta < -0.02);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${adverse ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {delta === null ? "No baseline" : `${delta >= 0 ? "+" : ""}${Math.round(delta * 100)}%`}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {baseline ? `Personal baseline ${baseline}` : changed ? "Compared with personal baseline" : "Within personal baseline"}
      </p>
    </div>
  );
}
