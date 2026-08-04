import { supabase } from "@/integrations/supabase/client";
import {
  resolvePlace,
  searchPlans as cmsSearchPlans,
  type CmsPlan,
} from "@/lib/cms";

/* ================================================================== */
/*  PLAN SERVICE                                                      */
/*  Source of truth: live CMS Marketplace plan search when a ZIP is   */
/*  provided; staged plans/carriers/networks tables otherwise.        */
/* ================================================================== */


export type PlanResult = {
  id: string;
  carrierId: string;
  carrierName: string;
  carrierLogoUrl: string | null;
  networkId: string | null;
  planName: string;
  planCategory: string | null;
  metalTier: string | null;
  premiumIndividual: number | null;
  premiumFamily: number | null;
  deductibleIndividual: number | null;
  deductibleFamily: number | null;
  oopMaxIndividual: number | null;
  oopMaxFamily: number | null;
  copayPcp: number | null;
  copaySpecialist: number | null;
  copayEr: number | null;
  networkType: string | null;
  includesDental: boolean;
  includesVision: boolean;
  benefitsSummary: Record<string, unknown>;
  enrollmentStatus: string;
  dataConfidence: string;
  hiosId: string | null;
};

export type PlanSearchParams = {
  state?: string;
  zip?: string;
  category?: string;
  carrierId?: string;
  metalTier?: string;
  maxPremium?: number;
  maxDeductible?: number;
  networkType?: string;
  includesDental?: boolean;
  includesVision?: boolean;
  dataSource?: string;
  limit?: number;
  /** Household inputs used for live Marketplace pricing. */
  income?: number;
  ages?: number[];
  tobacco?: boolean[];
};

/** Normalize metal tier for display */
export function normalizeMetalTier(tier: string | null): string | null {
  if (!tier) return null;
  const lower = tier.toLowerCase().trim();
  if (lower === "expanded bronze" || lower === "bronze") return "Bronze";
  if (lower === "silver") return "Silver";
  if (lower === "gold") return "Gold";
  if (lower === "platinum") return "Platinum";
  if (lower === "catastrophic") return "Catastrophic";
  return tier;
}

const amountOf = (rows: Array<{ type: string; amount: number }> | undefined, type: string) =>
  rows?.find((row) => row.type === type)?.amount ?? rows?.[0]?.amount ?? null;

const copayOf = (plan: CmsPlan, benefitName: string): number | null => {
  const benefit = plan.benefits?.find((b) => b.name === benefitName);
  const sharing = benefit?.cost_sharings?.find((cs) => cs.network_tier === "In Network")
    ?? benefit?.cost_sharings?.[0];
  return sharing?.copay_amount ?? null;
};

/** Map a live Marketplace plan into the shared PlanResult shape. */
const mapCmsPlan = (plan: CmsPlan): PlanResult => ({
  id: plan.id,
  carrierId: plan.issuer?.id ?? plan.issuer?.name ?? "unknown",
  carrierName: plan.issuer?.name ?? "Unknown",
  carrierLogoUrl: null,
  networkId: null,
  planName: plan.name,
  planCategory: "Individual & Family",
  metalTier: normalizeMetalTier(plan.metal_level ?? null),
  premiumIndividual: plan.premium_w_credit ?? plan.premium ?? null,
  premiumFamily: plan.premium ?? null,
  deductibleIndividual: amountOf(plan.deductibles, "Medical EHB Deductible"),
  deductibleFamily: amountOf(plan.deductibles, "Medical EHB Deductible"),
  oopMaxIndividual: amountOf(plan.moops, "Maximum Out of Pocket for Medical EHB Benefits"),
  oopMaxFamily: amountOf(plan.moops, "Maximum Out of Pocket for Medical EHB Benefits"),
  copayPcp: copayOf(plan, "Primary Care Visit to Treat an Injury or Illness"),
  copaySpecialist: copayOf(plan, "Specialist Visit"),
  copayEr: copayOf(plan, "Emergency Room Services"),
  networkType: plan.type ?? null,
  includesDental: Boolean(plan.benefits?.some((b) => b.covered && b.name.includes("Dental"))),
  includesVision: Boolean(plan.benefits?.some((b) => b.covered && b.name.includes("Vision"))),
  benefitsSummary: {
    quality_rating: plan.quality_rating?.global_rating ?? null,
    hsa_eligible: plan.hsa_eligible ?? false,
    gross_premium: plan.premium ?? null,
    benefits_url: plan.benefits_url ?? null,
    brochure_url: plan.brochure_url ?? null,
    formulary_url: plan.formulary_url ?? null,
    network_url: plan.network_url ?? null,
  },
  enrollmentStatus: "available",
  dataConfidence: "verified",
  hiosId: plan.id.split("-")[0] ?? null,
});

