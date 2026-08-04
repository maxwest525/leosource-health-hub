/**
 * Server-side HealthSherpa agent-assisted handoff + reconciliation.
 *
 * Every call is staff-gated: the caller's JWT must belong to an admin or agent.
 * The HealthSherpa API key never leaves this function.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HS_API_BASE = "https://api.one.healthsherpa.com";

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_handoff"),
    session_id: z.string().uuid(),
    regenerate: z.boolean().default(false),
    agent_note: z.string().max(2000).optional(),
    locale: z.enum(["en", "es"]).default("en"),
  }),
  z.object({ action: z.literal("mark_opened"), session_id: z.string().uuid() }),
  z.object({ action: z.literal("reconcile"), session_id: z.string().uuid() }),
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (code: string, message: string, status = 400) => json({ error: { code, message } }, status);

type SessionRow = Record<string, any>;

const AGE_MS = 365.2425 * 24 * 60 * 60 * 1000;
const ageFromDob = (dob: string): number => Math.floor((Date.now() - Date.parse(dob)) / AGE_MS);

/** Canonical session -> HealthSherpa agent-assisted enrollment session body. */
const buildHandoffBody = (row: SessionRow, locale: string, agentNote?: string) => {
  const members: any[] = Array.isArray(row.members) ? row.members : [];
  const contact = (row.contact ?? {}) as Record<string, string | undefined>;
  const doctors: any[] = Array.isArray(row.saved_doctors) ? row.saved_doctors : [];
  const rx: any[] = Array.isArray(row.saved_prescriptions) ? row.saved_prescriptions : [];
  const effectiveDate: string = row.effective_date ?? `${new Date().getFullYear() + 1}-01-01`;
  const planYear = Number(effectiveDate.slice(0, 4));

  const applicants = members.map((member, index) => ({
    member_id: `m${index + 1}`,
    relationship: member.relationship ?? (index === 0 ? "primary" : "dependent"),
    date_of_birth: member.dob,
    age: member.dob ? ageFromDob(member.dob) : undefined,
    gender: member.gender,
    uses_tobacco: Boolean(member.tobacco),
    pregnant: member.pregnant,
    blind_or_disabled: member.disabled,
    american_indian_alaska_native: member.tribal,
    ...(typeof member.income === "number"
      ? { income_sources: [{ type: "wages", amount: member.income, frequency: "yearly" }] }
      : {}),
  }));

  return {
    context: {
      product: "aca",
      exchange: "on_exchange",
      coverage_family: "medical",
      coverage_type: "medical",
      flow: "agent_assisted",
      plan_year: planYear,
      locale,
    },
    external_id: row.external_id,
    location: {
      zip_code: row.zip_code,
      fips_code: String(row.county_fips ?? "").padStart(5, "0"),
      state: String(row.state ?? "").toUpperCase(),
    },
    household: {
      household_size: Math.max(Number(row.household_size ?? applicants.length), applicants.length),
      annual_income: Number(row.annual_income ?? 0),
      effective_date: effectiveDate,
      applicants,
    },
    primary_contact: {
      first_name: contact.firstName,
      last_name: contact.lastName,
      email: contact.email,
      phone: contact.phone,
    },
    ...(doctors.some((d) => /^\d{10}$/.test(String(d.id)))
      ? { providers: doctors.filter((d) => /^\d{10}$/.test(String(d.id))).map((d) => ({ npi: String(d.id) })) }
      : {}),
    ...(rx.length > 0
      ? { prescriptions: rx.map((d) => ({ drug_id: String(d.id), name: d.name, dosage: d.dosage })) }
      : {}),
    ...(agentNote ? { agent_notes: agentNote } : {}),
  };
};

