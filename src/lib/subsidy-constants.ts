/* ================================================================== */
/*  ACA SUBSIDY CONSTANTS — 2026 Coverage Year                        */
/*  FPL guidelines, expected contribution percentages, and CSR info   */
/*  Update these annually when HHS publishes new poverty guidelines   */
/* ================================================================== */

/**
 * Federal Poverty Level (FPL) guidelines for the continental US.
 * Alaska and Hawaii have higher thresholds — add those if needed.
 * Source: HHS Poverty Guidelines (projected for 2026).
 */
export const FPL_2026 = {
  coverageYear: 2026,
  /** Base amount for a 1-person household */
  baseAmount: 15_650,
  /** Additional amount per person beyond the first */
  perAdditionalPerson: 5_530,
} as const;

/**
 * Get the Federal Poverty Level for a given household size.
 * Uses the tax household size (everyone on the tax return).
 */
export function getFederalPovertyLevel(
  householdSize: number,
  year: number = 2026
): number {
  // Currently only 2026 is supported; extend with a lookup map later
  if (year !== 2026) {
    console.warn(`[SubsidyConstants] FPL data for ${year} not available, using 2026`);
  }
  const size = Math.max(1, Math.round(householdSize));
  return FPL_2026.baseAmount + FPL_2026.perAdditionalPerson * (size - 1);
}

/**
 * Calculate household income as a percentage of FPL.
 */
export function getIncomeAsFplPercent(
  annualIncome: number,
  householdSize: number,
  year: number = 2026
): number {
  const fpl = getFederalPovertyLevel(householdSize, year);
  if (fpl <= 0) return 0;
  return (annualIncome / fpl) * 100;
}

/* ------------------------------------------------------------------ */
/*  EXPECTED CONTRIBUTION PERCENTAGES                                  */
/*  Under the ACA (extended by ARP/IRA through 2025, assumed extended  */
/*  to 2026), enrollees pay a capped % of income toward the benchmark  */
/*  silver plan. The APTC covers the rest.                             */
/*                                                                     */
/*  The table below uses linear interpolation within each band.        */
/*  Source: IRS Rev Proc / CMS guidance (projected for 2026).          */
/* ------------------------------------------------------------------ */

type ContributionBand = {
  /** Lower bound of FPL% (inclusive) */
  fplFloor: number;
  /** Upper bound of FPL% (exclusive, except last band) */
  fplCeiling: number;
  /** Contribution % of income at the floor */
  rateAtFloor: number;
  /** Contribution % of income at the ceiling */
  rateAtCeiling: number;
};

/**
 * ARP/IRA-era contribution schedule (assumed extended for 2026).
 * Below 150% FPL: $0 contribution (rate = 0%).
 * 150–200%: 0% → 2.0%
 * 200–250%: 2.0% → 4.0%
 * 250–300%: 4.0% → 6.0%
 * 300–400%: 6.0% → 8.5%
 * Above 400%: capped at 8.5% (ARP/IRA extension).
 */
export const CONTRIBUTION_BANDS_2026: ContributionBand[] = [
  { fplFloor: 0,   fplCeiling: 150, rateAtFloor: 0,    rateAtCeiling: 0 },
  { fplFloor: 150, fplCeiling: 200, rateAtFloor: 0,    rateAtCeiling: 2.0 },
  { fplFloor: 200, fplCeiling: 250, rateAtFloor: 2.0,  rateAtCeiling: 4.0 },
  { fplFloor: 250, fplCeiling: 300, rateAtFloor: 4.0,  rateAtCeiling: 6.0 },
  { fplFloor: 300, fplCeiling: 400, rateAtFloor: 6.0,  rateAtCeiling: 8.5 },
  { fplFloor: 400, fplCeiling: Infinity, rateAtFloor: 8.5, rateAtCeiling: 8.5 },
];

/**
 * Get the expected contribution percentage of income for a given FPL%.
 * Uses linear interpolation within each band.
 * Returns a decimal (e.g., 0.04 for 4%).
 */
export function getExpectedContributionRate(fplPercent: number): number {
  // Below 100% FPL → likely Medicaid, no marketplace subsidy
  if (fplPercent < 100) return 0;

  for (const band of CONTRIBUTION_BANDS_2026) {
    if (fplPercent >= band.fplFloor && fplPercent < band.fplCeiling) {
      // Linear interpolation within the band
      const range = band.fplCeiling - band.fplFloor;
      const position = range > 0 ? (fplPercent - band.fplFloor) / range : 0;
      const rate = band.rateAtFloor + position * (band.rateAtCeiling - band.rateAtFloor);
      return rate / 100; // convert percentage to decimal
    }
  }

  // Above all bands — cap at 8.5%
  return 0.085;
}

/* ------------------------------------------------------------------ */
/*  CSR (Cost-Sharing Reduction) THRESHOLDS                            */
/*  CSR is available only with Silver plans.                           */
/* ------------------------------------------------------------------ */

export type CsrLevel = "csr-94" | "csr-87" | "csr-73" | "none";

/**
 * Determine the CSR variant a household qualifies for.
 * CSR only applies to Silver plans on the marketplace.
 */
export function getCsrLevel(fplPercent: number): CsrLevel {
  if (fplPercent >= 100 && fplPercent <= 150) return "csr-94";
  if (fplPercent > 150 && fplPercent <= 200) return "csr-87";
  if (fplPercent > 200 && fplPercent <= 250) return "csr-73";
  return "none";
}

export function getCsrLabel(level: CsrLevel): string {
  switch (level) {
    case "csr-94": return "94% AV Silver (Enhanced)";
    case "csr-87": return "87% AV Silver (Enhanced)";
    case "csr-73": return "73% AV Silver (Enhanced)";
    case "none": return "Standard";
  }
}

/* ------------------------------------------------------------------ */
/*  SUBSIDY DISCLAIMER                                                 */
/* ------------------------------------------------------------------ */

export const SUBSIDY_DISCLAIMER =
  "Subsidy estimates are based on projected 2026 Federal Poverty Level guidelines and ARP/IRA contribution schedules. " +
  "Actual premium tax credit amounts are determined during enrollment based on your exact income, household composition, " +
  "and the second-lowest-cost Silver plan (benchmark) in your area. A licensed agent can help you understand your options.";
