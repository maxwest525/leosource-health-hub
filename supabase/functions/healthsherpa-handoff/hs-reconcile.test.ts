import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { findApplication, mapPolicySummary } from "./hs-reconcile.ts";

const makeApi = (total: number, matchAt: number | null, opts: { meta?: boolean } = {}) => {
  const calls: string[] = [];
  const get = (path: string) => {
    calls.push(path);
    const url = new URL(`https://x${path}`);
    const limit = Number(url.searchParams.get("limit"));
    const offset = Number(url.searchParams.get("offset"));
    assert(!url.searchParams.has("page"), "must not send page");
    assert(!url.searchParams.has("per_page"), "must not send per_page");
    const slice = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({
      external_id: offset + i === matchAt ? "truenroll-abc" : `other-${offset + i}`,
      confirmation_id: `cid-${offset + i}`,
    }));
    return Promise.resolve({ applications: slice, ...(opts.meta ? { meta: { total } } : {}) });
  };
  return { get, calls };
};

Deno.test("limit/offset traversal beyond the old 20-page cap", async () => {
  const api = makeApi(3000, 2500);
  const res = await findApplication(api.get, { externalId: "truenroll-abc", planYear: 2027 });
  assertEquals(res.outcome, "found");
  assert(api.calls.length > 20, `traversed ${api.calls.length} batches`);
  assertEquals(api.calls[0].includes("limit=100&offset=0"), true);
});

Deno.test("terminates on a short final batch", async () => {
  const api = makeApi(150, null);
  const res = await findApplication(api.get, { externalId: "truenroll-abc", planYear: 2027 });
  assertEquals(res.outcome, "not_found");
  assertEquals(api.calls.length, 2);
});

Deno.test("terminates on an empty batch and on pagination metadata", async () => {
  const empty = makeApi(0, null);
  assertEquals((await findApplication(empty.get, { externalId: "a", planYear: 2027 })).outcome, "not_found");

  const metaApi = makeApi(200, null, { meta: true });
  const res = await findApplication(metaApi.get, { externalId: "a", planYear: 2027 });
  assertEquals(res.outcome, "not_found");
  assertEquals(metaApi.calls.length, 2);
});

Deno.test("safety cap returns an explicit incomplete result", async () => {
  const api = makeApi(10000, null);
  const res = await findApplication(api.get, { externalId: "a", planYear: 2027, maxRecords: 300 });
  assertEquals(res.outcome, "incomplete");
  assertEquals(res.scanned, 300);
});

Deno.test("unreachable list on first call", async () => {
  const res = await findApplication(() => Promise.resolve(null), { externalId: "a", planYear: 2027 });
  assertEquals(res.outcome, "unreachable");
});

Deno.test("maps documented cents balances", () => {
  const summary = mapPolicySummary(
    {
      application_status: "submitted",
      policy_status: "effectuated",
      payment_status: "paid",
      current_balance_cents: 12345,
      past_due_balance_cents: 0,
      updated_at: "2027-01-05T00:00:00Z",
    },
    { status: "submitted" },
    "2027-01-06T00:00:00Z",
    [],
  );
  assertEquals(summary.current_balance_cents, 12345);
  assertEquals(summary.past_due_balance_cents, 0);
  assert(!("balance" in summary), "no obsolete balance field");
  assert(!("past_due_balance" in summary), "no obsolete past_due_balance field");

  const missing = mapPolicySummary({}, null, "2027-01-06T00:00:00Z", []);
  assertEquals(missing.current_balance_cents, null);
  assertEquals(missing.past_due_balance_cents, null);
});
