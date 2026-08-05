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

import { AGENT_NOTE_MAX, buildHandoffBody } from "./hs-body.ts";
import { findApplication, mapPolicySummary } from "./hs-reconcile.ts";

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
    // Hard boundary: the upstream contract allows at most 500 characters and we
    // never silently truncate an accepted agent note.
    agent_note: z.string().max(AGENT_NOTE_MAX).optional(),
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

const UNKNOWN_STATUS = {
  application_status: "unknown",
  policy_status: "unknown",
  payment_status: "unknown",
  effective_date: null as string | null,
  paid_through_date: null as string | null,
  current_balance_cents: null as number | null,
  past_due_balance_cents: null as number | null,
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
    return fail(
      "invalid_request",
      `That request was missing or had invalid fields. Agent notes must be ${AGENT_NOTE_MAX} characters or fewer.`,
      400,
    );
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
    // Preflight the note that will actually be sent, before any claim, so a
    // legacy over-limit stored note never leaves handoff_status changed.
    const effectiveNote = parsed.agent_note ?? row.agent_note ?? "";
    if (effectiveNote.length > AGENT_NOTE_MAX) {
      return fail(
        "agent_note_too_long",
        `The stored agent note is ${effectiveNote.length} characters. Replace it with ${AGENT_NOTE_MAX} characters or fewer before creating the handoff.`,
        422,
      );
    }
    // Atomic, NULL-inclusive claim inside a single row-locked transaction.
    const { data: claimData, error: claimError } = await admin.rpc("claim_handoff", {
      _session_id: row.id,
      _actor: actor,
      _external_id: `truenroll-${row.id}`,
      _idempotency_key: crypto.randomUUID(),
      _regenerate: parsed.regenerate,
    });
    if (claimError) return fail("claim_failed", "Could not reserve this handoff. Try again.", 500);

    const claim = (claimData ?? {}) as Record<string, any>;
    switch (claim.result) {
      case "not_found":
        return fail("not_found", "That enrollment session no longer exists.", 404);
      case "not_assigned":
        return fail("not_assigned", "Only the agent assigned to this case can run this action.", 403);
      case "in_progress":
        return fail("in_progress", "A handoff request for this case is already in flight.", 409);
      case "already_created":
        return json({
          data: {
            already_created: true,
            shopping_url: claim.shopping_url,
            client_apply_url: claim.client_apply_url,
          },
        });
      case "not_approved":
        return fail("not_approved", "The case must be agent-approved before a handoff can be created.", 409);
    }

    const externalId: string = claim.external_id;
    const idempotencyKey: string = claim.idempotency_key;
    const previousHandoffStatus: string | null = claim.previous_handoff_status ?? null;
    await logEvent("handoff_requested", { regenerate: parsed.regenerate });

    const restore = async (reason: string, detail: Record<string, unknown>) => {
      // Preserve the last known good handoff information on failure.
      await admin
        .from("enrollment_sessions")
        .update({ handoff_status: previousHandoffStatus === "created" ? "created" : "error" })
        .eq("id", row.id);
      await logEvent("handoff_error", { reason, ...detail });
    };

    let body: ReturnType<typeof buildHandoffBody>;
    try {
      body = buildHandoffBody(
        { ...row, external_id: externalId },
        parsed.locale,
        parsed.agent_note ?? row.agent_note ?? undefined,
      );
    } catch (e) {
      const reason = e instanceof Error ? e.message : "invalid_session";
      await restore("invalid_body", { reason });
      return fail("invalid_session", `This case cannot be sent to HealthSherpa: ${reason}.`, 422);
    }

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

  // 1. GET /v1/policy-status/applications  (limit/offset pagination)
  const listResult = await findApplication(safeGet, { externalId, planYear });

  if (listResult.outcome === "incomplete") {
    // Explicit incomplete-reconciliation error; prior stored status is preserved.
    await admin
      .from("enrollment_sessions")
      .update({
        last_reconciliation_attempt_at: attemptedAt,
        reconciliation_error: `Reconciliation was incomplete after scanning ${listResult.scanned} applications.`,
      })
      .eq("id", row.id);
    await logEvent("reconciliation_incomplete", { scanned: listResult.scanned });
    return fail("reconciliation_incomplete", "HealthSherpa pagination did not complete. Try again.", 502);
  }

  const matched = listResult.outcome === "found" ? listResult.application : null;
  const listReachable = listResult.outcome !== "unreachable";

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

  const previous = (row.policy_status ?? {}) as Record<string, unknown>;
  const policyStatus = s
    ? mapPolicySummary(s, matched, attemptedAt, rawStatuses)
    : {
        ...UNKNOWN_STATUS,
        ...previous,
        application_status: String(matched?.status ?? previous.application_status ?? "unknown"),
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
