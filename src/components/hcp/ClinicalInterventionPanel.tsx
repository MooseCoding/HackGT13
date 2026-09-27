"use client";

import { directOutreachDraft } from "@/lib/clinical/outreach";
import type { PatientSnapshot } from "@/lib/types";
import { useState } from "react";

export function ClinicalInterventionPanel({
  patientFirstName,
  riskLevel,
}: {
  patientFirstName: string;
  riskLevel: PatientSnapshot["riskLevel"];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const draft = directOutreachDraft(patientFirstName, riskLevel);

  if (!draft) {
    return (
      <p className="rounded-sm border border-line bg-ground px-4 py-2.5 text-center text-sm text-mute">
        No outreach message suggested
      </p>
    );
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-sm border border-clinic bg-clinic px-4 py-2.5 text-sm font-semibold text-white hover:bg-clinic-dark"
      >
        {open ? "Hide draft" : "Contact patient"}
      </button>
      {open ? (
        <div className="w-full max-w-md border border-line bg-ground p-4 sm:text-right">
          <p className="text-xs font-semibold text-mute">Outreach draft</p>
          <p className="mt-2 text-left text-sm leading-6 text-ink">{draft}</p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={copyDraft}
              className="rounded-sm border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-ground"
            >
              {copied ? "Copied" : "Copy message"}
            </button>
          </div>
          <p className="mt-3 text-left text-[11px] leading-5 text-mute">
            Send through your clinic&apos;s approved channel. Family members won&apos;t be notified.
          </p>
        </div>
      ) : null}
    </div>
  );
}
