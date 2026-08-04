import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  INTENT SCORING                                                     */
/* ------------------------------------------------------------------ */

export type IntentTag =
  | "wants_to_keep_doctor"
  | "prescription_sensitive"
  | "budget_sensitive"
  | "carrier_specific"
  | "medicare_shopper"
  | "aca_shopper"
  | "high_compare_activity"
  | "requested_help"
  | "high_confidence_buyer"
  | "needs_network_verification"
  | "needs_rx_verification";

export function calculateIntentScore(data: {
  doctorsSelected: number;
  rxSelected: number;
  plansCompared: number;
  plansViewed: number;
  filtersUsed: number;
  helpRequested: boolean;
  contactSubmitted: boolean;
  highestStep: number;
}): { score: number; level: string; tags: IntentTag[] } {
  let score = 0;
  const tags: IntentTag[] = [];

  // Doctors
  if (data.doctorsSelected >= 1) { score += 15; tags.push("wants_to_keep_doctor"); }
  if (data.doctorsSelected >= 3) score += 10;

  // Prescriptions
  if (data.rxSelected >= 1) { score += 15; tags.push("prescription_sensitive"); }
  if (data.rxSelected >= 3) score += 10;

  // Plans
  if (data.plansViewed >= 1) score += 10;
  if (data.plansCompared >= 2) { score += 15; tags.push("high_compare_activity"); }
  if (data.plansCompared >= 3) score += 10;

  // Filters
  if (data.filtersUsed >= 2) score += 5;

  // Help
  if (data.helpRequested) { score += 20; tags.push("requested_help"); }

  // Contact
  if (data.contactSubmitted) { score += 20; tags.push("high_confidence_buyer"); }

  // Steps reached
  if (data.highestStep >= 3) score += 5;
  if (data.highestStep >= 5) score += 10;

  score = Math.min(score, 100);

  const level = score >= 75 ? "ready_for_agent"
    : score >= 50 ? "high"
    : score >= 25 ? "medium"
    : "low";

  // Always add verification tags if doctors or rx present
  if (data.doctorsSelected > 0) tags.push("needs_network_verification");
  if (data.rxSelected > 0) tags.push("needs_rx_verification");

  return { score, level, tags };
}

/* ------------------------------------------------------------------ */
/*  ROUTING LOGIC                                                      */
/* ------------------------------------------------------------------ */

export function determineRouting(data: {
  category: string;
  intentLevel: string;
  helpRequested: boolean;
  doctorsSelected: number;
  rxSelected: number;
  budget: string;
}): { team: string; priority: boolean } {
  let team = "general";
  let priority = false;

  // Category routing
  if (data.category.toLowerCase().includes("medicare")) team = "medicare";
  else if (data.category.toLowerCase().includes("individual") || data.category.toLowerCase().includes("family")) team = "aca_individual";
  else if (data.category.toLowerCase().includes("dental") || data.category.toLowerCase().includes("vision")) team = "dental_vision";

  // Priority
  if (data.helpRequested) priority = true;
  if (data.intentLevel === "ready_for_agent") priority = true;

  return { team, priority };
}

/* ------------------------------------------------------------------ */
/*  LEAD STATUS LOGIC                                                  */
/* ------------------------------------------------------------------ */

export function determineStatus(highestStep: number, contactSubmitted: boolean, helpRequested: boolean): string {
  if (contactSubmitted && helpRequested) return "ready_for_agent";
  if (contactSubmitted) return "ready_for_agent";
  if (helpRequested) return "high_intent_review";
  if (highestStep >= 5) return "plan_compare_completed";
  if (highestStep >= 4) return "rx_search_completed";
  if (highestStep >= 3) return "doctor_search_completed";
  if (highestStep >= 2) return "partial_completion";
  return "new_tool_lead";
}

/* ------------------------------------------------------------------ */
/*  SAVE LEAD TO DATABASE                                              */
/* ------------------------------------------------------------------ */

