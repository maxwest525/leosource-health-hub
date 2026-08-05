import { assert, assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  AGENT_NOTE_MAX,
  applicantPrescriptions,
  buildHandoffBody,
  normalizeRelationship,
  verifiedPrescriptions,
} from "./hs-body.ts";

const row = {
  external_id: "truenroll-abc",
  zip_code: "33101",
  county_fips: "12086",
  state: "fl",
  household_size: 2,
  annual_income: 42000,
  effective_date: "2027-01-01",
  members: [
    { relationship: "primary", dob: "1980-05-04", gender: "female", tobacco: false, income: 42000 },
    { relationship: "spouse", dob: "1982-02-02", gender: "male", tobacco: true },
  ],
  contact: { firstName: "Ada", lastName: "Ln", email: "a@example.com", phone: "(305) 555-0142" },
  saved_doctors: [{ id: "1234567893" }, { id: "manual-1", name: "Dr Unverified" }],
  saved_prescriptions: [{ id: "hs_9911", name: "Atorvastatin" }, { name: "Manual drug", manual: true }, { id: "" }],
};

/** Regression guard for the three rejected experimental placements. */
const assertNoExperimentalPlacement = (b: any) => {
  assert(!("prescriptions" in b), "no top-level prescriptions array");
  assert(!("client" in b), "no client block / client.prescriptions");
  for (const applicant of b.household.applicants) {
    for (const rx of applicant.prescriptions ?? []) {
      assert(!("applicant_index" in rx), "no applicant_index on prescription objects");
    }
  }
};

Deno.test("agent-assisted contract", () => {
  const b = buildHandoffBody(row, "es", "x".repeat(400)) as any;
  assertEquals(b.context, {
    product: "aca",
    exchange: "on_exchange",
    coverage_family: "medical",
    coverage_type: "medical",
    plan_year: 2027,
    flow: "agent_assisted",
    locale: "es-MX",
  });
  assertEquals(b.location, { zip_code: "33101", fips_code: "12086", state: "FL" });
  assertEquals(b.household.annual_income, 42000);
  assertEquals(b.household.household_size, 2);
  assert(!("primary_contact" in b), "no deprecated primary_contact");
  assert(!("plan_id" in b), "no top-level plan_id");
  assertEquals(b.notes.length, 400);

  const [p, spouse] = b.household.applicants;
  assertEquals(p.sex, "female");
  assert(!("gender" in p) && !("age" in p), "no gender/age fields");
  assertEquals(p.date_of_birth, "1980-05-04");
  assertEquals(p.first_name, "Ada");
  assertEquals(p.phone_number, "3055550142");
  assertEquals(p.prescriptions, [{ id: "hs_9911" }]);
  assert(!("prescriptions" in spouse), "prescriptions nest only on the primary applicant");
  assert(!("first_name" in spouse));
  assertNoExperimentalPlacement(b);

  assertEquals(b.providers, ["1234567893"]);
});

Deno.test("household has no effective_date but plan_year is derived from it", () => {
  const b = buildHandoffBody({ ...row, effective_date: "2028-03-01" }, "en") as any;
  assert(!("effective_date" in b.household), "closed household schema rejects effective_date");
  assertEquals(b.context.plan_year, 2028);
});

Deno.test("income sources carry only amount and optional employer", () => {
  const b = buildHandoffBody(
    { ...row, members: [{ relationship: "primary", dob: "1980-05-04", income: 51000, employer: "Acme" }] },
    "en",
  ) as any;
  assertEquals(b.household.applicants[0].income_sources, [{ amount: 51000, employer: "Acme" }]);

  const b2 = buildHandoffBody(row, "en") as any;
  assertEquals(Object.keys(b2.household.applicants[0].income_sources[0]), ["amount"]);
});

Deno.test("legacy child relationship normalizes to dependent", () => {
  const b = buildHandoffBody(
    {
      ...row,
      members: [
        { relationship: "primary", dob: "1980-05-04" },
        { relationship: "child", dob: "2012-05-04" },
      ],
    },
    "en",
  ) as any;
  assertEquals(b.household.applicants.map((a: any) => a.relationship), ["primary", "dependent"]);
  assertThrows(() => normalizeRelationship("cousin", 1), Error, "unsupported_relationship");
});

Deno.test("exactly one primary is required", () => {
  assertThrows(
    () =>
      buildHandoffBody(
        { ...row, members: [{ relationship: "primary", dob: "1980-01-01" }, { relationship: "primary", dob: "1981-01-01" }] },
        "en",
      ),
    Error,
    "exactly_one_primary_required",
  );
});