/** Live Marketplace search. Returns null when the ZIP cannot be priced. */
async function searchPlansLive(params: PlanSearchParams): Promise<PlanResult[] | null> {
  const { zip, income = 50000, ages = [35], tobacco, limit = 50 } = params;
  if (!zip || !/^\d{5}$/.test(zip)) return null;

  const place = await resolvePlace(zip);
  if (!place) return null;

  const result = await cmsSearchPlans({
    place,
    income,
    people: ages.map((age, index) => ({
      age,
      aptc_eligible: true,
      uses_tobacco: tobacco?.[index] ?? false,
    })),
    limit: Math.min(limit, 100),
  });

  let plans = (result.plans ?? []).map(mapCmsPlan);

  if (params.metalTier) {
    const tier = normalizeMetalTier(params.metalTier)?.toLowerCase();
    plans = plans.filter((p) => p.metalTier?.toLowerCase() === tier);
  }
  if (params.networkType) {
    plans = plans.filter((p) => p.networkType?.toLowerCase() === params.networkType!.toLowerCase());
  }
  if (params.maxPremium != null) {
    plans = plans.filter((p) => (p.premiumIndividual ?? 0) <= params.maxPremium!);
  }
  if (params.maxDeductible != null) {
    plans = plans.filter((p) => (p.deductibleIndividual ?? 0) <= params.maxDeductible!);
  }

  return plans;
}

export async function searchPlans(params: PlanSearchParams): Promise<PlanResult[]> {
  const {
    limit = 5000,
    dataSource,
    ...filters
  } = params;

  // Prefer live 2026 Marketplace pricing whenever we can resolve the ZIP.
  try {
    const live = await searchPlansLive(params);
    if (live && live.length > 0) return live;
  } catch (error) {
    console.error("[PlanService] live Marketplace search failed, using staged data", error);
  }



  // Supabase caps at 1000 rows per request — paginate to get all results
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let offset = 0;

  while (allData.length < limit) {
    const batchSize = Math.min(PAGE_SIZE, limit - allData.length);
    let q = supabase
      .from("plans")
      .select("*, carriers(name, display_name, logo_url)")
      .eq("is_active", true)
      .range(offset, offset + batchSize - 1);

    if (dataSource) q = q.eq("data_source", dataSource);
    if (filters.category) q = q.ilike("plan_category", `%${filters.category}%`);
    if (filters.carrierId) q = q.eq("carrier_id", filters.carrierId);

    if (filters.metalTier) {
      const tier = filters.metalTier.toLowerCase();
      if (tier === "bronze") {
        q = q.or("metal_tier.ilike.bronze,metal_tier.ilike.expanded bronze");
      } else {
        q = q.ilike("metal_tier", tier);
      }
    }

    if (filters.networkType) q = q.ilike("network_type", filters.networkType);
    if (filters.maxPremium) q = q.lte("premium_individual", filters.maxPremium);
    if (filters.maxDeductible) q = q.lte("deductible_individual", filters.maxDeductible);
    if (filters.includesDental) q = q.eq("includes_dental", true);
    if (filters.includesVision) q = q.eq("includes_vision", true);
    if (filters.state) q = q.contains("service_area_states", [filters.state]);
    if (filters.zip) q = q.contains("service_area_zips", [filters.zip]);

    const { data, error } = await q;
    if (error) {
      console.error("[PlanService] search error:", error);
      break;
    }
    allData = allData.concat(data || []);
    if (!data || data.length < batchSize) break; // no more rows
    offset += batchSize;
  }

  const data = allData;
  const error = null;

  if (error) {
    console.error("[PlanService] search error:", error);
    return [];
  }

  return (data || []).map((p: any) => {
    const bs = (p.benefits_summary || {}) as Record<string, unknown>;

    const premiumIndividual = p.premium_individual ?? bs.premium_age_27 ?? null;
    const premiumFamily = p.premium_family ?? bs.premium_age_40 ?? null;
    const deductibleIndividual = p.deductible_individual ?? bs.deductible_individual ?? null;
    const deductibleFamily = p.deductible_family ?? bs.deductible_family ?? null;
    const oopMaxIndividual = p.oop_max_individual ?? bs.oop_max_individual ?? null;
    const oopMaxFamily = p.oop_max_family ?? bs.oop_max_family ?? null;
    const copayPcp = p.copay_pcp ?? bs.copay_pcp ?? null;
    const copaySpecialist = p.copay_specialist ?? bs.copay_specialist ?? null;
    const copayEr = p.copay_er ?? bs.copay_er ?? null;

    return {
      id: p.id,
      carrierId: p.carrier_id,
      carrierName: p.carriers?.display_name || p.carriers?.name || "Unknown",
      carrierLogoUrl: p.carriers?.logo_url || null,
      networkId: p.network_id,
      planName: p.plan_name,
      planCategory: p.plan_category,
      metalTier: normalizeMetalTier(p.metal_tier),
      premiumIndividual: premiumIndividual != null ? Number(premiumIndividual) : null,
      premiumFamily: premiumFamily != null ? Number(premiumFamily) : null,
      deductibleIndividual: deductibleIndividual != null ? Number(deductibleIndividual) : null,
      deductibleFamily: deductibleFamily != null ? Number(deductibleFamily) : null,
      oopMaxIndividual: oopMaxIndividual != null ? Number(oopMaxIndividual) : null,
      oopMaxFamily: oopMaxFamily != null ? Number(oopMaxFamily) : null,
      copayPcp: copayPcp != null ? Number(copayPcp) : null,
      copaySpecialist: copaySpecialist != null ? Number(copaySpecialist) : null,
      copayEr: copayEr != null ? Number(copayEr) : null,
      networkType: p.network_type,
      includesDental: p.includes_dental ?? false,
      includesVision: p.includes_vision ?? false,
      benefitsSummary: bs,
      enrollmentStatus: p.enrollment_status || "available",
      dataConfidence: p.data_confidence || "staged",
      hiosId: p.hios_id,
    };
  });
}

