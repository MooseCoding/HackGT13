"use client";

import { FamilyCircleForm } from "@/components/family/FamilyCircleForm";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  return (
    <FamilyCircleForm
      defaultName={defaultName}
      redirectOnSuccess
      submitLabel="Continue to Hearth"
    />
  );
}