export async function saveToolLead(leadData: {
  sessionId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  zip: string;
  category: string;
  budget?: string;
  carrierPref?: string;
  networkPref?: string;
  priorities: string[];
  doctors: { name: string; specialty: string }[];
  prescriptions: { name: string; dosage: string }[];
  plansViewed: { name: string; carrier: string; metalTier?: string; networkType: string; premium: number; wasCompared: boolean; fitLabel?: string; doctorMatch: number; rxMatch: number }[];
  helpRequested: boolean;
  contactSubmitted: boolean;
  finalCta?: string;
  highestStep: number;
  filtersUsed: number;
  householdSize?: number;
  annualIncome?: string;
  subsidyEligible?: boolean;
}) {
  const intent = calculateIntentScore({
    doctorsSelected: leadData.doctors.length,
    rxSelected: leadData.prescriptions.length,
    plansCompared: leadData.plansViewed.filter(p => p.wasCompared).length,
    plansViewed: leadData.plansViewed.length,
    filtersUsed: leadData.filtersUsed,
    helpRequested: leadData.helpRequested,
    contactSubmitted: leadData.contactSubmitted,
    highestStep: leadData.highestStep,
  });

  const routing = determineRouting({
    category: leadData.category,
    intentLevel: intent.level,
    helpRequested: leadData.helpRequested,
    doctorsSelected: leadData.doctors.length,
    rxSelected: leadData.prescriptions.length,
    budget: leadData.budget || "",
  });

  const status = determineStatus(leadData.highestStep, leadData.contactSubmitted, leadData.helpRequested);

  // Insert lead
  const { data: lead, error: leadError } = await supabase
    .from("tool_leads")
    .insert({
      session_id: leadData.sessionId,
      first_name: leadData.firstName || null,
      last_name: leadData.lastName || null,
      email: leadData.email || null,
      phone: leadData.phone || null,
      zip_code: leadData.zip,
      coverage_category: leadData.category,
      monthly_budget: leadData.budget || null,
      carrier_preference: leadData.carrierPref || null,
      network_preference: leadData.networkPref || null,
      priorities: leadData.priorities,
      intent_score: intent.score,
      intent_level: intent.level as any,
      status: status as any,
      routing_team: routing.team,
      callback_priority: routing.priority,
      final_cta_taken: leadData.finalCta || null,
      steps_completed: leadData.highestStep,
      highest_step_reached: leadData.highestStep,
      household_size: leadData.householdSize || null,
      annual_income: leadData.annualIncome || null,
      subsidy_eligible: leadData.subsidyEligible ?? null,
    } as any)
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("Error saving lead:", leadError);
    return null;
  }

  const leadId = lead.id;

  // Batch insert related data
  const promises: PromiseLike<any>[] = [];

  if (leadData.doctors.length > 0) {
    promises.push(
      supabase.from("tool_lead_doctors").insert(
        leadData.doctors.map(d => ({ lead_id: leadId, doctor_name: d.name, specialty: d.specialty, is_selected: true }))
      ).then()
    );
  }

  if (leadData.prescriptions.length > 0) {
    promises.push(
      supabase.from("tool_lead_prescriptions").insert(
        leadData.prescriptions.map(r => ({ lead_id: leadId, medication_name: r.name, dosage: r.dosage, is_selected: true }))
      ).then()
    );
  }

  if (leadData.plansViewed.length > 0) {
    promises.push(
      supabase.from("tool_lead_plans").insert(
        leadData.plansViewed.map(p => ({
          lead_id: leadId,
          plan_name: p.name,
          carrier: p.carrier,
          metal_tier: p.metalTier || null,
          network_type: p.networkType,
          premium: p.premium,
          was_compared: p.wasCompared,
          was_detail_viewed: true,
          fit_label: p.fitLabel || null,
          doctor_match: p.doctorMatch,
          rx_match: p.rxMatch,
        }))
      ).then()
    );
  }

  // Insert tags
  if (intent.tags.length > 0) {
    promises.push(
      supabase.from("tool_lead_tags").insert(
        intent.tags.map(tag => ({ lead_id: leadId, tag, auto_generated: true }))
      ).then()
    );
  }

  // Insert verification flags
  const flags: string[] = [];
  if (leadData.doctors.length > 0) flags.push("doctor_participation_requires_confirmation");
  if (leadData.prescriptions.length > 0) flags.push("formulary_confirmation_recommended");
  if (flags.length > 0) {
    promises.push(
      supabase.from("tool_lead_flags").insert(
        flags.map(f => ({ lead_id: leadId, flag: f }))
      ).then()
    );
  }

  await Promise.all(promises);
  return leadId;
}