export async function getPlanDetails(planId: string): Promise<PlanResult | null> {
  const { data, error } = await supabase
    .from("plans")
    .select("*, carriers(name, display_name, logo_url)")
    .eq("id", planId)
    .single();

  if (error || !data) return null;

  const bs = (data.benefits_summary as Record<string, unknown>) || {};

  return {
    id: data.id,
    carrierId: data.carrier_id,
    carrierName: (data as any).carriers?.display_name || (data as any).carriers?.name || "Unknown",
    carrierLogoUrl: (data as any).carriers?.logo_url || null,
    networkId: data.network_id,
    planName: data.plan_name,
    planCategory: data.plan_category,
    metalTier: normalizeMetalTier(data.metal_tier),
    premiumIndividual: data.premium_individual ?? (bs.premium_age_27 as number | null) ?? null,
    premiumFamily: data.premium_family ?? (bs.premium_age_40 as number | null) ?? null,
    deductibleIndividual: data.deductible_individual ?? (bs.deductible_individual as number | null) ?? null,
    deductibleFamily: data.deductible_family ?? (bs.deductible_family as number | null) ?? null,
    oopMaxIndividual: data.oop_max_individual ?? (bs.oop_max_individual as number | null) ?? null,
    oopMaxFamily: data.oop_max_family ?? (bs.oop_max_family as number | null) ?? null,
    copayPcp: data.copay_pcp ?? (bs.copay_pcp as number | null) ?? null,
    copaySpecialist: data.copay_specialist ?? (bs.copay_specialist as number | null) ?? null,
    copayEr: data.copay_er ?? (bs.copay_er as number | null) ?? null,
    networkType: data.network_type,
    includesDental: data.includes_dental ?? false,
    includesVision: data.includes_vision ?? false,
    benefitsSummary: bs,
    enrollmentStatus: data.enrollment_status || "available",
    dataConfidence: data.data_confidence || "staged",
    hiosId: data.hios_id,
  };
}
