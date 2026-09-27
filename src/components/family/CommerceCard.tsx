"use client";

import type { CommerceSuggestion } from "@/lib/types";

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 5l6-3 6 3v7l-6 3-6-3V5z" stroke="currentColor" strokeWidth="1" />
      <path d="M8 2v13M2 5l6 3 6-3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function HeartBoxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 5h10v9H3V5z" stroke="currentColor" strokeWidth="1" />
      <path d="M3 5l5-2 5 2" stroke="currentColor" strokeWidth="1" />
      <path
        d="M8 9.5s-1.5-1-1.5-2a1 1 0 0 1 2 0c0 1-1.5 2-1.5 2z"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function formatPrice(total: number) {
  return `$${total.toFixed(2)}`;
}

export function CommerceCard({
  suggestion,
  onOrder,
  busy,
  compact,
  ordered,
}: {
  suggestion: CommerceSuggestion;
  onOrder: () => void;
  busy?: boolean;
  compact?: boolean;
  ordered?: { message: string } | null;
}) {
  const isCare = suggestion.kind === "care_package";
  const accent = isCare ? "border-clinic/30 bg-clinic/5" : "border-ember/30 bg-ember/5";
  const iconColor = isCare ? "text-clinic" : "text-ember";

  if (ordered) {
    return (
      <div className={`rounded-md border border-rule bg-accent-tint px-3 py-2.5 text-sm ${compact ? "mt-2 max-w-sm" : ""}`}>
        <p className="font-medium text-ink">Demo order simulated</p>
        <p className="mt-0.5 text-xs text-mute">{ordered.message}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-md border px-3 py-2.5 ${accent} ${compact ? "mt-2 max-w-sm" : ""}`}>
      <p className={`flex items-center gap-1.5 text-xs font-semibold ${iconColor}`}>
        {isCare ? <HeartBoxIcon className="shrink-0" /> : <PackageIcon className="shrink-0" />}
        {isCare ? "Family Care Package" : "Shopping suggestion"}
      </p>
      <p className="mt-1.5 text-sm font-medium text-ink">{suggestion.title}</p>
      <ul className="mt-1 space-y-0.5 text-xs text-mute">
        {suggestion.items.slice(0, 4).map((item) => (
          <li key={item.name}>· {item.name}</li>
        ))}
        {suggestion.items.length > 4 ? (
          <li>· +{suggestion.items.length - 4} more</li>
        ) : null}
      </ul>
      <p className="mt-1.5 text-xs text-mute">
        Deliver to {suggestion.recipientName}
        {suggestion.deliveryAddress ? ` · ${suggestion.deliveryAddress}` : ""}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">Estimated total: {formatPrice(suggestion.estimatedTotal)}</p>
      <p className="mt-1 text-[11px] text-mute">Demo only - no payment, card, or checkout. Nothing is stored or charged.</p>
      <button
        type="button"
        disabled={busy}
        onClick={onOrder}
        className={`mt-2 w-full rounded-sm px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
          isCare ? "bg-clinic hover:bg-clinic/90" : "bg-ember hover:bg-ember-dark"
        }`}
      >
        {busy ? "Placing order…" : suggestion.orderLabel}
      </button>
    </div>
  );
}
