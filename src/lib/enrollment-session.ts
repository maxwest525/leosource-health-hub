/**
 * TruEnroll shared enrollment session.
 *
 * The server row in `enrollment_sessions` is the source of truth. The browser
 * keeps only the unguessable access token plus a non-authoritative cache used
 * to paint instantly before the first round trip resolves.
 *
 * All reads and writes go through security-definer RPCs keyed on the token,
 * because consumers are anonymous and have no direct access to the table.
 */

import { supabase } from "@/integrations/supabase/client";
import { readWizardPrefill, clearWizardPrefill } from "@/lib/wizard-prefill";
import { readSavedIncome, clearSavedIncome } from "@/lib/income-storage";
import { agesToMembers } from "@/lib/adapters/applicant-adapter";

const TOKEN_KEY = "truenroll.session.token";
const CACHE_KEY = "truenroll.session.cache";

export type EnrollmentStatus =
  | "intake_in_progress"
  | "ready_for_agent_review"
  | "needs_consumer_correction"
  | "agent_approved"
  | "healthsherpa_handoff_created"
  | "enrollment_completion_unknown"
  | "enrollment_confirmed"
  | "follow_up_required";

export type EnrollmentRelationship = "primary" | "spouse" | "dependent";

/** Canonical household member. Every intake surface normalizes onto this shape. */
export type EnrollmentMember = {
  /** ISO date, YYYY-MM-DD. Preferred over a bare age everywhere. */
  dob: string;
  relationship: EnrollmentRelationship;
  tobacco: boolean;
  gender?: "male" | "female";
  pregnant?: boolean;
  disabled?: boolean;
  tribal?: boolean;
  income?: number;
};

export type SavedDoctor = {
  id: string;
  name: string;
  specialty?: string;
  city?: string;
};

export type SavedPrescription = {
  id: string;
  name: string;
  dosage?: string;
  isGeneric?: boolean;
  /** Explicit provenance for the identifier in `id`. */
  id_type?: "rxnorm" | "rxcui" | "healthsherpa";
  /** CMS / RxNorm concept id, when the drug came from the CMS drug search. */
  rxcui?: string;
  /** HealthSherpa catalog identifier, when the drug came from HealthSherpa. */
  hs_id?: string;
};

/** Builds a CMS/RxNorm-sourced prescription with explicit provenance. */
export const rxNormPrescription = (
  rxcui: string,
  name: string,
  dosage?: string,
): SavedPrescription => ({
  id: rxcui,
  id_type: "rxnorm",
  rxcui,
  name,
  ...(dosage ? { dosage } : {}),
});

/**
 * Reads the RxNorm CUI back out of a saved prescription.
 * Legacy rows saved before provenance existed carry a bare all-digit `id`,
 * which only the CMS drug search ever produced.
 */
export const prescriptionRxcui = (r: SavedPrescription): string | undefined =>
  r.rxcui ??
  (r as { rx_norm_identifier?: string }).rx_norm_identifier ??
  (r.id_type === "rxnorm" || r.id_type === "rxcui" ? r.id : undefined) ??
  (!r.id_type && !r.hs_id && /^\d+$/.test(r.id ?? "") ? r.id : undefined);


export type SelectedPlan = {
  planId: string;
  name: string;
  issuerName: string;
  metalLevel?: string;
  netPremium?: string;
  grossPremium?: string;
  /** HealthSherpa reports whether the plan supports API enrollment. */
  apiEnrollable?: boolean;
};

export type PolicyStatus = {
  application_status: string;
  policy_status: string;
  payment_status: string;
  effective_date: string | null;
  /** Documented HealthSherpa balances are reported in cents. */
  current_balance_cents: number | null;
  past_due_balance_cents: number | null;
  grace_period: string | null;
};


export type EnrollmentSession = {
  id: string;
  publicToken: string;
  status: EnrollmentStatus;
  zipCode: string | null;
  countyFips: string | null;
  state: string | null;
  householdSize: number | null;
  annualIncome: number | null;
  incomePeriod: "year" | "month" | null;
  effectiveDate: string | null;
  members: EnrollmentMember[];
  savedDoctors: SavedDoctor[];
  savedPrescriptions: SavedPrescription[];
  selectedPlan: SelectedPlan | null;
  comparedPlans: SelectedPlan[];
  contact: { firstName?: string; lastName?: string; email?: string; phone?: string } | null;
  externalId: string | null;
  healthsherpaConfirmationId: string | null;
  healthsherpaEnrollmentUrl: string | null;
  policyStatus: PolicyStatus;
  correctionNote: string | null;
  /** Fields an agent explicitly marked for consumer correction. */
  fieldCorrections: string[];
  handoffStatus: string | null;
  healthsherpaShoppingUrl: string | null;
  healthsherpaClientApplyUrl: string | null;

};

