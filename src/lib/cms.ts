import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  TYPES — shapes returned by the CMS Marketplace API                 */
/* ------------------------------------------------------------------ */

export type CmsPerson = {
  age: number;
  aptc_eligible?: boolean;
  gender?: "Male" | "Female";
  uses_tobacco?: boolean;
};

export type CmsCounty = {
  fips: string;
  name: string;
  state: string;
  zipcode: string;
};

export type CmsPlan = {
  id: string;
  name: string;
  issuer: { name: string; id?: string; state?: string };
  premium: number;
  premium_w_credit: number;
  ehb_premium?: number;
  metal_level: string;
  type: string;
  deductibles?: Array<{ type: string; amount: number; family_cost?: string; network_tier?: string }>;
  moops?: Array<{ type: string; amount: number; family_cost?: string; network_tier?: string }>;
  quality_rating?: { global_rating?: number };
  hsa_eligible?: boolean;
  benefits?: Array<{
    name: string;
    covered: boolean;
    cost_sharings?: Array<{
      display_string?: string;
      network_tier?: string;
      coinsurance_rate?: number;
      copay_amount?: number;
    }>;
  }>;
  benefits_url?: string;
  brochure_url?: string;
  formulary_url?: string;
  network_url?: string;
  specialist_referral_required?: boolean;
  /** HealthQuote Pro extras (absent for CMS-sourced plans). */
  subsidy_applied?: number;
  max_aptc?: number;
  network_name?: string;
  payment_url?: string;
};

export type CmsPlanSearchResult = {
  plans: CmsPlan[];
  total: number;
  ranges?: { premiums?: { min: number; max: number } };
  facet_groups?: unknown;
};

export type CmsDrug = {
  rxcui: string;
  name: string;
  strength?: string;
  route?: string;
  full_name?: string;
};

export type CmsDrugCoverage = {
  rxcui: string;
  plan_id: string;
  coverage: "Covered" | "NotCovered" | "GenericCovered" | "DataNotProvided" | string;
};

export type CmsProvider = {
  npi: string;
  name: { first?: string; last?: string; middle?: string } | string;
  specialities?: string[];
  taxonomy?: string;
  gender?: string;
  languages?: string[];
  address?: { street1?: string; city?: string; state?: string; zipcode?: string };
  addresses?: Array<{ street1?: string; city?: string; state?: string; zipcode?: string; phone?: string }>;
  type?: string;
};

export type CmsProviderCoverage = {
  npi: string;
  plan_id: string;
  coverage: "Covered" | "NotCovered" | "DataNotProvided" | string;
};

export type CmsEligibilityEstimate = {
  estimates: Array<{
    aptc: number;
    csr?: string;
    hardship_exemption?: boolean;
    is_medicaid_chip?: boolean;
    in_coverage_gap?: boolean;
  }>;
};

/* ------------------------------------------------------------------ */
/*  GATEWAY CALL                                                       */
/* ------------------------------------------------------------------ */

type CmsAction =
  | "countyByZip"
  | "planSearch"
  | "drugAutocomplete"
  | "drugCoverage"
  | "providerAutocomplete"
  | "providerCoverage"
  | "eligibilityEstimate"
  | "planDetail"
  | "planCrosswalk"
  | "issuers";

async function callCms<T>(action: CmsAction, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cms-lookup", {
    body: { action, ...payload },
  });

  if (error) throw new Error(error.message ?? "Marketplace lookup failed");
  const body = data as { data?: T; error?: string } | null;
  if (!body || body.error) throw new Error(body?.error ?? "Marketplace lookup failed");
  return body.data as T;
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

export type Place = { zipcode: string; state: string; countyfips: string };

export async function lookupCounties(zipcode: string): Promise<CmsCounty[]> {
  const res = await callCms<{ counties: CmsCounty[] }>("countyByZip", { zipcode });
  return res.counties ?? [];
}

/** Resolves a ZIP to its first (usually only) county. */
export async function resolvePlace(zipcode: string): Promise<Place | null> {
  const counties = await lookupCounties(zipcode);
  const county = counties[0];
  if (!county) return null;
  return { zipcode, state: county.state, countyfips: county.fips };
}

