/**
 * Server-side HealthSherpa agent-assisted handoff + policy-status reconciliation.
 *
 * Every call is staff-gated AND assignment-gated: the caller must be a licensed
 * agent (admin/agent role) AND the agent currently assigned to the case.
 * The HealthSherpa API key never leaves this function, and no consumer PII is
 * written to logs or audit events.
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";

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

const LOCALES: Record<string, string> = { en: "en-US", es: "es-MX" };

const digits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

/** Ten-digit NPIs only. Manually entered / unverified doctors are omitted. */
const verifiedNpis = (doctors: unknown): string[] => {
  if (!Array.isArray(doctors)) return [];
  const out = new Set<string>();
  for (const d of doctors) {
    const raw = (d ?? {}) as Record<string, unknown>;
    if (raw.verified === false || raw.manual === true) continue;
    const npi = digits(raw.npi ?? raw.id);
    if (/^\d{10}$/.test(npi)) out.add(npi);
  }
  return [...out];
};

/** Verified HealthSherpa medication id or RxNorm id only. Never a name fallback. */
const verifiedPrescriptions = (rx: unknown): Array<{ id: string }> => {
  if (!Array.isArray(rx)) return [];
  const out = new Map<string, { id: string }>();
  for (const item of rx) {
    const raw = (item ?? {}) as Record<string, unknown>;
    if (raw.verified === false || raw.manual === true || raw.unresolved === true) continue;
    const id = String(raw.hs_id ?? raw.medication_id ?? raw.rxcui ?? raw.rxnorm_id ?? raw.id ?? "").trim();
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) continue;
    out.set(id, { id });
  }
  return [...out.values()];
};

/** Canonical session -> HealthSherpa agent-assisted enrollment-session body. */
const buildHandoffBody = (row: SessionRow, locale: string, agentNote?: string) => {
  const members: any[] = Array.isArray(row.members) ? row.members : [];
  const contact = (row.contact ?? {}) as Record<string, string | undefined>;
  const effectiveDate: string = row.effective_date ?? `${new Date().getFullYear() + 1}-01-01`;
  const planYear = Number(effectiveDate.slice(0, 4));
  const prescriptions = verifiedPrescriptions(row.saved_prescriptions);
  const providers = verifiedNpis(row.saved_doctors);

  const primaryIndex = Math.max(
    0,
    members.findIndex((m) => (m?.relationship ?? "primary") === "primary"),
  );

  const applicants = members.map((member, index) => {
    const isPrimary = index === primaryIndex;
    const sex = String(member?.sex ?? member?.gender ?? "").toLowerCase();
    return {
      relationship: member?.relationship ?? (index === 0 ? "primary" : "dependent"),
      date_of_birth: member?.dob,
      ...(sex === "male" || sex === "female" ? { sex } : {}),
      uses_tobacco: Boolean(member?.tobacco),
      ...(typeof member?.income === "number"
        ? { income_sources: [{ type: "wages", amount: member.income, frequency: "yearly" }] }
        : {}),
      ...(isPrimary
        ? {
            first_name: contact.firstName,
            last_name: contact.lastName,
            ...(contact.email ? { email: contact.email } : {}),
            ...(contact.phone ? { phone_number: digits(contact.phone) } : {}),
          }
        : {}),
      ...(isPrimary && prescriptions.length > 0 ? { prescriptions } : {}),
    };
  });

  return {
    context: {
      product: "aca",
      exchange: "on_exchange",
      coverage_family: "medical",
      coverage_type: "medical",
      plan_year: planYear,
      flow: "agent_assisted",
      locale: LOCALES[locale] ?? "en-US",
    },
    external_id: row.external_id,
    location: {
      zip_code: String(row.zip_code ?? ""),
      fips_code: String(row.county_fips ?? "").padStart(5, "0"),
      state: String(row.state ?? "").toUpperCase(),
    },
    household: {
      annual_income: Number(row.annual_income ?? 0),
      household_size: Math.max(Number(row.household_size ?? applicants.length), applicants.length),
      effective_date: effectiveDate,
      applicants,
    },
    ...(providers.length > 0 ? { providers } : {}),
    ...(agentNote ? { notes: agentNote.slice(0, 500) } : {}),
  };
};

const UNKNOWN_STATUS = {
  application_status: "unknown",
  policy_status: "unknown",
  payment_status: "unknown",
  effective_date: null as string | null,
  paid_through_date: null as string | null,
  balance: null as string | null,
  past_due_balance: null as string | null,
  grace_period: null as string | null,
  last_status_update: null as string | null,
};

const ACTIVE_POLICY_STATUSES = new Set(["effectuated", "active", "in_force", "enrolled"]);

