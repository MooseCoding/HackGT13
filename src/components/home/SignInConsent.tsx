"use client";

import {
  FAMILY_CALL_FREQUENCY_OPTIONS,
  type FamilyCallFrequency,
} from "@/lib/family-call-frequency";

export function SignInConsent({
  generalAccepted,
  healthcareAccepted,
  familyCallFrequency,
  onGeneralChange,
  onHealthcareChange,
  onFamilyCallFrequencyChange,
}: {
  generalAccepted: boolean;
  healthcareAccepted: boolean;
  familyCallFrequency: FamilyCallFrequency;
  onGeneralChange: (value: boolean) => void;
  onHealthcareChange: (value: boolean) => void;
  onFamilyCallFrequencyChange: (value: FamilyCallFrequency) => void;
}) {
  return (
    <div className="mt-4 space-y-3 text-sm leading-6 text-ink">
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={generalAccepted}
          onChange={(e) => onGeneralChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--ember)]"
          required
        />
        <span>
          I agree to Hearth&apos;s terms for family messaging, calendar suggestions, and storing the
          account details needed to run my circle.
        </span>
      </label>

      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={healthcareAccepted}
          onChange={(e) => onHealthcareChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--ember)]"
        />
        <span>
          Optional: share consented communication signals with my clinician view. Raw chats stay in
          the family circle.
        </span>
      </label>

      <label className="block">
        <span className="font-medium text-ink">Family call rhythm</span>
        <select
          value={familyCallFrequency}
          onChange={(e) => onFamilyCallFrequencyChange(e.target.value as FamilyCallFrequency)}
          className="mt-1 min-h-11 w-full rounded-sm border border-line bg-surface px-3 text-sm"
        >
          {FAMILY_CALL_FREQUENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-mute">
          We suggest open times that fit everyone&apos;s calendars. You can change this later.
        </span>
      </label>
    </div>
  );
}