const UNKNOWN_STATUS = {
  application_status: "unknown",
  policy_status: "unknown",
  payment_status: "unknown",
  effective_date: null,
  paid_through_date: null,
  balance: null,
  past_due_balance: null,
  grace_period: null,
  last_status_update: null,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("HEALTHSHERPA_API_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return fail("unauthorized", "Sign in as an agent to continue.", 401);

  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asUser.auth.getUser();
  if (!userData?.user) return fail("unauthorized", "Sign in as an agent to continue.", 401);

  const { data: isStaff, error: staffError } = await asUser.rpc("is_staff", { _user_id: userData.user.id });
  if (staffError || isStaff !== true) return fail("forbidden", "Only licensed agents can run this action.", 403);

  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await req.json());
  } catch {
    return fail("invalid_request", "That request was missing or had invalid fields.", 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const actor = userData.user.email ?? userData.user.id;

  const { data: row, error: rowError } = await admin
    .from("enrollment_sessions")
    .select("*")
    .eq("id", parsed.session_id)
    .maybeSingle();
  if (rowError || !row) return fail("not_found", "That enrollment session no longer exists.", 404);

  const logEvent = async (event_type: string, detail: Record<string, unknown> = {}) => {
    await admin.from("enrollment_events").insert({ session_id: row.id, event_type, actor, detail });
  };

  /* ---------------- mark_opened ---------------- */
  if (parsed.action === "mark_opened") {
    await admin
      .from("enrollment_sessions")
      .update({ handoff_opened_at: new Date().toISOString(), status: "enrollment_in_progress" })
      .eq("id", row.id);
    await logEvent("handoff_opened");
    return json({ data: { ok: true } });
  }

  if (!apiKey) return fail("not_configured", "HEALTHSHERPA_API_KEY is not set.", 503);
  const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

  /* ---------------- create_handoff ---------------- */
  if (parsed.action === "create_handoff") {
    if (row.status !== "agent_approved" && !(parsed.regenerate && row.handoff_status === "created")) {
      return fail("not_approved", "The session must be agent-approved before a handoff can be created.", 409);
    }
    if (row.handoff_status === "created" && !parsed.regenerate) {
      return json({
        data: {
          already_created: true,
          shopping_url: row.healthsherpa_shopping_url,
          client_apply_url: row.healthsherpa_client_apply_url,
        },
      });
    }

    const externalId = row.external_id ?? `truenroll-${row.id}`;
    const idempotencyKey = parsed.regenerate ? crypto.randomUUID() : (row.handoff_idempotency_key ?? crypto.randomUUID());

    await admin
      .from("enrollment_sessions")
      .update({ external_id: externalId, handoff_idempotency_key: idempotencyKey, handoff_status: "requested" })
      .eq("id", row.id);
    await logEvent("handoff_requested", { idempotency_key: idempotencyKey, regenerate: parsed.regenerate });

    const body = buildHandoffBody({ ...row, external_id: externalId }, parsed.locale, parsed.agent_note ?? row.agent_note ?? undefined);

    let upstream: Response;
    try {
      upstream = await fetch(`${HS_API_BASE}/v1/enrollment-sessions`, {
        method: "POST",
        headers: { ...headers, "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      });
    } catch (_err) {
      await admin.from("enrollment_sessions").update({ handoff_status: "error" }).eq("id", row.id);
      await logEvent("handoff_error", { reason: "network" });
      return fail("upstream_error", "Could not reach HealthSherpa. Try again.", 502);
    }

    const requestId = upstream.headers.get("x-request-id");
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      await admin
        .from("enrollment_sessions")
        .update({ handoff_status: "error", handoff_request_id: requestId })
        .eq("id", row.id);
      await logEvent("handoff_error", { status: upstream.status, request_id: requestId, detail: detail.slice(0, 500) });
      return fail("upstream_error", "HealthSherpa rejected the handoff request.", 502);
    }

    const payload = await upstream.json();
    const data = payload?.data ?? payload ?? {};
    const shoppingUrl = data.shopping_url ?? data.urls?.shopping_url ?? null;
    const clientApplyUrl = data.client_apply_url ?? data.urls?.client_apply_url ?? null;

    await admin
      .from("enrollment_sessions")
      .update({
        status: "healthsherpa_handoff_created",
        handoff_status: "created",
        handoff_at: new Date().toISOString(),
        handoff_request_id: requestId,
        healthsherpa_enrollment_session_id: data.id ?? data.enrollment_session_id ?? null,
        healthsherpa_shopping_url: shoppingUrl,
        healthsherpa_client_apply_url: clientApplyUrl,
        healthsherpa_enrollment_url: clientApplyUrl ?? shoppingUrl,
      })
      .eq("id", row.id);
    await logEvent("handoff_created", { request_id: requestId, external_id: externalId });

    return json({ data: { shopping_url: shoppingUrl, client_apply_url: clientApplyUrl, request_id: requestId } });
  }

  /* ---------------- reconcile ---------------- */
  await logEvent("reconciliation_attempted");
  const attemptedAt = new Date().toISOString();

  const safeGet = async (path: string): Promise<any | null> => {
    try {
      const res = await fetch(`${HS_API_BASE}${path}`, { headers });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const externalId = row.external_id ?? "";
  const applications = await safeGet(
    `/v1/applications?exchange=on_exchange&external_id=${encodeURIComponent(externalId)}`,
  );
  const list: any[] = applications?.data?.applications ?? applications?.applications ?? applications?.data ?? [];
  const matched = Array.isArray(list)
    ? list.find((a) => String(a.external_id ?? "") === externalId) ?? null
    : null;

  const confirmationId = matched?.confirmation_id ?? row.healthsherpa_confirmation_id ?? null;
  if (matched) await logEvent("application_matched", { confirmation_id: confirmationId });

  const statusPayload = confirmationId
    ? await safeGet(`/v1/policies/status?confirmation_id=${encodeURIComponent(confirmationId)}`)
    : null;
  const s = statusPayload?.data ?? statusPayload ?? null;

  const nullable = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
  const known = (value: unknown): string => (typeof value === "string" && value !== "" ? value : "unknown");

  const policyStatus = s
    ? {
        application_status: known(s.application_status ?? matched?.status),
        policy_status: known(s.policy_status),
        payment_status: known(s.payment_status),
        effective_date: nullable(s.effective_date),
        paid_through_date: nullable(s.paid_through_date),
        balance: nullable(s.current_balance ?? s.balance),
        past_due_balance: nullable(s.past_due_balance),
        grace_period: nullable(s.grace_period_start_date ?? s.grace_period),
        last_status_update: nullable(s.updated_at) ?? attemptedAt,
      }
    : { ...UNKNOWN_STATUS, application_status: known(matched?.status), last_status_update: attemptedAt };

  const reconciliationError = !applications
    ? "HealthSherpa did not return an application list for this external ID."
    : !matched
      ? "No on-exchange application matched this external ID yet."
      : !s
        ? "No policy-status record is available yet."
        : null;

  await admin
    .from("enrollment_sessions")
    .update({
      healthsherpa_confirmation_id: confirmationId,
      policy_status: policyStatus,
      last_reconciled_at: s ? attemptedAt : row.last_reconciled_at,
      last_reconciliation_attempt_at: attemptedAt,
      reconciliation_error: reconciliationError,
      status:
        policyStatus.policy_status === "active" || policyStatus.application_status === "enrolled"
          ? "enrollment_confirmed"
          : reconciliationError
            ? "reconciliation_required"
            : row.status,
    })
    .eq("id", row.id);

  await logEvent("policy_status_updated", { policy_status: policyStatus, error: reconciliationError });

  return json({ data: { confirmation_id: confirmationId, policy_status: policyStatus, error: reconciliationError } });
});
