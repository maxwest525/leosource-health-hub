/* ================================================================== */
/*  ACA SUBSIDY SERVICE                                                */
/*  Calculates APTC (Advanced Premium Tax Credit) and net premiums     */
/*  using household inputs, FPL tables, and benchmark SLCSP logic.     */
/*                                                                     */
/*  This module is the SINGLE source of truth for subsidy math.        */
/*  No subsidy calculations should exist in UI components.             */
/* ================================================================== */

import {
  getFederalPovertyLevel,
  getIncomeAsFplPercent,
  getExpectedContributionRate,
  getCsrLevel,
  type CsrLevel,
} from "@/lib/subsidy-constants";
import {
  type SubsidyInputs,
  resolveAnnualIncome,
  validateSubsidyInputs,
} from "@/lib/subsidy-input-types";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

/** Eligibility warning that may block or limit subsidy */
export type EligibilityWarning = {
  type: "employer_coverage" | "medicare" | "medicaid" | "not_lawfully_present" | "income_below_medicaid" | "missing_inputs";
  message: string;
  /** If true, subsidy is forced to $0 */
  blocksSubsidy: boolean;
};

/** Full subsidy calculation result for a household */
export type SubsidyResult = {
  /** Whether the calculation could be performed */
  calculable: boolean;
  /** Annual household income used */
  annualIncome: number;
  /** Federal Poverty Level for this household size */
  fpl: number;
  /** Income as a percentage of FPL (e.g. 250 = 250% FPL) */
  fplPercent: number;
  /** Expected contribution rate as a decimal (e.g. 0.04 = 4%) */
  expectedContributionRate: number;
  /** Expected contribution percentage for display (e.g. 4.0) */
  expectedContributionPercent: number;
  /** Expected annual contribution (income × rate) */
  expectedAnnualContribution: number;
  /** Expected monthly contribution */
  expectedMonthlyContribution: number;
  /** Monthly benchmark premium (SLCSP for enrolling applicants) */
  benchmarkPremium: number | null;
  /** Whether a real benchmark was found or it's missing */
  benchmarkFound: boolean;
  /** Monthly APTC = max(0, benchmark - expected monthly contribution) */
  monthlyAptc: number;
  /** CSR level (only relevant for Silver plans) */
  csrLevel: CsrLevel;
  /** Any eligibility warnings */
  warnings: EligibilityWarning[];
  /** Human-readable summary */
  summary: string;
};

/** Per-plan subsidy-adjusted premium */
export type PlanSubsidyResult = {
  grossPremium: number;
  estimatedSubsidy: number;
  estimatedNetPremium: number;
};

/* ------------------------------------------------------------------ */
/*  ELIGIBILITY CHECKS                                                 */
/* ------------------------------------------------------------------ */

/**
 * Check eligibility flags and produce warnings.
 * Some warnings block the subsidy entirely.
 */
function checkEligibility(inputs: SubsidyInputs): EligibilityWarning[] {
  const warnings: EligibilityWarning[] = [];

  // Employer coverage → may block subsidy
  if (inputs.anyEmployerCoverage === true) {
    warnings.push({
      type: "employer_coverage",
      message: "One or more household members may have access to affordable employer coverage. " +
        "If the employer plan meets ACA affordability standards, those members are not eligible for premium tax credits.",
      blocksSubsidy: true,
    });
  }

  // Medicare → cannot get marketplace subsidy
  if (inputs.anyMedicareEligible === true) {
    warnings.push({
      type: "medicare",
      message: "Medicare-eligible individuals cannot receive marketplace premium tax credits. " +
        "They should enroll in Medicare instead.",
      blocksSubsidy: true,
    });
  }

  // Not lawfully present → not eligible for marketplace
  if (inputs.allLawfullyPresent === false) {
    warnings.push({
      type: "not_lawfully_present",
      message: "Only individuals who are lawfully present in the US and eligible for the marketplace " +
        "can receive premium tax credits.",
      blocksSubsidy: true,
    });
  }

  // Medicaid/CHIP → warning (may apply instead of marketplace)
  if (inputs.anyMedicaidEligible === true) {
    warnings.push({
      type: "medicaid",
      message: "Household members eligible for Medicaid or CHIP should enroll in those programs. " +
        "Medicaid-eligible individuals generally cannot receive marketplace premium tax credits.",
      blocksSubsidy: false, // Show warning but don't zero out — some household members may still qualify
    });
  }

  return warnings;
}

