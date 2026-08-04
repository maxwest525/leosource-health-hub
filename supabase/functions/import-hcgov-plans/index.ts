import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the user is authenticated
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, carriers, plans, batchIndex, totalBatches } = body;

    if (action === "import_carriers" && carriers) {
      let created = 0, updated = 0, failed = 0;

      for (const c of carriers) {
        const { error } = await supabase.from("carriers").upsert(
          {
            name: c.name,
            display_name: c.name,
            support_phone: c.phone || null,
            states_available: c.states || [],
            coverage_categories: ["individual", "aca"],
            data_source: "healthcare.gov",
            data_confidence: "verified",
            last_data_update: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: "name" }
        );
        if (error) {
          console.error("Carrier upsert error:", c.name, error.message);
          failed++;
        } else {
          created++;
        }
      }

      // Log the import
      await supabase.from("data_import_log").insert({
        domain: "carriers",
        source_name: "healthcare.gov",
        import_type: "batch",
        status: "completed",
        records_processed: carriers.length,
        records_created: created,
        records_updated: updated,
        records_failed: failed,
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, created, updated, failed, total: carriers.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "import_plans" && plans) {
      let created = 0, failed = 0;
      const errors: string[] = [];

      // First get carrier ID mapping
      const { data: carrierRows } = await supabase
        .from("carriers")
        .select("id, name")
        .eq("data_source", "healthcare.gov");

      const carrierMap: Record<string, string> = {};
      for (const cr of carrierRows || []) {
        carrierMap[cr.name] = cr.id;
      }

      for (const p of plans) {
        const carrierId = carrierMap[p.issuer_name];
        if (!carrierId) {
          errors.push(`No carrier for: ${p.issuer_name}`);
          failed++;
          continue;
        }

        const benefitsSummary: Record<string, any> = {
          network_url: p.network_url,
          brochure_url: p.brochure_url,
          sbc_url: p.sbc_url,
          formulary_url: p.formulary_url,
          premium_age_27: p.premium_age_27,
          premium_age_40: p.premium_age_40,
          premium_age_60: p.premium_age_60,
          copay_er_text: p.copay_er_text,
          generic_drugs_text: p.generic_drugs_text,
          preferred_drugs_text: p.preferred_drugs_text,
          specialty_drugs_text: p.specialty_drugs_text,
          counties: p.counties,
        };

        const { error } = await supabase.from("plans").upsert(
          {
            hios_id: p.hios_id,
            plan_name: p.plan_name,
            carrier_id: carrierId,
            plan_category: "individual",
            metal_tier: p.metal_tier,
            network_type: p.plan_type,
            premium_individual: p.premium_age_27,
            premium_family: p.premium_age_40, // using age 40 as family proxy
            deductible_individual: p.deductible_individual,
            deductible_family: p.deductible_family,
            oop_max_individual: p.oop_max_individual,
            oop_max_family: p.oop_max_family,
            copay_pcp: p.copay_pcp,
            copay_specialist: p.copay_specialist,
            includes_dental: p.includes_dental || false,
            includes_vision: false,
            service_area_states: p.states || [],
            benefits_summary: benefitsSummary,
            enrollment_status: "available",
            data_source: "healthcare.gov",
            data_confidence: "verified",
            last_data_update: new Date().toISOString(),
            plan_year: 2026,
            is_active: true,
          },
          { onConflict: "hios_id" }
        );

        if (error) {
          errors.push(`${p.hios_id}: ${error.message}`);
          failed++;
        } else {
          created++;
        }
      }

      // Log the import
      await supabase.from("data_import_log").insert({
        domain: "plans",
        source_name: "healthcare.gov",
        import_type: "batch",
        version_tag: `batch_${batchIndex ?? 0}_of_${totalBatches ?? 1}`,
        status: failed > 0 ? "completed_with_errors" : "completed",
        records_processed: plans.length,
        records_created: created,
        records_failed: failed,
        error_log: errors.length > 0 ? errors : [],
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, created, failed, total: plans.length, errors: errors.slice(0, 10) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use import_carriers or import_plans" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Import error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
