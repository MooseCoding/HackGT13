"use client";

import { buildBringListCommerceSuggestion, claimerName } from "@/lib/event-supplies";
import type { CalendarEvent, CommerceSuggestion, EventSupplyItem, Member } from "@/lib/types";

export function EventBringList({
  event,
  members,
  meId,
  busySupplyId,
  onClaim,
  onOrder,
  orderingSupplyId,
  compact,
  showTitle = true,
}: {
  event: CalendarEvent;
  members: Member[];
  meId: string;
  busySupplyId?: string | null;
  onClaim: (supplyId: string) => void;
  onOrder?: (suggestion: CommerceSuggestion) => void;
  orderingSupplyId?: string | null;
  compact?: boolean;
  showTitle?: boolean;
}) {
  const supplies = event.supplies ?? [];
  if (!supplies.length) return null;

  return (
    <div className={`${compact ? "mt-2" : "mt-3 border-t border-rule pt-3"}`}>
      {showTitle ? (
        <p className="text-xs font-medium text-mute">Bring list · {event.title}</p>
      ) : null}
      <ul className={`space-y-1.5 ${showTitle ? "mt-2" : ""}`}>
        {supplies.map((supply) => (
          <SupplyRow
            key={supply.id}
            supply={supply}
            event={event}
            members={members}
            meId={meId}
            busy={busySupplyId === supply.id}
            ordering={orderingSupplyId === supply.id}
            onClaim={() => onClaim(supply.id)}
            onOrder={onOrder}
            compact={compact}
          />
        ))}
      </ul>
    </div>
  );
}

function SupplyRow({
  supply,
  event,
  members,
  meId,
  busy,
  ordering,
  onClaim,
  onOrder,
  compact,
}: {
  supply: EventSupplyItem;
  event: CalendarEvent;
  members: Member[];
  meId: string;
  busy?: boolean;
  ordering?: boolean;
  onClaim: () => void;
  onOrder?: (suggestion: CommerceSuggestion) => void;
  compact?: boolean;
}) {
  const claimed = supply.claimedBy;
  const mine = claimed === meId;
  const who = claimerName(members, claimed);
  const member = members.find((m) => m.id === meId);

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 rounded-sm border border-rule bg-surface px-2.5 py-1.5 ${
        compact ? "text-xs" : "text-sm"
      }`}
    >
      <div className="min-w-0">
        <span className="font-medium text-ink">{supply.item}</span>
        {who ? (
          <span className={`ml-1.5 ${mine ? "font-medium text-ember" : "text-mute"}`}>
            · {mine ? "You" : who}
          </span>
        ) : (
          <span className="ml-1.5 text-mute">· open</span>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {!claimed || mine ? (
          <button
            type="button"
            disabled={busy}
            onClick={onClaim}
            className={`rounded-sm px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
              mine
                ? "border border-rule bg-ground text-mute hover:border-ember hover:text-ember"
                : "bg-ember text-white hover:bg-ember-dark"
            }`}
          >
            {busy ? "…" : mine ? "Unclaim" : "Claim"}
          </button>
        ) : null}
        {!claimed && onOrder && member ? (
          <button
            type="button"
            disabled={ordering}
            onClick={() => onOrder(buildBringListCommerceSuggestion(event, supply, member))}
            className="rounded-sm border border-clinic/40 bg-clinic/5 px-2 py-0.5 text-xs font-medium text-clinic hover:bg-clinic/10 disabled:opacity-50"
          >
            {ordering ? "…" : "Order instead"}
          </button>
        ) : null}
      </div>
    </li>
  );
}
