/**
 * Staff-side client for the enrollment review queue.
 *
 * Reads go straight through RLS (staff-only select); writes go through the
 * security-definer agent RPCs so every action lands in the audit history.
 */

import { supabase } from "@/integrations/supabase/client";
import type { EnrollmentSession } from "@/lib/enrollment-session";

export type ReviewStatus =
  | "intake_in_progress"
  | "awaiting_agent_review"
  | "in_agent_review"
  | "needs_consumer_correction"
  | "agent_approved"
  | "handoff_created"
  | "enrollment_in_progress"
  | "completed"
  | "reconciliation_required"
  | "follow_up_required";

/** DB enum value -> review-queue status vocabulary. */
export const toReviewStatus = (dbStatus: string): ReviewStatus => {
  switch (dbStatus) {
    case "ready_for_agent_review":
      return "awaiting_agent_review";
    case "healthsherpa_handoff_created":
      return "handoff_created";
    case "enrollment_completion_unknown":
      return "reconciliation_required";
    case "enrollment_confirmed":
      return "completed";
    default:
      return dbStatus as ReviewStatus;
  }
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  intake_in_progress: "Intake in progress",
  awaiting_agent_review: "Awaiting agent review",
  in_agent_review: "In agent review",
  needs_consumer_correction: "Needs consumer correction",
  agent_approved: "Agent approved",
  handoff_created: "Handoff created",
  enrollment_in_progress: "Enrollment in progress",
  completed: "Completed",
  reconciliation_required: "Reconciliation required",
  follow_up_required: "Follow-up required",
};

export type ReviewRecord = EnrollmentSession & {
  reviewStatus: ReviewStatus;
  assignedAgent: string | null;
  agentNote: string | null;
  updatedAt: string;
  handoffAt: string | null;
  lastReconciledAt: string | null;
  lastReconciliationAttemptAt: string | null;
  reconciliationError: string | null;
  handoffRequestId: string | null;
};

export type EnrollmentEvent = {
  id: string;
  eventType: string;
  actor: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

type Row = Record<string, unknown>;

const arr = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const rec = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

export const mapReviewRow = (row: Row): ReviewRecord => ({
  id: String(row.id),
  publicToken: String(row.public_token ?? ""),
  status: row.status as EnrollmentSession["status"],
  reviewStatus: toReviewStatus(String(row.status)),
  zipCode: (row.zip_code as string) ?? null,
  countyFips: (row.county_fips as string) ?? null,
  state: (row.state as string) ?? null,
  householdSize: typeof row.household_size === "number" ? row.household_size : null,
  annualIncome: row.annual_income === null || row.annual_income === undefined ? null : Number(row.annual_income),
  incomePeriod: (row.income_period as "year" | "month") ?? null,
  effectiveDate: (row.effective_date as string) ?? null,
  members: arr(row.members),
  savedDoctors: arr(row.saved_doctors),
  savedPrescriptions: arr(row.saved_prescriptions),
  selectedPlan: (rec(row.selected_plan) as EnrollmentSession["selectedPlan"]) ?? null,
  comparedPlans: arr(row.compared_plans),
  contact: (rec(row.contact) as EnrollmentSession["contact"]) ?? null,
  externalId: (row.external_id as string) ?? null,
  healthsherpaConfirmationId: (row.healthsherpa_confirmation_id as string) ?? null,
  healthsherpaEnrollmentUrl: (row.healthsherpa_enrollment_url as string) ?? null,
  healthsherpaShoppingUrl: (row.healthsherpa_shopping_url as string) ?? null,
  healthsherpaClientApplyUrl: (row.healthsherpa_client_apply_url as string) ?? null,
  handoffStatus: (row.handoff_status as string) ?? null,
  handoffRequestId: (row.handoff_request_id as string) ?? null,
  policyStatus: (rec(row.policy_status) as EnrollmentSession["policyStatus"]) ?? {
    application_status: "unknown",
    policy_status: "unknown",
    payment_status: "unknown",
    effective_date: null,
    balance: null,
    grace_period: null,
  },
  correctionNote: (row.correction_note as string) ?? null,
  fieldCorrections: arr<string>(row.field_corrections),
  assignedAgent: (row.assigned_agent as string) ?? null,
  agentNote: (row.agent_note as string) ?? null,
  updatedAt: String(row.updated_at ?? ""),
  handoffAt: (row.handoff_at as string) ?? null,
  lastReconciledAt: (row.last_reconciled_at as string) ?? null,
  lastReconciliationAttemptAt: (row.last_reconciliation_attempt_at as string) ?? null,
  reconciliationError: (row.reconciliation_error as string) ?? null,
});

/** Everything past intake, newest activity first. */
export const listReviewQueue = async (): Promise<ReviewRecord[]> => {
  const { data, error } = await supabase
    .from("enrollment_sessions")
    .select("*")
    .neq("status", "intake_in_progress")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => mapReviewRow(row as Row));
};

export const listEnrollmentEvents = async (sessionId: string): Promise<EnrollmentEvent[]> => {
  const { data, error } = await supabase
    .from("enrollment_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: String(row.id),
    eventType: String(row.event_type),
    actor: (row.actor as string) ?? null,
    detail: (rec(row.detail) ?? {}) as Record<string, unknown>,
    createdAt: String(row.created_at),
  }));
};

const callAction = async (fn: string, args: Record<string, unknown>): Promise<ReviewRecord> => {
  const { data, error } = await supabase.rpc(fn as "agent_claim_review", args as never);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? (data[0] as Row | undefined) : undefined;
  if (!row) throw new Error("That action is not allowed in the session's current state.");
  return mapReviewRow(row);
};

export const claimReview = (sessionId: string) => callAction("agent_claim_review", { _session_id: sessionId });
export const releaseReview = (sessionId: string) => callAction("agent_release_review", { _session_id: sessionId });
export const approveReview = (sessionId: string) => callAction("agent_approve_review", { _session_id: sessionId });
export const addAgentNote = (sessionId: string, note: string) =>
  callAction("agent_add_note", { _session_id: sessionId, _note: note });
export const requestCorrection = (sessionId: string, note: string, fields: string[]) =>
  callAction("agent_request_correction", { _session_id: sessionId, _note: note, _fields: fields });

type HandoffResult = {
  shopping_url: string | null;
  client_apply_url: string | null;
  request_id?: string | null;
  already_created?: boolean;
};

const invokeHandoff = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("healthsherpa-handoff", { body });
  if (error) throw new Error(error.message);
  const payload = data as { data?: T; error?: { message?: string } };
  if (payload?.error) throw new Error(payload.error.message ?? "HealthSherpa request failed.");
  return payload.data as T;
};

export const createHandoff = (sessionId: string, options?: { regenerate?: boolean; agentNote?: string }) =>
  invokeHandoff<HandoffResult>({
    action: "create_handoff",
    session_id: sessionId,
    regenerate: options?.regenerate ?? false,
    ...(options?.agentNote ? { agent_note: options.agentNote } : {}),
  });

export const reconcileSession = (sessionId: string) =>
  invokeHandoff<{ confirmation_id: string | null; error: string | null }>({
    action: "reconcile",
    session_id: sessionId,
  });
