import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  TYPES — mirror of the HealthSherpa public OpenAPI contract         */
/* ------------------------------------------------------------------ */

export type HsCounty = {
  fips_code: string;
  name: string;
  state: string;
};

export type HsIssuer = {
  name: string;
  hios_issuer_id: string;
};

export type HsPlan = {
  plan_id: string;
  name?: string;
  display_name?: string;
  issuer?: { issuer_id?: string; name?: string; state?: string | null };
  network?: { name?: string; type?: string | null; network_url?: string | null } | null;
  pricing?: {
    gross_premium?: number | string;
    net_premium?: number | string;
    subsidy_applied?: number | string | null;
    max_aptc?: number | string | null;
    ehb_premium?: number | string;
    currency?: string;
  };
  details?: {
    type?: string;
    metal_level?: string;
    plan_type?: string;
    hsa_eligible?: boolean | null;
    deductible_individual?: number | string | null;
    deductible_family?: number | string | null;
    moop_individual?: number | string | null;
    moop_family?: number | string | null;
    primary_care_summary?: string | null;
    specialist_summary?: string | null;
  };
  documents?: {
    sbc_url?: string | null;
    formulary_url?: string | null;
    brochure_url?: string | null;
    network_url?: string | null;
    payment_url?: string | null;
  };
};

export type HsQuoteResult = {
  plans: HsPlan[];
  meta?: { page_number?: number; page_size?: number; result_count?: number; warnings?: string[] };
};

export type HsErrorCode =
  | "not_configured"
  | "invalid_request"
  | "unauthorized"
  | "rate_limited"
  | "upstream_error"
  | "network_error";

export class HealthSherpaError extends Error {
  readonly code: HsErrorCode;

  constructor(code: HsErrorCode, message: string) {
    super(message);
    this.name = "HealthSherpaError";
    this.code = code;
  }
}

type Action = "status" | "counties" | "issuers" | "quotes";

async function callHealthSherpa<T>(action: Action, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("healthsherpa", {
    body: { action, ...payload },
  });

  const body = data as { data?: T; error?: { code?: HsErrorCode; message?: string } } | null;

  if (body?.error) {
    throw new HealthSherpaError(
      body.error.code ?? "upstream_error",
      body.error.message ?? "HealthSherpa request failed.",
    );
  }
  if (error || !body) {
    throw new HealthSherpaError("network_error", "Could not reach the quoting service. Please try again.");
  }
  return body.data as T;
}

/* ------------------------------------------------------------------ */
/*  PUBLIC API                                                         */
/* ------------------------------------------------------------------ */

export const getHealthSherpaStatus = async (): Promise<boolean> => {
  const res = await callHealthSherpa<{ configured: boolean }>("status");
  return res.configured;
};

export const lookupHsCounties = async (zipCode: string): Promise<HsCounty[]> => {
  const res = await callHealthSherpa<{ counties?: HsCounty[] }>("counties", { zip_code: zipCode });
  return res.counties ?? [];
};

export const listHsIssuers = async (state: string, planYear?: number): Promise<HsIssuer[]> => {
  const res = await callHealthSherpa<{ issuers?: HsIssuer[] }>("issuers", {
    state,
    ...(planYear ? { plan_year: planYear } : {}),
  });
  return res.issuers ?? [];
};

export type HsRelationship = "primary" | "spouse" | "dependent";


export type HsApplicant = {
  member_id: string;
  age: number;
  /** ISO date (YYYY-MM-DD). Preferred over age by the contract. */
  date_of_birth?: string;
  relationship: HsRelationship;
  /** API enum is lowercase. */
  gender?: "male" | "female";
  uses_tobacco: boolean;
  pregnant?: boolean;
  blind_or_disabled?: boolean;
  american_indian_alaska_native?: boolean;
};

export type HsQuoteFilters = {
  issuer_ids?: string[];
  medical?: {
    metal_levels?: string[];
    plan_types?: string[];
    hsa_eligible?: boolean;
    standardized_only?: boolean;
  };
};

export type HsSortField = "premium" | "deductible" | "metal_level" | "issuer";

export const quoteHsPlans = async (params: {
  zipCode: string;
  county: HsCounty;
  householdSize: number;
  annualIncome: number;
  effectiveDate: string;
  applicants: HsApplicant[];
  filters?: HsQuoteFilters;
  sortField?: HsSortField;
  sortDirection?: "asc" | "desc";
  page?: number;
  size?: number;
}): Promise<HsQuoteResult> =>
  await callHealthSherpa<HsQuoteResult>("quotes", {
    zip_code: params.zipCode,
    fips_code: params.county.fips_code,
    state: params.county.state,
    household_size: params.householdSize,
    annual_income: params.annualIncome,
    effective_date: params.effectiveDate,
    applicants: params.applicants,
    ...(params.filters ? { filters: params.filters } : {}),
    ...(params.sortField ? { sort_field: params.sortField } : {}),
    ...(params.sortDirection ? { sort_direction: params.sortDirection } : {}),
    page: params.page ?? 1,
    size: params.size ?? 20,
  });


export {
  defaultEffectiveDate,
  upcomingEffectiveDates,
  planYearFromEffectiveDate,
  formatEnumLabel,
  formatUsd,
  displayPremium,
  toNumber,
} from "@/lib/healthsherpa-format";
