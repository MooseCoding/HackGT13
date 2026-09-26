"use client";

import type { Address } from "@/lib/address";
import { emptyAddress } from "@/lib/address";
import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { id: string; label: string; address: Address };

const fieldClass =
  "mt-1 min-h-12 w-full rounded-lg border border-line px-3 text-base outline-none focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/30";

export function AddressFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: Address;
  onChange: (next: Address) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setSearching(true);
      setHint(null);
      try {
        const res = await fetch(`/api/address/search?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { suggestions?: Suggestion[]; error?: string };
        setSuggestions(json.suggestions ?? []);
        setOpen(true);
        if (json.error) setHint(json.error);
      } catch {
        setHint("Address search is unavailable right now.");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  function pick(s: Suggestion) {
    onChange({ ...emptyAddress(), ...s.address, country: s.address.country || value.country });
    setQuery(s.label);
    setOpen(false);
    setSuggestions([]);
    setHint(null);
  }

  function useMyLocation() {
    setHint(null);
    if (!navigator.geolocation) {
      setHint("This browser doesn’t support location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/address/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          const json = (await res.json()) as { address?: Address; label?: string; error?: string };
          if (!res.ok || !json.address) {
            setHint(json.error || "Couldn’t read that location.");
            return;
          }
          onChange({ ...emptyAddress(), ...json.address });
          setQuery(json.label || "");
          setOpen(false);
        } catch {
          setHint("Couldn’t look up that location.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setHint(err.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <div className="sm:col-span-2 space-y-3">
      <div ref={boxRef} className="relative">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-search`}>
            Address search
          </label>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="min-h-11 text-sm font-medium text-ember underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-60"
          >
            {locating ? "Getting location…" : "Use my location"}
          </button>
        </div>
        <input
          id={`${idPrefix}-search`}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          placeholder="Start typing a street or city…"
          className={fieldClass}
        />
        {searching ? <p className="mt-1 text-xs text-mute">Searching…</p> : null}
        {open && suggestions.length ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-paper shadow-md"
          >
            {suggestions.map((s) => (
              <li key={s.id} role="option">
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm leading-5 hover:bg-cream focus-visible:bg-cream focus-visible:outline-none"
                  onClick={() => pick(s)}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-street`}>
            Street address
          </label>
          <input
            id={`${idPrefix}-street`}
            name={`${idPrefix}-street`}
            autoComplete="street-address"
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="123 Peachtree St NE"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-apt`}>
            Apt / unit
          </label>
          <input
            id={`${idPrefix}-apt`}
            name={`${idPrefix}-apt`}
            autoComplete="address-line2"
            value={value.apt}
            onChange={(e) => onChange({ ...value, apt: e.target.value })}
            placeholder="Apt 4B"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-city`}>
            City
          </label>
          <input
            id={`${idPrefix}-city`}
            name={`${idPrefix}-city`}
            autoComplete="address-level2"
            value={value.city}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-state`}>
            State
          </label>
          <input
            id={`${idPrefix}-state`}
            name={`${idPrefix}-state`}
            autoComplete="address-level1"
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
            placeholder="GA"
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-zip`}>
            ZIP code
          </label>
          <input
            id={`${idPrefix}-zip`}
            name={`${idPrefix}-zip`}
            autoComplete="postal-code"
            inputMode="numeric"
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
            placeholder="30308"
            className={fieldClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm text-mute" htmlFor={`${idPrefix}-country`}>
            Country
          </label>
          <input
            id={`${idPrefix}-country`}
            name={`${idPrefix}-country`}
            autoComplete="country-name"
            value={value.country}
            onChange={(e) => onChange({ ...value, country: e.target.value })}
            className={fieldClass}
          />
        </div>
      </div>
      {hint ? (
        <p className="text-sm text-red-700" role="alert">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