/* ------------------------------------------------------------------ */
/*  BENCHMARK (SLCSP) LOOKUP                                           */
/* ------------------------------------------------------------------ */

/**
 * Find the second-lowest-cost Silver plan (SLCSP) premium for the
 * enrolling applicants in the given area.
 *
 * The benchmark is the sum of SLCSP premiums for each enrolling member.
 * In a real implementation this would use age-rated premiums from the
 * Rate PUF. For now, we identify the SLCSP from the loaded plan data.
 *
 * @param silverPlans - All Silver-tier plans available in the area, with gross premiums
 * @param applicantCount - Number of people enrolling
 * @returns Monthly benchmark premium, or null if insufficient data
 */
export function findBenchmarkPremium(
  silverPlans: { premium: number; planName: string; hiosId?: string | null }[],
  applicantCount: number = 1
): { premium: number; planName: string } | null {
  if (silverPlans.length < 2) {
    // Need at least 2 Silver plans to identify the SLCSP
    return null;
  }

  // Step 1: Deduplicate by base plan ID (first 14 chars of HIOS ID)
  //   Different variants of the same plan should only count once
  const uniquePlanMap = new Map<string, { premium: number; planName: string }>();
  for (const plan of silverPlans) {
    const baseId = plan.hiosId ? plan.hiosId.substring(0, 14) : plan.planName;
    const existing = uniquePlanMap.get(baseId);
    if (!existing || plan.premium < existing.premium) {
      uniquePlanMap.set(baseId, { premium: plan.premium, planName: plan.planName });
    }
  }

  // Step 2: Sort unique plans by premium ascending
  const sorted = [...uniquePlanMap.values()]
    .filter(p => p.premium > 0)
    .sort((a, b) => a.premium - b.premium);

  if (sorted.length < 2) return null;

  // Step 3: The SLCSP is the second-lowest
  const slcsp = sorted[1];

  // Step 4: For multiple applicants, multiply by applicant count
  //   (This is a simplification — real APTC uses age-rated premiums per member)
  return {
    premium: Math.round(slcsp.premium * applicantCount * 100) / 100,
    planName: slcsp.planName,
  };
}

/* ------------------------------------------------------------------ */
/*  MAIN SUBSIDY CALCULATION                                           */
/* ------------------------------------------------------------------ */

/**
 * Calculate the full subsidy (APTC) for a household.
 *
 * Flow:
 * 1. Validate inputs
 * 2. Convert monthly income to annual if needed
 * 3. Calculate FPL% from income and tax household size
 * 4. Determine expected contribution % from contribution table
 * 5. Calculate expected annual and monthly contribution
 * 6. Look up benchmark SLCSP premium
 * 7. APTC = max(0, benchmark - expected monthly contribution)
 * 8. Check eligibility flags
 *
 * @param inputs - Structured subsidy inputs from the intake form
 * @param silverPlans - Available Silver plans for benchmark calculation
 */