/** Fields a consumer surface is allowed to write. */
export type EnrollmentPatch = Partial<{
  zip_code: string;
  county_fips: string;
  state: string;
  household_size: number;
  annual_income: number;
  income_period: "year" | "month";
  effective_date: string;
  members: EnrollmentMember[];
  saved_doctors: SavedDoctor[];
  saved_prescriptions: SavedPrescription[];
  selected_plan: SelectedPlan;
  compared_plans: SelectedPlan[];
  contact: EnrollmentSession["contact"];
  status: "ready_for_agent_review";
}>;

const isBrowser = (): boolean => typeof window !== "undefined";

const readLocal = (key: string): string | null => {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeLocal = (key: string, value: string): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable - the server row still holds the truth */
  }
};

/* ------------------------------------------------------------------ */
/*  ROW MAPPING                                                        */
/* ------------------------------------------------------------------ */

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const UNKNOWN_STATUS: PolicyStatus = {
  application_status: "unknown",
  policy_status: "unknown",
  payment_status: "unknown",
  effective_date: null,
  current_balance_cents: null,
  past_due_balance_cents: null,
  grace_period: null,
};

const toPolicyStatus = (value: unknown): PolicyStatus => {
  const record = asRecord(value);
  if (!record) return UNKNOWN_STATUS;
  const str = (key: keyof PolicyStatus): string =>
    typeof record[key] === "string" && record[key] !== "" ? (record[key] as string) : "unknown";
  const nullable = (key: keyof PolicyStatus): string | null =>
    typeof record[key] === "string" ? (record[key] as string) : null;
  const cents = (key: keyof PolicyStatus): number | null =>
    typeof record[key] === "number" ? (record[key] as number) : null;
  return {
    application_status: str("application_status"),
    policy_status: str("policy_status"),
    payment_status: str("payment_status"),
    effective_date: nullable("effective_date"),
    current_balance_cents: cents("current_balance_cents"),
    past_due_balance_cents: cents("past_due_balance_cents"),
    grace_period: nullable("grace_period"),
  };
};


type SessionRow = Record<string, unknown>;

const mapRow = (row: SessionRow): EnrollmentSession => ({
  id: String(row.id),
  publicToken: String(row.public_token),
  status: row.status as EnrollmentStatus,
  zipCode: (row.zip_code as string) ?? null,
  countyFips: (row.county_fips as string) ?? null,
  state: (row.state as string) ?? null,
  householdSize: typeof row.household_size === "number" ? row.household_size : null,
  annualIncome: row.annual_income === null || row.annual_income === undefined ? null : Number(row.annual_income),
  incomePeriod: (row.income_period as "year" | "month") ?? null,
  effectiveDate: (row.effective_date as string) ?? null,
  members: asArray<EnrollmentMember>(row.members),
  savedDoctors: asArray<SavedDoctor>(row.saved_doctors),
  savedPrescriptions: asArray<SavedPrescription>(row.saved_prescriptions),
  selectedPlan: (asRecord(row.selected_plan) as SelectedPlan | null) ?? null,
  comparedPlans: asArray<SelectedPlan>(row.compared_plans),
  contact: (asRecord(row.contact) as EnrollmentSession["contact"]) ?? null,
  externalId: (row.external_id as string) ?? null,
  healthsherpaConfirmationId: (row.healthsherpa_confirmation_id as string) ?? null,
  healthsherpaEnrollmentUrl: (row.healthsherpa_enrollment_url as string) ?? null,
  policyStatus: toPolicyStatus(row.policy_status),
  correctionNote: (row.correction_note as string) ?? null,
  fieldCorrections: asArray<string>(row.field_corrections),
  handoffStatus: (row.handoff_status as string) ?? null,
  healthsherpaShoppingUrl: (row.healthsherpa_shopping_url as string) ?? null,
  healthsherpaClientApplyUrl: (row.healthsherpa_client_apply_url as string) ?? null,

});

const cacheSession = (session: EnrollmentSession): void => {
  writeLocal(CACHE_KEY, JSON.stringify(session));
};

