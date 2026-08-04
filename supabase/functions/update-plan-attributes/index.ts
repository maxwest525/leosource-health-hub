import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "agent"]);
    if (!roleRows || roleRows.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { attrData } = await req.json() as {
      attrData: Record<string, Record<string, unknown>>;
    };

    if (!attrData || typeof attrData !== "object") {
      return new Response(JSON.stringify({ error: "attrData required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hiosIds = Object.keys(attrData);
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < hiosIds.length; i += 50) {
      const chunk = hiosIds.slice(i, i + 50);

      const { data: plans, error: lookupErr } = await supabase
        .from("plans")
        .select("id, hios_id, benefits_summary, deductible_individual, deductible_family, oop_max_individual, oop_max_family, coinsurance_rate")
        .in("hios_id", chunk);

      if (lookupErr) {
        errors.push(`Lookup error: ${lookupErr.message}`);
        failed += chunk.length;
        continue;
      }

      for (const plan of (plans || [])) {
        const a = attrData[plan.hios_id!] as Record<string, any>;
        if (!a) { skipped++; continue; }

        const existing = (plan.benefits_summary || {}) as Record<string, unknown>;

        // Merge all plan attributes into benefits_summary
        const merged = {
          ...existing,
          plan_marketing_name: a.plan_marketing_name,
          design_type: a.design_type,
          is_new_plan: a.is_new_plan,
          is_referral_required: a.is_referral_required,
          out_of_country_coverage: a.out_of_country_coverage,
          out_of_country_desc: a.out_of_country_desc,
          national_network: a.national_network,
          csr_variation_type: a.csr_variation_type,
          actuarial_value: a.actuarial_value,
          av_calculator: a.av_calculator,
          is_hsa_eligible: a.is_hsa_eligible,
          hsa_employer_contribution: a.hsa_employer_contribution,
          formulary_url: a.formulary_url || existing.formulary_url,
          sbc_url: a.sbc_url || existing.sbc_url,
          brochure_url: a.brochure_url || existing.brochure_url,
          enrollment_url: a.enrollment_url,
          ehb_pct: a.ehb_pct,
          sbc_having_baby_deductible: a.sbc_having_baby_deductible,
          sbc_having_baby_copay: a.sbc_having_baby_copay,
          sbc_having_baby_coinsurance: a.sbc_having_baby_coinsurance,
          sbc_having_baby_limit: a.sbc_having_baby_limit,
          sbc_diabetes_deductible: a.sbc_diabetes_deductible,
          sbc_diabetes_copay: a.sbc_diabetes_copay,
          sbc_diabetes_coinsurance: a.sbc_diabetes_coinsurance,
          sbc_diabetes_limit: a.sbc_diabetes_limit,
          sbc_fracture_deductible: a.sbc_fracture_deductible,
          sbc_fracture_copay: a.sbc_fracture_copay,
          sbc_fracture_coinsurance: a.sbc_fracture_coinsurance,
          sbc_fracture_limit: a.sbc_fracture_limit,
          specialty_drug_max_coinsurance: a.specialty_drug_max_coinsurance,
          service_area_id: a.service_area_id,
          network_id_hcgov: a.network_id_hcgov,
          formulary_id: a.formulary_id,
        };

        const updatePayload: Record<string, unknown> = {
          benefits_summary: merged,
        };

        // Update top-level columns if we have better data from PUF
        if (a.deductible_individual_inn_t1 != null) {
          updatePayload.deductible_individual = a.deductible_individual_inn_t1;
        }
        if (a.deductible_family_inn_t1 != null) {
          updatePayload.deductible_family = a.deductible_family_inn_t1;
        }
        if (a.oop_individual_inn_t1 != null) {
          updatePayload.oop_max_individual = a.oop_individual_inn_t1;
        }
        if (a.oop_family_inn_t1 != null) {
          updatePayload.oop_max_family = a.oop_family_inn_t1;
        }
        if (a.coinsurance_rate != null) {
          updatePayload.coinsurance_rate = a.coinsurance_rate;
        }
        // Update network_type from PlanType if available
        if (a.plan_type) {
          updatePayload.network_type = a.plan_type;
        }

        const { error: updateErr } = await supabase
          .from("plans")
          .update(updatePayload)
          .eq("id", plan.id);

        if (updateErr) {
          errors.push(`Update ${plan.hios_id}: ${updateErr.message}`);
          failed++;
        } else {
          updated++;
        }
      }

      const foundIds = new Set((plans || []).map((p: any) => p.hios_id));
      for (const id of chunk) {
        if (!foundIds.has(id)) skipped++;
      }
    }

    return new Response(
      JSON.stringify({ updated, skipped, failed, errors: errors.slice(0, 20), total: hiosIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
