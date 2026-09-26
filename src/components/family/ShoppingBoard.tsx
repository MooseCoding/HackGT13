"use client";

import { useFamily } from "@/components/family/FamilyChrome";
import { CommerceCard } from "@/components/family/CommerceCard";
import { useLargerText } from "@/components/settings/SettingsProvider";
import { suggestCommerceFromText } from "@/lib/commerce-detect";
import type { CommerceSuggestion, Post, WishlistItem } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function formatPrice(total: number) {
  return `$${total.toFixed(2)}`;
}

function ShoppingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 3h2l1.5 7h7L14 5H5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="6.5" cy="13" r="1" fill="currentColor" />
      <circle cx="11.5" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}

function WishlistCard({
  item,
  forName,
  orderedByName,
  busy,
  onOrder,
  onMarkPurchased,
  easy,
}: {
  item: WishlistItem;
  forName: string;
  orderedByName?: string;
  busy: boolean;
  onOrder: () => void;
  onMarkPurchased?: () => void;
  easy: boolean;
}) {
  const isOrdered = item.status === "ordered";
  const isPurchased = item.status === "purchased";

  return (
    <li className="border border-rule bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-medium text-ink ${easy ? "text-lg" : "text-base"}`}>{item.title}</p>
          {item.note ? <p className="mt-1 text-sm text-mute">{item.note}</p> : null}
          {item.items?.length ? (
            <ul className="mt-1.5 space-y-0.5 text-xs text-mute">
              {item.items.map((i) => (
                <li key={i.name}>· {i.name}{i.quantity && i.quantity > 1 ? ` ×${i.quantity}` : ""}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1.5 text-sm text-mute">
            For {forName}
            {item.estimatedTotal ? ` · Est. ${formatPrice(item.estimatedTotal)}` : ""}
          </p>
          {isOrdered && orderedByName ? (
            <p className="mt-1 text-xs font-medium text-ember">Ordered by {orderedByName}</p>
          ) : null}
          {isPurchased && orderedByName ? (
            <p className="mt-1 text-xs text-mute">Purchased by {orderedByName}</p>
          ) : null}
        </div>
        {item.status === "wishlist" ? (
          <ShoppingIcon className="mt-0.5 shrink-0 text-ember" />
        ) : null}
      </div>
      {item.status === "wishlist" ? (
        <button
          type="button"
          disabled={busy}
          onClick={onOrder}
          className="mt-3 rounded-sm bg-ember px-3 py-1.5 text-sm font-medium text-white hover:bg-ember-dark disabled:opacity-50"
        >
          {busy ? "Placing order…" : "Order & deliver"}
        </button>
      ) : null}
      {isOrdered && onMarkPurchased ? (
        <button
          type="button"
          disabled={busy}
          onClick={onMarkPurchased}
          className="mt-3 rounded-sm border border-rule px-3 py-1.5 text-sm hover:border-ink disabled:opacity-50"
        >
          Mark purchased
        </button>
      ) : null}
    </li>
  );
}

export function ShoppingBoard({
  wishlist,
  posts,
  familyId,
}: {
  wishlist: WishlistItem[];
  posts: Post[];
  familyId: string;
}) {
  const { me, members } = useFamily();
  const easy = useLargerText();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFor, setNewFor] = useState(me.id);
  const [newNote, setNewNote] = useState("");
  const [chatOrders, setChatOrders] = useState<Record<string, { message: string }>>({});

  const nameById = Object.fromEntries(members.map((m) => [m.id, m.name.split(" ")[0] ?? m.name]));

  const open = wishlist.filter((w) => w.status === "wishlist");
  const ordered = wishlist.filter((w) => w.status === "ordered");
  const purchased = wishlist.filter((w) => w.status === "purchased");
  const wishlistPostIds = new Set(wishlist.map((w) => w.sourcePostId).filter(Boolean));

  const chatSuggestions = useMemo(() => {
    const results: { post: Post; suggestion: CommerceSuggestion }[] = [];
    for (const post of posts) {
      if (wishlistPostIds.has(post.id)) continue;
      const suggestion = suggestCommerceFromText(post.body, members, post.authorId);
      if (suggestion) results.push({ post, suggestion });
    }
    return results.slice(0, 4);
  }, [posts, members, wishlistPostIds]);

  async function patchStatus(id: string, status: WishlistItem["status"]) {
    setBusyId(id);
    await fetch("/api/wishlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, familyId, status, orderedBy: me.id }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function placeOrder(item: WishlistItem) {
    setBusyId(item.id);
    await fetch("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        authorId: me.id,
        recipientId: item.forMemberId,
        kind: item.kind ?? "supply",
        title: item.title,
        sourceText: item.note ?? item.title,
        sourcePostId: item.sourcePostId,
      }),
    });
    await patchStatus(item.id, "ordered");
  }

  async function addToWishlist(input: {
    title: string;
    forMemberId: string;
    note?: string;
    sourcePostId?: string;
    estimatedTotal?: number;
  }) {
    setBusyId("add");
    await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        authorId: me.id,
        forMemberId: input.forMemberId,
        title: input.title,
        note: input.note,
        sourcePostId: input.sourcePostId,
        estimatedTotal: input.estimatedTotal,
      }),
    });
    setBusyId(null);
    setShowAdd(false);
    setNewTitle("");
    setNewNote("");
    router.refresh();
  }

  async function orderFromChat(postId: string, suggestion: CommerceSuggestion) {
    setBusyId(postId);
    const res = await fetch("/api/commerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        familyId,
        authorId: me.id,
        recipientId: suggestion.recipientId,
        kind: suggestion.kind,
        title: suggestion.title,
        sourceText: suggestion.sourceText,
        sourcePostId: postId,
      }),
    });
    const data = (await res.json()) as { message?: string };
    const message = data.message;
    if (message) setChatOrders((prev) => ({ ...prev, [postId]: { message } }));
    setBusyId(null);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className={`font-semibold text-ink ${easy ? "text-2xl" : "text-xl"}`}>Shopping</h1>
      <p className="mt-1 text-sm text-mute">
        Family wishlist, needs from chat, and recent purchases. Posting as {me.name.split(" ")[0]}.
      </p>

      <section className="mt-6" aria-labelledby="family-wishlist">
        <div className="flex items-center justify-between gap-3">
          <h2 id="family-wishlist" className="text-sm font-medium text-mute">
            Family wishlist ({open.length})
          </h2>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="text-sm font-medium text-ember hover:text-ember-dark"
          >
            {showAdd ? "Cancel" : "+ Add item"}
          </button>
        </div>

        {showAdd ? (
          <form
            className="mt-3 space-y-3 border border-ember/30 bg-ember/5 px-4 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTitle.trim()) return;
              void addToWishlist({ title: newTitle.trim(), forMemberId: newFor, note: newNote.trim() || undefined });
            }}
          >
            <div>
              <label htmlFor="wl-title" className="text-xs font-medium text-mute">What do you want?</label>
              <input
                id="wl-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Wireless earbuds"
                className="mt-1 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="wl-for" className="text-xs font-medium text-mute">For who?</label>
              <select
                id="wl-for"
                value={newFor}
                onChange={(e) => setNewFor(e.target.value)}
                className="mt-1 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="wl-note" className="text-xs font-medium text-mute">Note (optional)</label>
              <input
                id="wl-note"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Size, color, occasion…"
                className="mt-1 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm text-ink"
              />
            </div>
            <button
              type="submit"
              disabled={busyId === "add" || !newTitle.trim()}
              className="rounded-sm bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember-dark disabled:opacity-50"
            >
              {busyId === "add" ? "Adding…" : "Add to wishlist"}
            </button>
          </form>
        ) : null}

        {open.length === 0 ? (
          <p className="mt-3 text-sm text-mute">
            No items on the wishlist yet. Add something above or save a need from chat.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {open.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                forName={nameById[item.forMemberId] ?? "someone"}
                busy={busyId === item.id}
                onOrder={() => void placeOrder(item)}
                easy={easy}
              />
            ))}
          </ul>
        )}
      </section>

      {chatSuggestions.length > 0 ? (
        <section className="mt-8" aria-labelledby="from-chat">
          <h2 id="from-chat" className="text-sm font-medium text-mute">
            From chat ({chatSuggestions.length})
          </h2>
          <p className="mt-1 text-xs text-mute">Needs detected when someone mentions buying or running out.</p>
          <ul className="mt-3 space-y-4">
            {chatSuggestions.map(({ post, suggestion }) => (
              <li key={post.id} className="border border-rule bg-surface px-4 py-3">
                <p className="text-xs text-mute">
                  {nameById[post.authorId]} in chat ·{" "}
                  <span className="italic">&ldquo;{post.body.slice(0, 80)}{post.body.length > 80 ? "…" : ""}&rdquo;</span>
                </p>
                <CommerceCard
                  suggestion={suggestion}
                  busy={busyId === post.id}
                  ordered={chatOrders[post.id] ?? null}
                  onOrder={() => void orderFromChat(post.id, suggestion)}
                />
                {!chatOrders[post.id] ? (
                  <button
                    type="button"
                    disabled={busyId === post.id}
                    onClick={() =>
                      void addToWishlist({
                        title: suggestion.title,
                        forMemberId: suggestion.recipientId,
                        note: suggestion.items.map((i) => i.name).join(", "),
                        sourcePostId: post.id,
                        estimatedTotal: suggestion.estimatedTotal,
                      })
                    }
                    className="mt-2 text-xs font-medium text-ember hover:text-ember-dark disabled:opacity-50"
                  >
                    Save to wishlist instead
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ordered.length > 0 ? (
        <section className="mt-8" aria-labelledby="ordered-items">
          <h2 id="ordered-items" className="text-sm font-medium text-mute">
            Ordered ({ordered.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {ordered.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                forName={nameById[item.forMemberId] ?? "someone"}
                orderedByName={item.orderedBy ? nameById[item.orderedBy] : undefined}
                busy={busyId === item.id}
                onOrder={() => {}}
                onMarkPurchased={() => void patchStatus(item.id, "purchased")}
                easy={easy}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {purchased.length > 0 ? (
        <section className="mt-8" aria-labelledby="purchased-items">
          <h2 id="purchased-items" className="text-sm font-medium text-mute">
            Purchased ({purchased.length})
          </h2>
          <ul className="mt-3 space-y-2">
            {purchased.map((item) => (
              <li key={item.id} className="text-sm text-mute">
                <span className="line-through">{item.title}</span>
                {" · "}
                For {nameById[item.forMemberId]}
                {item.orderedBy ? ` · by ${nameById[item.orderedBy]}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-[11px] text-mute">
        Demo only — no payment, card, or checkout. Orders are simulated and nothing is charged.
      </p>
    </div>
  );
}
