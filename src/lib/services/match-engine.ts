import { supabase } from "@/integrations/supabase/client";
import { calculateDoctorMatchScore } from "./provider-service";
import { calculateRxMatchScore } from "./medication-service";

/* ================================================================== */
/*  MATCH ENGINE                                                        */
/*  Combines provider, medication, and plan data into explainable       */
/*  match scores. Auditable and modular by design.                      */
/* ================================================================== */

export type MatchInput = {
  sessionId: string;
  leadId?: string;
  providerIds: string[];
  medicationIds: string[];
  budgetMax?: number;
  deductibleComfort?: "low" | "mid" | "high";
  priorities: string[];
};

export type PlanMatch = {
  planId: string;
  doctorScore: number;
  rxScore: number;
  premiumFitScore: number;
  deductibleFitScore: number;
  overallScore: number;
  tags: string[];
  explanation: Record<string, string>;
  confidence: string;
};

/**
 * Score a single plan against the user's profile.
 * Each dimension is 0–100, overall is a weighted blend.
 */
export async function scorePlan(
  planId: string,
  networkId: string | null,
  premium: number | null,
  deductible: number | null,
  input: MatchInput
): Promise<PlanMatch> {
  const tags: string[] = [];
  const explanation: Record<string, string> = {};

  // Doctor match
  let doctorScore = 0;
  let doctorConfidence = "none";
  if (input.providerIds.length > 0 && networkId) {
    const dr = await calculateDoctorMatchScore(input.providerIds, networkId);
    doctorScore = dr.score;
    doctorConfidence = dr.confidence;
    explanation.doctor = `${dr.matched.length}/${input.providerIds.length} providers found in network`;
    if (dr.score >= 80) tags.push("strong_doctor_match");
    if (dr.score > 0 && dr.score < 50) tags.push("weak_doctor_match");
  }

  // Rx match
  let rxScore = 0;
  let rxConfidence = "none";
  if (input.medicationIds.length > 0) {
    const rx = await calculateRxMatchScore(input.medicationIds, planId);
    rxScore = rx.score;
    rxConfidence = rx.confidence;
    explanation.rx = `${rx.covered.length}/${input.medicationIds.length} medications found on formulary`;
    if (rx.score >= 80) tags.push("strong_rx_match");
    if (rx.score > 0 && rx.score < 50) tags.push("weak_rx_match");
  }

  // Premium fit (inverse: lower premium = higher score within budget)
  let premiumFitScore = 50;
  if (premium != null && input.budgetMax) {
    if (premium <= input.budgetMax) {
      premiumFitScore = Math.round(100 - (premium / input.budgetMax) * 50);
      explanation.premium = `$${premium}/mo is within your $${input.budgetMax} budget`;
    } else {
      premiumFitScore = Math.max(0, Math.round(50 - ((premium - input.budgetMax) / input.budgetMax) * 100));
      explanation.premium = `$${premium}/mo exceeds your $${input.budgetMax} budget`;
      tags.push("over_budget");
    }
  }

  // Deductible fit
  let deductibleFitScore = 50;
  if (deductible != null && input.deductibleComfort) {
    const thresholds = { low: 1500, mid: 4000, high: 8000 };
    const comfort = thresholds[input.deductibleComfort];
    if (deductible <= comfort) {
      deductibleFitScore = Math.round(100 - (deductible / comfort) * 40);
      explanation.deductible = `$${deductible} deductible fits your comfort level`;
    } else {
      deductibleFitScore = Math.max(0, Math.round(40 - ((deductible - comfort) / comfort) * 80));
      explanation.deductible = `$${deductible} deductible is higher than preferred`;
      tags.push("high_deductible_risk");
    }
  }

  // Weighted overall score
  const weights = resolveWeights(input.priorities);
  const overallScore = Math.round(
    doctorScore * weights.doctor +
    rxScore * weights.rx +
    premiumFitScore * weights.premium +
    deductibleFitScore * weights.deductible
  );

  // Aggregate confidence
  const confidences = [doctorConfidence, rxConfidence].filter(c => c !== "none");
  const confidence = confidences.includes("staged") ? "staged" : confidences.length ? "verified" : "staged";

  if (overallScore >= 75) tags.push("top_match");
  if (overallScore >= 50 && overallScore < 75) tags.push("good_match");
  tags.push("needs_verification");

  return {
    planId,
    doctorScore,
    rxScore,
    premiumFitScore,
    deductibleFitScore,
    overallScore,
    tags,
    explanation,
    confidence,
  };
}

/**
 * Resolve scoring weights based on user priorities.
 */
function resolveWeights(priorities: string[]): {
  doctor: number; rx: number; premium: number; deductible: number;
} {
  const base = { doctor: 0.25, rx: 0.25, premium: 0.25, deductible: 0.25 };
  const lower = priorities.map(p => p.toLowerCase());

  if (lower.some(p => p.includes("doctor"))) { base.doctor = 0.40; base.premium = 0.20; base.deductible = 0.20; base.rx = 0.20; }
  if (lower.some(p => p.includes("prescription"))) { base.rx = 0.40; base.doctor = 0.20; base.premium = 0.20; base.deductible = 0.20; }
  if (lower.some(p => p.includes("premium") || p.includes("budget"))) { base.premium = 0.40; base.doctor = 0.20; base.rx = 0.20; base.deductible = 0.20; }
  if (lower.some(p => p.includes("deductible"))) { base.deductible = 0.40; base.doctor = 0.20; base.rx = 0.20; base.premium = 0.20; }

  return base;
}

/**
 * Save match results for auditability.
 */
export async function saveMatchResults(
  sessionId: string,
  leadId: string | null,
  matches: PlanMatch[]
) {
  const rows = matches.map(m => ({
    session_id: sessionId,
    lead_id: leadId,
    plan_id: m.planId,
    doctor_match_score: m.doctorScore,
    rx_match_score: m.rxScore,
    premium_fit_score: m.premiumFitScore,
    deductible_fit_score: m.deductibleFitScore,
    overall_score: m.overallScore,
    match_tags: m.tags,
    match_explanation: m.explanation,
    logic_version: "v1",
  }));

  const { error } = await supabase
    .from("recommendation_results")
    .insert(rows);

  if (error) console.error("[MatchEngine] save error:", error);
}
