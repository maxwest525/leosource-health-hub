import { supabase } from "@/integrations/supabase/client";
import { searchDrugs as cmsSearchDrugs } from "@/lib/cms";

/* ================================================================== */
/*  MEDICATION SERVICE                                                  */
/*  Source of truth: live CMS Marketplace drug index (RxNorm)            */
/*  Formulary joins still come from the staged formularies table.        */
/* ================================================================== */

export type MedicationResult = {
  id: string;
  genericName: string;
  brandName: string | null;
  form: string | null;
  dosage: string | null;
  isGeneric: boolean;
  therapeuticClass: string | null;
  dataConfidence: string;
};

export type FormularyEntry = {
  planId: string;
  carrierId: string;
  tier: number | null;
  tierLabel: string | null;
  requiresPriorAuth: boolean;
  requiresStepTherapy: boolean;
  quantityLimit: boolean;
  mailOrderAvailable: boolean | null;
  isCovered: boolean;
  coverageNotes: string | null;
  dataConfidence: string;
};

export type MedicationSearchParams = {
  query: string;
  isGeneric?: boolean;
  therapeuticClass?: string;
  limit?: number;
};

/**
 * Search medications against the live CMS Marketplace RxNorm autocomplete.
 * Falls back to the staged medications table if the lookup is unavailable.
 */
export async function searchMedications(params: MedicationSearchParams): Promise<MedicationResult[]> {
  const { query, isGeneric, therapeuticClass, limit = 20 } = params;

  if (query.trim().length >= 2) {
    try {
      const drugs = await cmsSearchDrugs(query.trim());
      if (drugs.length > 0) {
        return drugs.slice(0, limit).map((drug) => ({
          id: drug.rxcui,
          genericName: drug.name,
          brandName: drug.full_name && drug.full_name !== drug.name ? drug.full_name : null,
          form: drug.route ?? null,
          dosage: drug.strength ?? null,
          isGeneric: true,
          therapeuticClass: null,
          dataConfidence: "verified",
        }));
      }
    } catch (error) {
      console.error("[MedicationService] CMS lookup failed, falling back to staged data", error);
    }
  }

  let q = supabase
    .from("medications")
    .select("*")
    .eq("is_active", true)
    .or(`generic_name.ilike.%${query}%,brand_name.ilike.%${query}%`)
    .limit(limit);

  if (isGeneric !== undefined) q = q.eq("is_generic", isGeneric);
  if (therapeuticClass) q = q.ilike("therapeutic_class", `%${therapeuticClass}%`);

  const { data, error } = await q;

  if (error) {
    console.error("[MedicationService] search error:", error);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.id,
    genericName: m.generic_name,
    brandName: m.brand_name,
    form: m.form,
    dosage: m.dosage,
    isGeneric: m.is_generic,
    therapeuticClass: m.therapeutic_class,
    dataConfidence: m.data_confidence || "staged",
  }));
}


/**
 * Get formulary coverage for a medication across plans.
 */
export async function getFormularyCoverage(
  medicationId: string,
  planIds?: string[]
): Promise<FormularyEntry[]> {
  let q = supabase
    .from("formularies")
    .select("*")
    .eq("medication_id", medicationId);

  if (planIds && planIds.length > 0) {
    q = q.in("plan_id", planIds);
  }

  const { data, error } = await q;

  if (error) {
    console.error("[MedicationService] formulary error:", error);
    return [];
  }

  return (data || []).map((f: any) => ({
    planId: f.plan_id,
    carrierId: f.carrier_id,
    tier: f.tier,
    tierLabel: f.tier_label,
    requiresPriorAuth: f.requires_prior_auth,
    requiresStepTherapy: f.requires_step_therapy,
    quantityLimit: f.quantity_limit,
    mailOrderAvailable: f.mail_order_available,
    isCovered: f.is_covered,
    coverageNotes: f.coverage_notes,
    dataConfidence: f.data_confidence || "staged",
  }));
}

/**
 * Calculate prescription match score for a list of medication IDs against a plan.
 * Returns 0–100 based on how many are covered.
 */
export async function calculateRxMatchScore(
  medicationIds: string[],
  planId: string
): Promise<{ score: number; covered: string[]; uncovered: string[]; confidence: string }> {
  if (medicationIds.length === 0) return { score: 0, covered: [], uncovered: [], confidence: "none" };

  const { data } = await supabase
    .from("formularies")
    .select("medication_id, is_covered, data_confidence")
    .eq("plan_id", planId)
    .in("medication_id", medicationIds)
    .eq("is_covered", true);

  const coveredIds = new Set((data || []).map((d: any) => d.medication_id));
  const covered = medicationIds.filter(id => coveredIds.has(id));
  const uncovered = medicationIds.filter(id => !coveredIds.has(id));

  const worstConfidence = (data || []).reduce(
    (worst: string, d: any) => (d.data_confidence === "staged" ? "staged" : worst),
    "verified"
  );

  return {
    score: Math.round((covered.length / medicationIds.length) * 100),
    covered,
    uncovered,
    confidence: data?.length ? worstConfidence : "staged",
  };
}
