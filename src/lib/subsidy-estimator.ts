/* ------------------------------------------------------------------ */
/*  FPL-BASED SUBSIDY ESTIMATOR (2026 Guideline Approximation)         */
/*  This is informational only — not a guarantee of actual subsidy.    */
/* ------------------------------------------------------------------ */

// 2026 Federal Poverty Level guidelines (estimated, continental US)
// HHS typically publishes updated FPL annually; these are projections.
const FPL_BASE = 15_650; // 1-person household
const FPL_PER_ADDITIONAL = 5_530; // each additional person

export type IncomeRange =
  | "0-25000"
  | "25000-50000"
  | "50000-75000"
  | "75000-100000"
  | "100000+";

export const INCOME_RANGES: { value: IncomeRange; label: string }[] = [
  { value: "0-25000", label: "$0 – $25,000" },
  { value: "25000-50000", label: "$25,000 – $50,000" },
  { value: "50000-75000", label: "$50,000 – $75,000" },
  { value: "75000-100000", label: "$75,000 – $100,000" },
  { value: "100000+", label: "$100,000+" },
];

function incomeMidpoint(range: IncomeRange): number {
  switch (range) {
    case "0-25000": return 12_500;
    case "25000-50000": return 37_500;
    case "50000-75000": return 62_500;
    case "75000-100000": return 87_500;
    case "100000+": return 125_000;
  }
}

function getFPL(householdSize: number): number {
  return FPL_BASE + FPL_PER_ADDITIONAL * Math.max(0, householdSize - 1);
}

export interface SubsidyEstimate {
  eligible: boolean;
  fplPercent: number;
  estimatedMonthlyMin: number;
  estimatedMonthlyMax: number;
  message: string;
}

/**
 * Estimate whether a household may qualify for ACA premium tax credits.
 * Eligibility: income between ~100%–400% FPL (extended under ARP/IRA).
 * Returns a rough monthly savings range — NOT a binding calculation.
 */
export function estimateSubsidy(
  householdSize: number,
  incomeRange: IncomeRange
): SubsidyEstimate {
  const fpl = getFPL(Math.max(1, householdSize));
  const income = incomeMidpoint(incomeRange);
  const fplPercent = Math.round((income / fpl) * 100);

  // Below 100% FPL → may qualify for Medicaid, not marketplace subsidy
  if (fplPercent < 100) {
    return {
      eligible: false,
      fplPercent,
      estimatedMonthlyMin: 0,
      estimatedMonthlyMax: 0,
      message: "Your household may qualify for Medicaid. Contact your state's Medicaid office for details.",
    };
  }

  // 100–150% FPL → highest subsidies
  if (fplPercent <= 150) {
    return {
      eligible: true,
      fplPercent,
      estimatedMonthlyMin: 400,
      estimatedMonthlyMax: 700,
      message: `You may qualify for significant premium savings — an estimated $400–$700/mo in tax credits.`,
    };
  }

  // 150–200% FPL
  if (fplPercent <= 200) {
    return {
      eligible: true,
      fplPercent,
      estimatedMonthlyMin: 250,
      estimatedMonthlyMax: 500,
      message: `You may qualify for an estimated $250–$500/mo in premium tax credits.`,
    };
  }

  // 200–250% FPL
  if (fplPercent <= 250) {
    return {
      eligible: true,
      fplPercent,
      estimatedMonthlyMin: 150,
      estimatedMonthlyMax: 350,
      message: `You may qualify for an estimated $150–$350/mo in premium tax credits.`,
    };
  }

  // 250–300% FPL
  if (fplPercent <= 300) {
    return {
      eligible: true,
      fplPercent,
      estimatedMonthlyMin: 75,
      estimatedMonthlyMax: 200,
      message: `You may qualify for an estimated $75–$200/mo in premium tax credits.`,
    };
  }

  // 300–400% FPL
  if (fplPercent <= 400) {
    return {
      eligible: true,
      fplPercent,
      estimatedMonthlyMin: 25,
      estimatedMonthlyMax: 100,
      message: `You may qualify for modest premium assistance — an estimated $25–$100/mo.`,
    };
  }

  // Above 400% FPL — under ARP/IRA extension, still capped at 8.5% of income
  // but estimate is minimal or zero
  return {
    eligible: false,
    fplPercent,
    estimatedMonthlyMin: 0,
    estimatedMonthlyMax: 0,
    message: "Based on your household information, standard marketplace pricing is likely to apply.",
  };
}

export const SUBSIDY_DISCLAIMER =
  "This is an estimate only. Actual subsidy amounts are determined during enrollment based on your exact income, household, and plan selection. A licensed agent can help you understand your options.";
