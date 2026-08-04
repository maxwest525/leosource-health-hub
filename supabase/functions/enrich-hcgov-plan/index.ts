import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// CMS Marketplace API (Centers for Medicare & Medicaid Services)
const CMS_API_BASE = "https://marketplace.api.healthcare.gov/api/v1";
const CMS_API_KEY = Deno.env.get("CMS_MARKETPLACE_API_KEY") ?? "";

/** Fetch plan details from the CMS Marketplace API */
async function fetchPlanFromCMS(planId: string, year = 2025): Promise<Record<string, unknown> | null> {
  const url = `${CMS_API_BASE}/plans/${planId}?year=${year}&apikey=${CMS_API_KEY}`;
  console.log(`Fetching CMS plan: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) {
    // Try previous year if current year fails
    if (year === 2025) {
      console.log(`Plan not found for ${year}, trying 2024...`);
      return fetchPlanFromCMS(planId, 2024);
    }
    console.error(`CMS API error ${resp.status} for ${planId}`);
    return null;
  }
  return await resp.json();
}

/** Search plans via CMS Marketplace API */
async function searchPlansFromCMS(
  state: string,
  zipcode: string,
  fips: string,
  age = 30,
  income = 50000,
  limit = 25
): Promise<unknown> {
  const url = `${CMS_API_BASE}/plans/search?apikey=${CMS_API_KEY}`;
  const body = {
    household: {
      income,
      people: [{ age, aptc_eligible: true, gender: "Female", uses_tobacco: false }],
    },
    market: "Individual",
    place: { countyfips: fips, state, zipcode },
    year: 2025,
    limit,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`CMS search failed (${resp.status}): ${text}`);
  }
  return await resp.json();
}

/** Look up county FIPS by zip code */
async function getCountyByZip(zipcode: string): Promise<{ fips: string; name: string; state: string } | null> {
  const url = `${CMS_API_BASE}/counties/by/zip/${zipcode}?apikey=${CMS_API_KEY}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data.counties && data.counties.length > 0) {
    const c = data.counties[0];
    return { fips: c.fips, name: c.name, state: c.state };
  }
  return null;
}

