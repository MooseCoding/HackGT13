import type { Member, MemberInsurance } from "@/lib/types";

export const DEMO_CLINICIAN_ID = "demo-pcp";

export type InsuranceCarrier = {
  id: string;
  name: string;
  planTypes: string[];
};

export type ClinicianNetworkProfile = {
  id: string;
  name: string;
  specialty: string;
  acceptedCarrierIds: string[];
};

/** Demo payers — not a real eligibility check. */
export const INSURANCE_CARRIERS: InsuranceCarrier[] = [
  { id: "bcbs", name: "Blue Cross Blue Shield", planTypes: ["PPO", "HMO"] },
  { id: "medicare", name: "Medicare", planTypes: ["Original", "Advantage"] },
  { id: "uhc", name: "UnitedHealthcare", planTypes: ["PPO", "Medicare Advantage"] },
  { id: "aetna", name: "Aetna", planTypes: ["PPO", "HMO"] },
  { id: "cigna", name: "Cigna", planTypes: ["PPO", "Open Access"] },
  { id: "humana", name: "Humana", planTypes: ["Medicare Advantage", "PPO"] },
];

export const DEMO_CLINICIANS: ClinicianNetworkProfile[] = [
  {
    id: DEMO_CLINICIAN_ID,
    name: "Dr. Sarah Chen",
    specialty: "Primary care",
    acceptedCarrierIds: ["bcbs", "medicare", "uhc"],
  },
  {
    id: "demo-pcp-2",
    name: "Dr. Marcus Webb",
    specialty: "Geriatrics",
    acceptedCarrierIds: ["aetna", "cigna", "humana", "medicare"],
  },
  {
    id: "demo-pcp-3",
    name: "Dr. Priya Nair",
    specialty: "Family medicine",
    acceptedCarrierIds: ["bcbs", "aetna", "uhc"],
  },
];

export function carrierById(carrierId: string) {
  return INSURANCE_CARRIERS.find((carrier) => carrier.id === carrierId);
}

export function carrierLabel(insurance?: MemberInsurance) {
  if (!insurance?.carrierId) return null;
  return carrierById(insurance.carrierId)?.name ?? insurance.carrierId;
}

export function clinicianAcceptsInsurance(
  clinician: ClinicianNetworkProfile,
  insurance?: MemberInsurance,
) {
  if (!insurance?.carrierId) return false;
  return clinician.acceptedCarrierIds.includes(insurance.carrierId);
}

export function inNetworkCliniciansForInsurance(insurance?: MemberInsurance) {
  if (!insurance?.carrierId) return [];
  return DEMO_CLINICIANS.filter((clinician) => clinicianAcceptsInsurance(clinician, insurance));
}

export function isPatientInClinicianNetwork(
  clinicianId: string,
  member: Pick<Member, "insurance">,
) {
  const clinician = DEMO_CLINICIANS.find((candidate) => candidate.id === clinicianId);
  if (!clinician) return false;
  return clinicianAcceptsInsurance(clinician, member.insurance);
}

export function clinicianNetworkProfile(clinicianId: string) {
  return DEMO_CLINICIANS.find((clinician) => clinician.id === clinicianId) ?? DEMO_CLINICIANS[0];
}
