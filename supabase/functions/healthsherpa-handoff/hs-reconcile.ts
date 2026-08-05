/** Pure helpers for HealthSherpa policy-status reconciliation. */

export const PAGE_LIMIT = 100;
/** Defensive cap. Crossing it is an explicit incomplete-reconciliation error. */
export const MAX_RECORDS = 5000;

export type Fetcher = (path: string) => Promise<any | null>;

export type ListResult =
  | { outcome: "found"; application: any; scanned: number }
  | { outcome: "not_found"; scanned: number }
  | { outcome: "unreachable"; scanned: number }
  | { outcome: "incomplete"; scanned: number };

const readList = (payload: any): any[] => {
  const list = payload?.applications ?? payload?.data?.applications ?? payload?.data ?? [];
  return Array.isArray(list) ? list : [];
};

/** limit/offset traversal. Never `page`/`per_page` — the endpoint rejects those. */
export const findApplication = async (
  get: Fetcher,
  opts: { externalId: string; planYear: number; limit?: number; maxRecords?: number },
): Promise<ListResult> => {
  const limit = opts.limit ?? PAGE_LIMIT;
  const maxRecords = opts.maxRecords ?? MAX_RECORDS;
  let offset = 0;
  let scanned = 0;

  while (true) {
    const payload = await get(
      `/v1/policy-status/applications?exchange=on_exchange&plan_year=${opts.planYear}&limit=${limit}&offset=${offset}`,
    );
    if (!payload) return { outcome: offset === 0 ? "unreachable" : "incomplete", scanned };

    const list = readList(payload);
    scanned += list.length;

    const match = opts.externalId
      ? (list.find((a) => String(a?.external_id ?? "") === opts.externalId) ?? null)
      : null;
    if (match) return { outcome: "found", application: match, scanned };

    if (list.length === 0 || list.length < limit) return { outcome: "not_found", scanned };

    const meta = payload?.meta ?? payload?.pagination ?? {};
    const total = Number(meta.total ?? meta.total_count ?? meta.count ?? 0);
    offset += list.length;
    if (total && offset >= total) return { outcome: "not_found", scanned };
    if (scanned >= maxRecords) return { outcome: "incomplete", scanned };
  }
};

const nullable = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : typeof value === "number" ? String(value) : null;
const known = (value: unknown): string => nullable(value) ?? "unknown";

/** Documented balance fields are in cents and stay in cents (explicitly labelled). */
export const mapPolicySummary = (
  s: Record<string, any>,
  matched: Record<string, any> | null,
  attemptedAt: string,
  rawStatuses: unknown[],
) => ({
  application_status: known(s.application_status ?? matched?.status),
  policy_status: known(s.policy_status ?? s.status),
  payment_status: known(s.payment_status),
  effective_date: nullable(s.effective_date),
  paid_through_date: nullable(s.paid_through_date),
  current_balance_cents: typeof s.current_balance_cents === "number" ? s.current_balance_cents : null,
  past_due_balance_cents: typeof s.past_due_balance_cents === "number" ? s.past_due_balance_cents : null,
  grace_period: nullable(s.grace_period_start_date ?? s.grace_period),
  last_status_update: nullable(s.updated_at) ?? attemptedAt,
  raw_policy_statuses: rawStatuses,
});