/** Extract enrichment fields from CMS Marketplace API plan response */
function extractEnrichment(plan: Record<string, unknown>): Record<string, unknown> {
  const e: Record<string, unknown> = {};

  // URLs
  if (plan.benefits_url) e.sbc_url = plan.benefits_url;
  if (plan.brochure_url) e.brochure_url = plan.brochure_url;
  if (plan.formulary_url) e.formulary_url = plan.formulary_url;
  if (plan.network_url) e.network_url = plan.network_url;

  // Plan metadata
  if (plan.type) e.plan_type = plan.type;
  if (plan.metal_level) e.metal_level = plan.metal_level;
  if (plan.design_type) e.design_type = plan.design_type;
  if (plan.hsa_eligible !== undefined) e.hsa_eligible = plan.hsa_eligible;
  if (plan.has_national_network !== undefined) e.national_network = plan.has_national_network;
  if (plan.out_of_country_coverage !== undefined) e.out_of_country = plan.out_of_country_coverage;

  // Quality ratings
  if (plan.quality_rating) {
    const qr = plan.quality_rating as Record<string, unknown>;
    if (qr.global_rating) e.quality_global = qr.global_rating;
    if (qr.clinical_quality_management_rating) e.quality_clinical = qr.clinical_quality_management_rating;
    if (qr.enrollee_experience_rating) e.quality_experience = qr.enrollee_experience_rating;
    if (qr.plan_efficiency_rating) e.quality_efficiency = qr.plan_efficiency_rating;
  }

  // Issuer info
  if (plan.issuer) {
    const iss = plan.issuer as Record<string, unknown>;
    if (iss.name) e.issuer_name = iss.name;
    if (iss.toll_free) e.issuer_phone = iss.toll_free;
  }

  // Deductibles & MOOP from the deductibles/moops arrays
  const deductibles = plan.deductibles as Array<Record<string, unknown>> | undefined;
  if (deductibles) {
    for (const d of deductibles) {
      if (d.type === "Medical EHB Deductible" && d.network_tier === "In-Network") {
        if (d.individual !== undefined) e.deductible_individual = d.individual;
        if (d.family !== undefined) e.deductible_family = d.family;
      }
    }
  }

  const moops = plan.moops as Array<Record<string, unknown>> | undefined;
  if (moops) {
    for (const m of moops) {
      if (m.type === "Maximum Out of Pocket for Medical EHB Benefits" && m.network_tier === "In-Network") {
        if (m.individual !== undefined) e.oop_max_individual = m.individual;
        if (m.family !== undefined) e.oop_max_family = m.family;
      }
    }
  }

  // Benefits (copays, coinsurance)
  const benefits = plan.benefits as Array<Record<string, unknown>> | undefined;
  if (benefits) {
    for (const b of benefits) {
      const name = b.name as string;
      const costSharings = b.cost_sharings as Array<Record<string, unknown>> | undefined;
      if (!costSharings || costSharings.length === 0) continue;
      const cs = costSharings.find((c: Record<string, unknown>) => c.network_tier === "In-Network") || costSharings[0];

      if (name === "Primary Care Visit to Treat an Injury or Illness") {
        e.copay_pcp = cs.copay_amount;
        e.coinsurance_pcp = cs.coinsurance_rate;
      } else if (name === "Specialist Visit") {
        e.copay_specialist = cs.copay_amount;
        e.coinsurance_specialist = cs.coinsurance_rate;
      } else if (name === "Emergency Room Services") {
        e.copay_er = cs.copay_amount;
        e.coinsurance_er = cs.coinsurance_rate;
      } else if (name === "Generic Drugs") {
        e.copay_generic_drugs = cs.copay_amount;
      } else if (name === "Inpatient Hospital Services (e.g., Hospital Stay)") {
        e.copay_inpatient = cs.copay_amount;
        e.coinsurance_inpatient = cs.coinsurance_rate;
      }
    }
  }

  // Disease management
  if (plan.disease_mgmt_programs) e.disease_mgmt = plan.disease_mgmt_programs;

  return e;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Require an authenticated staff (admin/agent) session
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "agent"]);
    if (!roleRows || roleRows.length === 0) {
      return jsonResp({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    /* ─── ACTION: enrich_plan ─── */
    if (action === "enrich_plan") {
      const { hios_id, plan_id } = body;
      if (!hios_id && !plan_id) {
        return jsonResp({ error: "Provide hios_id or plan_id" }, 400);
      }

      let resolvedHiosId = hios_id;
      if (!resolvedHiosId && plan_id) {
        const { data: planRow } = await supabase
          .from("plans")
          .select("hios_id")
          .eq("id", plan_id)
          .single();
        resolvedHiosId = planRow?.hios_id;
        if (!resolvedHiosId) return jsonResp({ error: "Plan not found or has no HIOS ID" }, 404);
      }

      const cmsPlan = await fetchPlanFromCMS(resolvedHiosId);
      if (!cmsPlan) {
        return jsonResp({
          enriched: false,
          hios_id: resolvedHiosId,
          message: "No match found in CMS Marketplace API",
        });
      }

      const enrichment = extractEnrichment(cmsPlan);

      const updateQuery = plan_id
        ? supabase.from("plans").update({
            benefits_summary: enrichment,
            data_confidence: "enriched",
            last_data_update: new Date().toISOString(),
          }).eq("id", plan_id)
        : supabase.from("plans").update({
            benefits_summary: enrichment,
            data_confidence: "enriched",
            last_data_update: new Date().toISOString(),
          }).eq("hios_id", resolvedHiosId);

      const { error: updateErr } = await updateQuery;

      return jsonResp({
        enriched: true,
        hios_id: resolvedHiosId,
        fields_enriched: Object.keys(enrichment).length,
        enrichment,
        db_updated: !updateErr,
        db_error: updateErr?.message || null,
      });
    }

    /* ─── ACTION: search_plans ─── */
    if (action === "search_plans") {
      const { zipcode, state, age, income, limit = 25 } = body;

      if (!zipcode) return jsonResp({ error: "zipcode is required for search" }, 400);

      // Look up county FIPS
      const county = await getCountyByZip(zipcode);
      if (!county) return jsonResp({ error: `No county found for zipcode ${zipcode}` }, 404);

      const result = await searchPlansFromCMS(
        state || county.state,
        zipcode,
        county.fips,
        age || 30,
        income || 50000,
        limit
      );

      return jsonResp({
        county: county.name,
        state: county.state,
        fips: county.fips,
        result,
      });
    }

    /* ─── ACTION: get_issuers ─── */
    if (action === "get_issuers") {
      const { state } = body;
      if (!state) return jsonResp({ error: "state is required" }, 400);

      const url = `${CMS_API_BASE}/issuers?year=2025&state=${state}&apikey=${CMS_API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        return jsonResp({ error: `CMS API error: ${resp.status}` }, 502);
      }
      const data = await resp.json();
      return jsonResp({ state, issuers: data });
    }

    /* ─── ACTION: enrich_batch ─── */
    if (action === "enrich_batch") {
      const { limit = 10 } = body;

      // Find plans that haven't been enriched yet
      const { data: unenriched } = await supabase
        .from("plans")
        .select("id, hios_id")
        .eq("data_source", "healthcare.gov")
        .neq("data_confidence", "enriched")
        .not("hios_id", "is", null)
        .limit(limit);

      if (!unenriched || unenriched.length === 0) {
        return jsonResp({ enriched: 0, failed: 0, total: 0, message: "All plans already enriched or none found" });
      }

      let enriched = 0, failed = 0;
      const errors: string[] = [];

      for (const plan of unenriched) {
        try {
          const cmsPlan = await fetchPlanFromCMS(plan.hios_id!);

          if (!cmsPlan) {
            failed++;
            errors.push(`${plan.hios_id}: not found in CMS API`);
            continue;
          }

          const enrichment = extractEnrichment(cmsPlan);

          // Merge with existing benefits_summary
          const { data: existing } = await supabase
            .from("plans")
            .select("benefits_summary")
            .eq("id", plan.id)
            .single();

          const merged = { ...(existing?.benefits_summary as Record<string, unknown> || {}), ...enrichment };

          const { error: updateErr } = await supabase.from("plans").update({
            benefits_summary: merged,
            data_confidence: "enriched",
            last_data_update: new Date().toISOString(),
          }).eq("id", plan.id);

          if (updateErr) {
            failed++;
            errors.push(`${plan.hios_id}: DB update failed - ${updateErr.message}`);
          } else {
            enriched++;
          }
        } catch (e) {
          failed++;
          errors.push(`${plan.hios_id}: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }

      // Log the enrichment
      await supabase.from("data_import_log").insert({
        domain: "plans",
        source_name: "cms-marketplace-api-enrichment",
        import_type: "api",
        status: failed > 0 ? "completed_with_errors" : "completed",
        records_processed: unenriched.length,
        records_created: 0,
        records_updated: enriched,
        records_failed: failed,
        error_log: errors,
        completed_at: new Date().toISOString(),
      });

      return jsonResp({ enriched, failed, total: unenriched.length, errors: errors.slice(0, 10) });
    }

    /* ─── ACTION: lookup_county ─── */
    if (action === "lookup_county") {
      const { zipcode } = body;
      if (!zipcode) return jsonResp({ error: "zipcode is required" }, 400);
      const county = await getCountyByZip(zipcode);
      if (!county) return jsonResp({ error: `No county found for ${zipcode}` }, 404);
      return jsonResp(county);
    }

    return jsonResp({ error: "Invalid action. Use: enrich_plan, search_plans, get_issuers, enrich_batch, lookup_county" }, 400);
  } catch (e) {
    console.error("Enrichment error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
