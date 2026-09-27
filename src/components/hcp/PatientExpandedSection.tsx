"use client";

import { useState } from "react";

export function PatientExpandedSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mt-5 overflow-hidden border border-line bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-ground"
      >
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-mute">{description}</p>
        </div>
        <span
          className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-ground text-mute"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {expanded ? <div className="border-t border-line">{children}</div> : null}
    </section>
  );
}
