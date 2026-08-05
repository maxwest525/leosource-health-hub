import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildHandoffBody } from "./hs-body.ts";

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

Deno.test("agent-assisted contract", () => {
  const b = buildHandoffBody(row, "es", "x".repeat(900)) as any;
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
  assertEquals(b.notes.length, 500);

  const [p, spouse] = b.household.applicants;
  assertEquals(p.sex, "female");
  assert(!("gender" in p) && !("age" in p), "no gender/age fields");
  assertEquals(p.date_of_birth, "1980-05-04");
  assertEquals(p.first_name, "Ada");
  assertEquals(p.phone_number, "3055550142");
  assertEquals(p.prescriptions, [{ id: "hs_9911" }]);
  assert(!("prescriptions" in spouse));
  assert(!("first_name" in spouse));

  assertEquals(b.providers, ["1234567893"]);
});

Deno.test("omits empty optional blocks", () => {
  const b = buildHandoffBody({ ...row, saved_doctors: [], saved_prescriptions: [{ manual: true, name: "x" }] }, "en") as any;
  assert(!("providers" in b));
  assert(!("prescriptions" in b.household.applicants[0]));
  assert(!("notes" in b));
  assertEquals(b.context.locale, "en-US");
});