export function calculateSubsidy(
  inputs: SubsidyInputs,
  silverPlans: { premium: number; planName: string; hiosId?: string | null }[]
): SubsidyResult {
  // ── Step 1: Validate inputs ──
  const validation = validateSubsidyInputs(inputs);
  if (!validation.valid) {
    return {
      calculable: false,
      annualIncome: 0,
      fpl: 0,
      fplPercent: 0,
      expectedContributionRate: 0,
      expectedContributionPercent: 0,
      expectedAnnualContribution: 0,
      expectedMonthlyContribution: 0,
      benchmarkPremium: null,
      benchmarkFound: false,
      monthlyAptc: 0,
      csrLevel: "none",
      warnings: [{
        type: "missing_inputs",
        message: `Missing required information: ${validation.errors.join("; ")}`,
        blocksSubsidy: true,
      }],
      summary: "Unable to estimate subsidy — required information is missing.",
    };
  }

  // ── Step 2: Resolve annual income ──
  const annualIncome = resolveAnnualIncome(inputs) ?? 0;

  // ── Step 3: Calculate FPL% ──
  const fpl = getFederalPovertyLevel(inputs.taxHouseholdSize, inputs.coverageYear);
  const fplPercent = getIncomeAsFplPercent(annualIncome, inputs.taxHouseholdSize, inputs.coverageYear);
  const fplPercentRounded = Math.round(fplPercent);

  // ── Step 4: Check eligibility ──
  const warnings = checkEligibility(inputs);
  const hasBlockingWarning = warnings.some(w => w.blocksSubsidy);

  // Below 100% FPL → likely Medicaid eligible
  if (fplPercentRounded < 100) {
    warnings.push({
      type: "income_below_medicaid",
      message: "Your household income is below 100% of the Federal Poverty Level. " +
        "You may qualify for Medicaid. Contact your state Medicaid office for details.",
      blocksSubsidy: false,
    });
  }

  // ── Step 5: Expected contribution % ──
  const expectedContributionRate = getExpectedContributionRate(fplPercent);
  const expectedContributionPercent = Math.round(expectedContributionRate * 1000) / 10; // e.g. 4.0

  // ── Step 6: Expected contribution amounts ──
  const expectedAnnualContribution = Math.round(annualIncome * expectedContributionRate * 100) / 100;
  const expectedMonthlyContribution = Math.round((expectedAnnualContribution / 12) * 100) / 100;

  // ── Step 7: Benchmark SLCSP lookup ──
  const benchmark = findBenchmarkPremium(silverPlans, inputs.applicantCount);
  const benchmarkPremium = benchmark?.premium ?? null;
  const benchmarkFound = benchmark !== null;

  // ── Step 8: Calculate APTC ──
  let monthlyAptc = 0;
  if (benchmarkFound && benchmarkPremium !== null && !hasBlockingWarning) {
    // APTC = max(0, benchmark premium - expected monthly contribution)
    monthlyAptc = Math.max(0, Math.round((benchmarkPremium - expectedMonthlyContribution) * 100) / 100);
  }

  // If blocked by eligibility, force APTC to 0
  if (hasBlockingWarning) {
    monthlyAptc = 0;
  }

  // ── Step 9: CSR level ──
  const csrLevel = getCsrLevel(fplPercent);

  // ── Build summary ──
  let summary: string;
  if (hasBlockingWarning) {
    summary = "Based on your eligibility responses, premium tax credits may not apply. " +
      "Plans are shown at full price. Speak with a licensed agent to confirm.";
  } else if (!benchmarkFound) {
    summary = "We could not identify a benchmark Silver plan for your area. " +
      "Premiums are shown at full price. A licensed agent can calculate your exact subsidy.";
  } else if (monthlyAptc > 0) {
    summary = `Based on your household information, you may qualify for approximately $${monthlyAptc.toFixed(0)}/mo ` +
      `in premium tax credits (APTC). Your estimated net premiums are shown below.`;
  } else {
    summary = "Based on your household information, standard marketplace pricing is likely to apply.";
  }

  return {
    calculable: true,
    annualIncome,
    fpl,
    fplPercent: fplPercentRounded,
    expectedContributionRate,
    expectedContributionPercent,
    expectedAnnualContribution,
    expectedMonthlyContribution,
    benchmarkPremium,
    benchmarkFound,
    monthlyAptc,
    csrLevel,
    warnings,
    summary,
  };
}

/* ------------------------------------------------------------------ */
/*  PER-PLAN NET PREMIUM                                               */
/* ------------------------------------------------------------------ */

/**
 * Calculate the net premium for a single plan after applying APTC.
 *
 * Net premium = max(0, gross premium - APTC)
 * The APTC can be applied to any metal tier, not just Silver.
 */
export function calculatePlanNetPremium(
  grossPremium: number,
  monthlyAptc: number
): PlanSubsidyResult {
  const subsidy = Math.min(monthlyAptc, grossPremium); // Can't exceed gross
  const netPremium = Math.max(0, Math.round((grossPremium - subsidy) * 100) / 100);

  return {
    grossPremium: Math.round(grossPremium * 100) / 100,
    estimatedSubsidy: Math.round(subsidy * 100) / 100,
    estimatedNetPremium: netPremium,
  };
}