/** Non-authoritative. Use only to paint before the first server read resolves. */
export const readCachedSession = (): EnrollmentSession | null => {
  const raw = readLocal(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EnrollmentSession;
  } catch {
    return null;
  }
};

export const getSessionToken = (): string | null => readLocal(TOKEN_KEY);

/* ------------------------------------------------------------------ */
/*  LEGACY MIGRATION                                                   */
/* ------------------------------------------------------------------ */

/**
 * Absorbs the two pre-consolidation sessionStorage keys so a visitor mid-flow
 * when this shipped does not lose their answers. Runs once, then clears them.
 */
const legacyPatch = (): EnrollmentPatch | null => {
  const prefill = readWizardPrefill();
  const income = readSavedIncome();
  if (!prefill && !income) return null;

  const patch: EnrollmentPatch = {};
  if (prefill) {
    if (prefill.zip) patch.zip_code = prefill.zip;
    patch.members = agesToMembers(prefill.ages, prefill.tobacco);
    patch.household_size = prefill.ages.length;
    if (typeof prefill.income === "number") patch.annual_income = prefill.income;
  }
  if (income) {
    patch.annual_income = income.period === "month" ? income.income * 12 : income.income;
    patch.income_period = income.period;
  }

  clearWizardPrefill();
  clearSavedIncome();
  return patch;
};

/* ------------------------------------------------------------------ */
/*  SERVER CALLS                                                       */
/* ------------------------------------------------------------------ */

const firstRow = (data: unknown): SessionRow | null => {
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as SessionRow;
};

/** Reads the session for the stored token. Returns null when there is none. */
export const loadEnrollmentSession = async (): Promise<EnrollmentSession | null> => {
  const token = getSessionToken();
  if (!token) return null;

  const { data, error } = await supabase.rpc("get_enrollment_session", { _public_token: token });
  if (error) throw new Error(error.message);

  const row = firstRow(data);
  if (!row) return null;

  const session = mapRow(row);
  cacheSession(session);
  return session;
};

/**
 * Guards against two mounts (React strict mode, or two tools racing) creating
 * two rows for the same visitor. Everyone awaits the first call.
 */
let ensureInFlight: Promise<EnrollmentSession> | null = null;

const createSession = async (): Promise<EnrollmentSession> => {
  const existing = await loadEnrollmentSession();
  if (existing) {
    // A visitor can bounce back through the hero finder after the session was
    // created. Absorb those answers once instead of dropping them.
    const late = isConsumerEditable(existing) ? legacyPatch() : null;
    return late ? await patchEnrollmentSession(late) : existing;
  }


  const { data, error } = await supabase.rpc("start_enrollment_session");
  if (error) throw new Error(error.message);

  const created = firstRow(data);
  if (!created) throw new Error("Could not start an enrollment session.");
  writeLocal(TOKEN_KEY, String(created.public_token));

  const migrated = legacyPatch();
  if (migrated) return await patchEnrollmentSession(migrated);

  const session = await loadEnrollmentSession();
  if (!session) throw new Error("Could not read the new enrollment session.");
  return session;
};

/** Returns the existing session, or creates one and migrates any legacy answers. */
export const ensureEnrollmentSession = async (): Promise<EnrollmentSession> => {
  if (!ensureInFlight) {
    ensureInFlight = createSession().finally(() => {
      ensureInFlight = null;
    });
  }
  return await ensureInFlight;
};

/** True while the consumer is still allowed to edit their own answers. */
export const isConsumerEditable = (session: EnrollmentSession | null): boolean =>
  session === null ||
  session.status === "intake_in_progress" ||
  session.status === "needs_consumer_correction";


/**
 * Merges a partial update into the server row. Only intake-stage sessions are
 * writable by the consumer; once an agent has it, the server rejects writes.
 */
export const patchEnrollmentSession = async (patch: EnrollmentPatch): Promise<EnrollmentSession> => {
  const token = getSessionToken();
  if (!token) throw new Error("No enrollment session started.");

  const { data, error } = await supabase.rpc("save_enrollment_session", {
    _public_token: token,
    _patch: patch as unknown as Record<string, never>,
  });
  if (error) throw new Error(error.message);

  const row = firstRow(data);
  if (!row) throw new Error("Enrollment session not found.");

  const session = mapRow(row);
  cacheSession(session);
  return session;
};

/** Marks the session ready for a licensed agent to review. */
export const submitForAgentReview = async (): Promise<EnrollmentSession> =>
  await patchEnrollmentSession({ status: "ready_for_agent_review" });
