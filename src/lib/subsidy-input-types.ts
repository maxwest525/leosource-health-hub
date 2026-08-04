/* ================================================================== */
/*  SUBSIDY INPUT TYPES                                                */
/*  Structured object capturing all data needed for ACA subsidy calc   */
/* ================================================================== */

export type ApplicantMember = {
  age: number | null;
  isTobaccoUser: boolean;
};

export type SubsidyInputs = {
  // Location
  zip: string;
  county: string;
  state: string;
  coverageYear: number;

  // Household
  totalHouseholdSize: number;
  taxHouseholdSize: number;
  applicantCount: number;
  applicants: ApplicantMember[];
  annualHouseholdIncome: number | null;
  incomeFrequency: "annual" | "monthly";

  // Eligibility screening
  allHouseholdApplying: boolean | null;
  anyEmployerCoverage: boolean | null;
  anyMedicareEligible: boolean | null;
  anyMedicaidEligible: boolean | null;
  allLawfullyPresent: boolean | null;
  anyTobaccoUse: boolean;
};

export const EMPTY_SUBSIDY_INPUTS: SubsidyInputs = {
  zip: "",
  county: "",
  state: "",
  coverageYear: 2026,

  totalHouseholdSize: 1,
  taxHouseholdSize: 1,
  applicantCount: 1,
  applicants: [{ age: null, isTobaccoUser: false }],
  annualHouseholdIncome: null,
  incomeFrequency: "annual",

  allHouseholdApplying: null,
  anyEmployerCoverage: null,
  anyMedicareEligible: null,
  anyMedicaidEligible: null,
  allLawfullyPresent: null,
  anyTobaccoUse: false,
};

/** Validate that subsidy inputs are complete enough for calculation */
export function validateSubsidyInputs(inputs: SubsidyInputs): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!inputs.zip || inputs.zip.length !== 5) errors.push("Valid 5-digit ZIP code required");
  if (!inputs.state) errors.push("State is required");
  if (inputs.totalHouseholdSize < 1) errors.push("Household size must be at least 1");
  if (inputs.taxHouseholdSize < 1) errors.push("Tax household size must be at least 1");
  if (inputs.applicantCount < 1) errors.push("At least one person must be applying");
  if (inputs.applicantCount > inputs.totalHouseholdSize) errors.push("People applying cannot exceed total household size");
  if (inputs.applicantCount > inputs.taxHouseholdSize) errors.push("People applying cannot exceed tax household size");

  for (let i = 0; i < inputs.applicantCount; i++) {
    const a = inputs.applicants[i];
    if (!a || a.age === null || a.age < 0 || a.age > 120) {
      errors.push(`Age required for applicant ${i + 1}`);
    }
  }

  if (inputs.annualHouseholdIncome === null || inputs.annualHouseholdIncome < 0) {
    errors.push("Annual household income required");
  }

  return { valid: errors.length === 0, errors };
}

/** Convert monthly income to annual if needed */
export function resolveAnnualIncome(inputs: SubsidyInputs): number | null {
  if (inputs.annualHouseholdIncome === null) return null;
  return inputs.incomeFrequency === "monthly"
    ? inputs.annualHouseholdIncome * 12
    : inputs.annualHouseholdIncome;
}