const pickLinks = (payload: any): { shopping: string | null; apply: string | null } => {
  const links = payload?.links ?? payload?.data?.links ?? {};
  const shopping = typeof links.shopping_url === "string" && links.shopping_url ? links.shopping_url : null;
  const apply = typeof links.client_apply_url === "string" && links.client_apply_url ? links.client_apply_url : null;
  return { shopping, apply };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("HEALTHSHERPA_API_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return fail("unauthorized", "Sign in as an agent to continue.", 401);

  const asUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
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

  if (row.assigned_agent !== actor) {
    return fail("not_assigned", "Only the agent assigned to this case can run this action.", 403);
  }

  const logEvent = async (event_type: string, detail: Record<string, unknown> = {}) => {
    await admin.from("enrollment_events").insert({ session_id: row.id, event_type, actor, detail });
  };

  /* ---------------- mark_opened ---------------- */
  if (parsed.action === "mark_opened") {
    const url = row.healthsherpa_client_apply_url ?? row.healthsherpa_shopping_url;
    if (row.handoff_status !== "created" || !url) {
      return fail("no_handoff", "No HealthSherpa handoff has been created for this case yet.", 409);
    }
    if (row.handoff_opened_at) return json({ data: { ok: true, already_opened: true } });
    if (row.status !== "healthsherpa_handoff_created") {
      return fail("invalid_state", "This case is not in the handoff-created state.", 409);
    }

    const { data: updated } = await admin
      .from("enrollment_sessions")
      .update({ handoff_opened_at: new Date().toISOString(), status: "enrollment_in_progress" })
      .eq("id", row.id)
      .eq("status", "healthsherpa_handoff_created")
      .select("id");
    if (!updated?.length) return json({ data: { ok: true, already_opened: true } });

    await logEvent("handoff_opened");
    return json({ data: { ok: true } });
  }

  if (!apiKey) return fail("not_configured", "The HealthSherpa API key is not configured.", 503);
  const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

  /* ---------------- create_handoff ---------------- */
  if (parsed.action === "create_handoff") {
    if (row.handoff_status === "created" && !parsed.regenerate) {
      return json({
        data: {
          already_created: true,
          shopping_url: row.healthsherpa_shopping_url,
          client_apply_url: row.healthsherpa_client_apply_url,
        },
      });
    }
    if (row.status !== "agent_approved" && !(parsed.regenerate && row.handoff_status === "created")) {
      return fail("not_approved", "The case must be agent-approved before a handoff can be created.", 409);
    }

    const externalId = row.external_id ?? `truenroll-${row.id}`;
    // A normal retry reuses the stored idempotency key; only an explicit
    // regeneration mints a new one.
    const idempotencyKey = parsed.regenerate
      ? crypto.randomUUID()
      : (row.handoff_idempotency_key ?? crypto.randomUUID());

    // Concurrency guard: only one caller may move the row out of its current
    // handoff state into "requested".
    const { data: claimed } = await admin
      .from("enrollment_sessions")
      .update({ external_id: externalId, handoff_idempotency_key: idempotencyKey, handoff_status: "requested" })
      .eq("id", row.id)
      .not("handoff_status", "eq", "requested")
      .select("id");
    if (!claimed?.length) {
      return fail("in_progress", "A handoff request for this case is already in flight.", 409);
    }
    await logEvent("handoff_requested", { regenerate: parsed.regenerate });

    const body = buildHandoffBody(
      { ...row, external_id: externalId },
      parsed.locale,
      parsed.agent_note ?? row.agent_note ?? undefined,
    );

    const restore = async (reason: string, detail: Record<string, unknown>) => {
      // Preserve the last known good handoff information on failure.
      await admin
        .from("enrollment_sessions")
        .update({ handoff_status: row.handoff_status === "created" ? "created" : "error" })
        .eq("id", row.id);
      await logEvent("handoff_error", { reason, ...detail });
    };

    let upstream: Response;
    try {
      upstream = await fetch(`${HS_API_BASE}/v1/enrollment-sessions`, {
        method: "POST",
        headers: { ...headers, "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(body),
      });
    } catch {
      await restore("network", {});
      return fail("upstream_error", "Could not reach HealthSherpa. Try again.", 502);
    }

    const requestId = upstream.headers.get("x-request-id");
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      await restore("rejected", { status: upstream.status, request_id: requestId, detail: detail.slice(0, 500) });
      await admin.from("enrollment_sessions").update({ handoff_request_id: requestId }).eq("id", row.id);
      return fail("upstream_error", "HealthSherpa rejected the handoff request.", 502);
    }

    const payload = await upstream.json().catch(() => ({}));
    const { shopping, apply } = pickLinks(payload);
    if (!shopping && !apply) {
      await restore("no_links", { request_id: requestId });
      return fail("upstream_error", "HealthSherpa did not return an enrollment link.", 502);
    }

    const data = payload?.data ?? payload ?? {};
    await admin
      .from("enrollment_sessions")
      .update({
        status: "healthsherpa_handoff_created",
        handoff_status: "created",
        handoff_at: new Date().toISOString(),
        handoff_request_id: requestId,
        healthsherpa_enrollment_session_id: data.id ?? data.enrollment_session_id ?? null,
        healthsherpa_shopping_url: shopping,
        healthsherpa_client_apply_url: apply,
        healthsherpa_enrollment_url: apply ?? shopping,
      })
      .eq("id", row.id);
    await logEvent("handoff_created", { request_id: requestId, external_id: externalId });

    return json({ data: { shopping_url: shopping, client_apply_url: apply, request_id: requestId } });
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
  const planYear = Number(String(row.effective_date ?? "").slice(0, 4)) || new Date().getFullYear();

  // 1. GET /v1/policy-status/applications  (paginated)
  let matched: any = null;
  let listReachable = false;
  for (let page = 1; page <= 20 && !matched; page += 1) {
    const listPayload = await safeGet(
      `/v1/policy-status/applications?exchange=on_exchange&plan_year=${planYear}&page=${page}&per_page=100`,
    );
    if (!listPayload) break;
    listReachable = true;
    const list: any[] = listPayload?.applications ?? listPayload?.data?.applications ?? listPayload?.data ?? [];
    if (!Array.isArray(list) || list.length === 0) break;
    matched = list.find((a) => String(a?.external_id ?? "") === externalId && externalId !== "") ?? null;
    const meta = listPayload?.meta ?? listPayload?.pagination ?? {};
    const totalPages = Number(meta.total_pages ?? meta.pages ?? 0);
    if (totalPages && page >= totalPages) break;
    if (!totalPages && list.length < 100) break;
  }

  const confirmationId = matched?.confirmation_id ?? row.healthsherpa_confirmation_id ?? null;
  if (matched) await logEvent("application_matched", { has_confirmation_id: Boolean(confirmationId) });

  // 2. GET /v1/policy-status/applications/{confirmation_id}
  const detailPayload = confirmationId
    ? await safeGet(
        `/v1/policy-status/applications/${encodeURIComponent(confirmationId)}?exchange=on_exchange&plan_year=${planYear}`,
      )
    : null;

  const rawStatuses: any[] = Array.isArray(detailPayload?.policy_statuses)
    ? detailPayload.policy_statuses
    : Array.isArray(detailPayload?.data?.policy_statuses)
      ? detailPayload.data.policy_statuses
      : [];
  const s = rawStatuses[0] ?? null;

  const nullable = (value: unknown): string | null =>
    typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : null;
  const known = (value: unknown): string => nullable(value) ?? "unknown";

  const previous = (row.policy_status ?? {}) as Record<string, unknown>;
  const policyStatus = s
    ? {
        application_status: known(s.application_status ?? matched?.status),
        policy_status: known(s.policy_status ?? s.status),
        payment_status: known(s.payment_status),
        effective_date: nullable(s.effective_date),
        paid_through_date: nullable(s.paid_through_date),
        balance: nullable(s.current_balance ?? s.balance),
        past_due_balance: nullable(s.past_due_balance),
        grace_period: nullable(s.grace_period_start_date ?? s.grace_period),
        last_status_update: nullable(s.updated_at) ?? attemptedAt,
        raw_policy_statuses: rawStatuses,
      }
    : {
        ...UNKNOWN_STATUS,
        ...previous,
        application_status: known(matched?.status ?? previous.application_status),
        last_status_update: attemptedAt,
      };

  const reconciliationError = !listReachable
    ? "HealthSherpa did not return a policy-status application list."
    : !matched
      ? "No on-exchange application matched this case yet."
      : !s
        ? "No policy-status record is available yet."
        : null;

  const isActive =
    ACTIVE_POLICY_STATUSES.has(String(policyStatus.policy_status).toLowerCase()) ||
    ACTIVE_POLICY_STATUSES.has(String(policyStatus.application_status).toLowerCase());

  await admin
    .from("enrollment_sessions")
    .update({
      healthsherpa_confirmation_id: confirmationId,
      policy_status: policyStatus,
      last_reconciled_at: s ? attemptedAt : row.last_reconciled_at,
      last_reconciliation_attempt_at: attemptedAt,
      reconciliation_error: reconciliationError,
      status: isActive ? "enrollment_confirmed" : reconciliationError ? "reconciliation_required" : row.status,
    })
    .eq("id", row.id);

  await logEvent("policy_status_updated", {
    policy_status: policyStatus.policy_status,
    application_status: policyStatus.application_status,
    payment_status: policyStatus.payment_status,
    error: reconciliationError,
  });

  return json({ data: { confirmation_id: confirmationId, policy_status: policyStatus, error: reconciliationError } });
});
