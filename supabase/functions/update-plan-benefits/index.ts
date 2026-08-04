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

    const { benefitData } = await req.json() as {
      benefitData: Record<string, Record<string, unknown>>;
    };

    if (!benefitData || typeof benefitData !== "object") {
      return new Response(JSON.stringify({ error: "benefitData required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hiosIds = Object.keys(benefitData);
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in sub-batches of 50
    for (let i = 0; i < hiosIds.length; i += 50) {
      const chunk = hiosIds.slice(i, i + 50);

      // Look up plans by hios_id
      const { data: plans, error: lookupErr } = await supabase
        .from("plans")
        .select("id, hios_id, benefits_summary, copay_pcp, copay_specialist, copay_er")
        .in("hios_id", chunk);

      if (lookupErr) {
        errors.push(`Lookup error: ${lookupErr.message}`);
        failed += chunk.length;
        continue;
      }

      for (const plan of (plans || [])) {
        const bencs = benefitData[plan.hios_id!];
        if (!bencs) { skipped++; continue; }

        const existingSummary = (plan.benefits_summary || {}) as Record<string, unknown>;

        const mergedSummary = {
          ...existingSummary,
          copay_pcp_text: bencs.pcp,
          copay_specialist_text: bencs.specialist,
          copay_er_text: bencs.er,
          copay_urgent_care_text: bencs.urgent_care,
          copay_mental_health_text: bencs.mental_health,
          generic_drugs_text: bencs.generic_drugs,
          preferred_drugs_text: bencs.preferred_drugs,
          non_preferred_drugs_text: bencs.non_preferred_drugs,
          specialty_drugs_text: bencs.specialty_drugs,
          preventive_care_text: bencs.preventive,
          imaging_text: bencs.imaging,
          inpatient_text: bencs.inpatient,
          lab_text: bencs.lab,
        };

        const updatePayload: Record<string, unknown> = {
          benefits_summary: mergedSummary,
        };

        // Set numeric copay fields if available
        if (typeof bencs.pcp_num === "number") updatePayload.copay_pcp = bencs.pcp_num;
        if (typeof bencs.specialist_num === "number") updatePayload.copay_specialist = bencs.specialist_num;
        if (typeof bencs.er_num === "number") updatePayload.copay_er = bencs.er_num;

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

      // Plans in chunk not found in DB
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