export async function searchPlans(params: {
  place: Place;
  income: number;
  people: CmsPerson[];
  limit?: number;
  offset?: number;
}): Promise<CmsPlanSearchResult> {
  return await callCms<CmsPlanSearchResult>("planSearch", {
    ...params.place,
    income: params.income,
    people: params.people,
    limit: params.limit ?? 20,
    offset: params.offset ?? 0,
  });
}

export async function estimateEligibility(params: {
  place: Place;
  income: number;
  people: CmsPerson[];
  hasMarriedCouple?: boolean;
}): Promise<CmsEligibilityEstimate> {
  return await callCms<CmsEligibilityEstimate>("eligibilityEstimate", {
    ...params.place,
    income: params.income,
    people: params.people,
    hasMarriedCouple: params.hasMarriedCouple ?? false,
  });
}

/** CMS Marketplace plan IDs look like 12345FL0010001(-01). HealthSherpa IDs do not. */
export const isCmsPlanId = (planId: string): boolean =>
  /^\d{5}[A-Za-z]{2}\d{7}(-\d{2})?$/.test(planId.trim());

export async function getPlanDetail(planId: string): Promise<{ plan: CmsPlan | null }> {
  if (!isCmsPlanId(planId)) return { plan: null };
  return await callCms<{ plan: CmsPlan }>("planDetail", { planId });
}

export async function getPlanCrosswalk(planId: string, place: Place) {
  return await callCms<unknown>("planCrosswalk", {
    planId,
    state: place.state,
    countyfips: place.countyfips,
  });
}

export async function listIssuers(state: string) {
  return await callCms<{ issuers: Array<{ id: string; name: string }> }>("issuers", { state });
}

export async function searchDrugs(query: string): Promise<CmsDrug[]> {
  const res = await callCms<CmsDrug[] | { drugs: CmsDrug[] }>("drugAutocomplete", { query });
  return Array.isArray(res) ? res : res.drugs ?? [];
}

export async function checkDrugCoverage(
  rxcuis: string[],
  planIds: string[]
): Promise<CmsDrugCoverage[]> {
  const res = await callCms<{ coverage: CmsDrugCoverage[] }>("drugCoverage", { rxcuis, planIds });
  return res.coverage ?? [];
}

export async function searchProviders(params: {
  query: string;
  zipcode: string;
  type?: "Individual" | "Facility";
}): Promise<CmsProvider[]> {
  const res = await callCms<CmsProvider[] | { providers: CmsProvider[] }>("providerAutocomplete", {
    query: params.query,
    zipcode: params.zipcode,
    type: params.type ?? "Individual",
  });
  return Array.isArray(res) ? res : res.providers ?? [];
}

export async function checkProviderCoverage(
  npis: string[],
  planIds: string[]
): Promise<CmsProviderCoverage[]> {
  const res = await callCms<{ coverage: CmsProviderCoverage[] }>("providerCoverage", {
    npis,
    planIds,
  });
  return res.coverage ?? [];
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

export const formatCurrency = (value: number, withCents = false): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(value);

export const providerDisplayName = (provider: CmsProvider): string => {
  if (typeof provider.name === "string") return provider.name;
  const { first, middle, last } = provider.name ?? {};
  return [first, middle, last].filter(Boolean).join(" ").trim() || "Provider";
};

export const coverageLabel = (status: string): { label: string; tone: "good" | "warn" | "bad" } => {
  switch (status) {
    case "Covered":
      return { label: "Covered", tone: "good" };
    case "GenericCovered":
      return { label: "Generic covered", tone: "warn" };
    case "NotCovered":
      return { label: "Not covered", tone: "bad" };
    default:
      return { label: "Not reported", tone: "warn" };
  }
};

/** HealthCare.gov deep link for enrollment — CMS has no public enrollment API. */
export const healthcareGovEnrollUrl = (planId: string, place: Place, year = 2026): string =>
  `https://www.healthcare.gov/see-plans/#/plan/${planId}?year=${year}&zip=${place.zipcode}&state=${place.state}&county=${place.countyfips}`;
