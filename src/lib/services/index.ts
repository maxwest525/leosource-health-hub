/**
 * Health Coverage Platform — Service Layer
 *
 * Modular services organized by data domain:
 *
 *   provider-service   → Provider search, network matching
 *   medication-service  → Medication search, formulary coverage
 *   plan-service        → Plan search, filtering, details
 *   match-engine        → Scoring, weighting, audit trail
 *   data-import-service → Batch ingestion for all domains
 *
 * Each service owns its source-of-truth tables and exposes
 * typed functions for the consumer UI, AI concierge, and
 * admin dashboard.
 */

export { searchProviders, checkProviderNetwork, calculateDoctorMatchScore } from "./provider-service";
export { searchMedications, getFormularyCoverage, calculateRxMatchScore } from "./medication-service";
export { searchPlans, getPlanDetails } from "./plan-service";
export { scorePlan, saveMatchResults } from "./match-engine";
export { startImport, completeImport, importCarriers, importProviders, importMedications } from "./data-import-service";
export { calculateSubsidy, calculatePlanNetPremium, findBenchmarkPremium } from "./subsidy-service";