Deno.test("medication identifier provenance is preserved", () => {
  const refs = verifiedPrescriptions([
    { hs_id: "hs_9911" },
    { rxcui: "617314" },
    { rxnorm_id: "83367" },
    { id: "12345", id_type: "rxnorm" },
    { id: "hs_555" },
    { name: "unresolved only" },
  ]);
  assertEquals(refs, [
    { id: "hs_9911" },
    { rx_norm_identifier: "617314" },
    { rx_norm_identifier: "83367" },
    { rx_norm_identifier: "12345" },
    { id: "hs_555" },
  ]);
});

Deno.test("agent notes over the contract maximum are rejected, never truncated", () => {
  assertThrows(() => buildHandoffBody(row, "en", "y".repeat(AGENT_NOTE_MAX + 1)), Error, "agent_note_too_long");
  const b = buildHandoffBody(row, "en", "y".repeat(AGENT_NOTE_MAX)) as any;
  assertEquals(b.notes.length, AGENT_NOTE_MAX);
});

Deno.test("omits empty optional blocks", () => {
  const b = buildHandoffBody({ ...row, saved_doctors: [], saved_prescriptions: [{ manual: true, name: "x" }] }, "en") as any;
  assert(!("providers" in b));
  assert(!("prescriptions" in b.household.applicants[0]), "applicant key omitted when empty");
  assert(!("notes" in b));
  assertEquals(b.context.locale, "en-US");
  assertNoExperimentalPlacement(b);
});

/* --- Integration shapes: exactly what FindPrescriptions / ComparePlans persist --- */

Deno.test("FindPrescriptions saved shape keeps RxNorm provenance", () => {
  // rxNormPrescription(drug.rxcui, drug.name, drug.strength)
  const saved = [{ id: "617314", id_type: "rxnorm", rxcui: "617314", name: "Atorvastatin", dosage: "20 mg" }];
  assertEquals(verifiedPrescriptions(saved), [{ rx_norm_identifier: "617314" }]);

  const b = buildHandoffBody({ ...row, saved_prescriptions: saved }, "en") as any;
  const rx = b.household.applicants[0].prescriptions;
  assertEquals(rx, [{ rx_norm_identifier: "617314" }]);
  assert(!("id" in rx[0]), "no fabricated catalog id");
  assert(!("duration" in rx[0]), "no fabricated duration");
  assertNoExperimentalPlacement(b);
});

Deno.test("ComparePlans saved shape keeps RxNorm provenance", () => {
  const saved = [{ id: "83367", id_type: "rxnorm", rxcui: "83367", name: "Metformin HCl 500 mg" }];
  assertEquals(verifiedPrescriptions(saved), [{ rx_norm_identifier: "83367" }]);
});

Deno.test("legacy bare all-digit ids are treated as RxNorm", () => {
  assertEquals(verifiedPrescriptions([{ id: "617314", name: "Atorvastatin" }]), [
    { rx_norm_identifier: "617314" },
  ]);
});

Deno.test("explicit HealthSherpa catalog ids are never reinterpreted", () => {
  assertEquals(
    verifiedPrescriptions([
      { id: "998877", id_type: "healthsherpa", name: "HS catalog drug" },
      { hs_id: "112233", name: "HS catalog drug 2" },
      { id: "hs_555" },
    ]),
    [{ id: "998877" }, { id: "112233" }, { id: "hs_555" }],
  );
});

Deno.test("a corrected replacement note permits handoff body construction", () => {
  const b = buildHandoffBody(row, "en", "Verified income documents on file.") as any;
  assertEquals(b.notes, "Verified income documents on file.");
});

/* --- Documented /v1 nested prescription shape --- */

Deno.test("catalog ids stay in id and RxNorm CUIs never leak into id", () => {
  assertEquals(applicantPrescriptions([{ hs_id: "hs_9911" }, { rxcui: "617310" }]), [
    { id: "hs_9911" },
    { rx_norm_identifier: "617310" },
  ]);
});

Deno.test("duration is emitted only for a valid nonnegative integer", () => {
  assertEquals(applicantPrescriptions([{ rxcui: "617310", days_supply: 30 }]), [
    { rx_norm_identifier: "617310", duration: 30 },
  ]);
  assertEquals(applicantPrescriptions([{ rxcui: "617310", days_supply: -5 }]), [
    { rx_norm_identifier: "617310" },
  ]);
  assertEquals(applicantPrescriptions([{ rxcui: "617310" }]), [{ rx_norm_identifier: "617310" }]);
});

Deno.test("prescriptions follow the primary applicant position", () => {
  const b = buildHandoffBody(
    {
      ...row,
      members: [
        { relationship: "spouse", dob: "1982-02-02" },
        { relationship: "primary", dob: "1980-05-04" },
      ],
      saved_prescriptions: [{ rxcui: "617310" }],
    },
    "en",
  ) as any;
  assert(!("prescriptions" in b.household.applicants[0]));
  assertEquals(b.household.applicants[1].prescriptions, [{ rx_norm_identifier: "617310" }]);
  assertNoExperimentalPlacement(b);
});
