import { supabase } from "@/integrations/supabase/client";
import {
  searchProviders as cmsSearchProviders,
  providerDisplayName,
  type CmsProvider,
} from "@/lib/cms";

/* ================================================================== */
/*  PROVIDER SERVICE                                                    */
/*  Source of truth: live CMS Marketplace provider index (NPPES-backed) */
/*  Falls back to the staged providers table when no ZIP is supplied.   */
/* ================================================================== */

export type ProviderResult = {
  id: string;
  displayName: string;
  specialty: string | null;
  providerType: string;
  practiceName: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  acceptingNewPatients: boolean | null;
  isFacility: boolean;
  dataConfidence: string;
  networkIds: string[];
};

export type ProviderSearchParams = {
  query: string;
  zip?: string;
  state?: string;
  specialty?: string;
  limit?: number;
};

const mapCmsProvider = (provider: CmsProvider): ProviderResult => {
  // The Marketplace payload uses `provider_type`/`specialties`/`accepting`;
  // the documented aliases (`type`/`specialities`) appear on some records.
  const raw = provider as CmsProvider & {
    provider_type?: string;
    specialties?: string[];
    accepting?: string;
  };
  const address = provider.address ?? provider.addresses?.[0] ?? {};
  const providerType = raw.provider_type ?? provider.type ?? "Individual";
  const isFacility = providerType === "Facility";
  const specialty = raw.specialties?.[0] ?? provider.specialities?.[0] ?? provider.taxonomy ?? null;

  return {
    id: provider.npi,
    displayName: providerDisplayName(provider),
    specialty,
    providerType,
    practiceName: isFacility ? providerDisplayName(provider) : null,
    city: address.city ?? null,
    state: address.state ?? null,
    zipCode: address.zipcode ?? null,
    phone: provider.addresses?.[0]?.phone ?? null,
    acceptingNewPatients:
      raw.accepting === "accepting" ? true : raw.accepting === "not accepting" ? false : null,
    isFacility,
    dataConfidence: "verified",
    networkIds: [],
  };

};

/**
 * Search providers against the live CMS Marketplace provider index.
 * The Marketplace endpoint requires a ZIP; without one we fall back to
 * whatever providers have been staged in the database.
 */
export async function searchProviders(params: ProviderSearchParams): Promise<ProviderResult[]> {
  const { query, zip, state, specialty, limit = 20 } = params;

  if (zip && /^\d{5}$/.test(zip)) {
    try {
      const [individuals, facilities] = await Promise.all([
        cmsSearchProviders({ query, zipcode: zip, type: "Individual" }),
        cmsSearchProviders({ query, zipcode: zip, type: "Facility" }),
      ]);

      const results = [...individuals, ...facilities].map(mapCmsProvider);
      const filtered = specialty
        ? results.filter((r) => r.specialty?.toLowerCase().includes(specialty.toLowerCase()))
        : results;

      if (filtered.length > 0) return filtered.slice(0, limit);
    } catch (error) {
      console.error("[ProviderService] CMS lookup failed, falling back to staged data", error);
    }
  }

  let q = supabase
    .from("providers")
    .select("*, provider_networks(network_id)")
    .eq("is_active", true)
    .ilike("display_name", `%${query}%`)
    .limit(limit);

  if (zip) q = q.eq("zip_code", zip);
  if (state) q = q.eq("state", state);
  if (specialty) q = q.ilike("specialty", `%${specialty}%`);

  const { data, error } = await q;

  if (error) {
    console.error("[ProviderService] search error:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    displayName: p.display_name,
    specialty: p.specialty,
    providerType: p.provider_type,
    practiceName: p.practice_name,
    city: p.city,
    state: p.state,
    zipCode: p.zip_code,
    phone: p.phone,
    acceptingNewPatients: p.accepting_new_patients,
    isFacility: p.is_facility,
    dataConfidence: p.data_confidence || "staged",
    networkIds: (p.provider_networks || []).map((pn: any) => pn.network_id),
  }));
}


/**
 * Check if a provider participates in a specific network.
 */
export async function checkProviderNetwork(
  providerId: string,
  networkId: string
): Promise<{ inNetwork: boolean; confidence: string }> {
  const { data } = await supabase
    .from("provider_networks")
    .select("participation_status, data_confidence")
    .eq("provider_id", providerId)
    .eq("network_id", networkId)
    .single();

  if (!data) return { inNetwork: false, confidence: "unknown" };

  return {
    inNetwork: data.participation_status === "active",
    confidence: data.data_confidence || "staged",
  };
}

/**
 * Batch-check doctor match for a list of provider IDs against a plan's network.
 * Returns a score 0–100 representing the percentage of providers in-network.
 */
export async function calculateDoctorMatchScore(
  providerIds: string[],
  networkId: string
): Promise<{ score: number; matched: string[]; unmatched: string[]; confidence: string }> {
  if (providerIds.length === 0) return { score: 0, matched: [], unmatched: [], confidence: "none" };

  const { data } = await supabase
    .from("provider_networks")
    .select("provider_id, data_confidence")
    .eq("network_id", networkId)
    .in("provider_id", providerIds)
    .eq("participation_status", "active");

  const matchedIds = new Set((data || []).map((d: any) => d.provider_id));
  const matched = providerIds.filter(id => matchedIds.has(id));
  const unmatched = providerIds.filter(id => !matchedIds.has(id));

  const worstConfidence = (data || []).reduce(
    (worst: string, d: any) => (d.data_confidence === "staged" ? "staged" : worst),
    "verified"
  );

  return {
    score: Math.round((matched.length / providerIds.length) * 100),
    matched,
    unmatched,
    confidence: data?.length ? worstConfidence : "staged",
  };
}
