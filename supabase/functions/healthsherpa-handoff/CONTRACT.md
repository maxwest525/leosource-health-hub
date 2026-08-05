# HealthSherpa prescription handling: intentional omission, documented shapes, blockers

## 0. Decision: prescriptions are intentionally omitted from the handoff

`saved_prescriptions` is an **optional TruEnroll household-planning aid**. It is
**intentionally ignored** by `buildHandoffBody`: **no prescription field is
emitted anywhere** in the HealthSherpa `/v1/enrollment-sessions` request — not
nested on an applicant, not at the top level, not under a `client` block.

This omission is deliberate, not a gap:

- No prescription placement has ever been accepted by `/v1/enrollment-sessions`
  (section 2). Emitting one only causes HTTP 400s.
- The only documented prescription path is the Intake Forms endpoint
  (section 3), whose credentials are not available (section 4).
- Prescriptions never affect eligibility, subsidy, or the plans a household can
  enroll in; they only decorate a shopping deeplink on the unimplemented Intake
  path. Dropping them is lossless for the enrollment handoff.

**No live HealthSherpa request is required to validate this behaviour.** The
omission is verified purely by the unit assertions in `hs-body.test.ts`
(`assertNoPrescriptionsAnywhere`, and the deep-equality check that a row with a
populated `saved_prescriptions` array produces a byte-identical payload to the
same row with an empty array). All prescription-shaping code and exports have
been removed from `hs-body.ts`.

## 1. Documented `/v1/enrollment-sessions` request shape (implemented)

`POST https://api.one.healthsherpa.com/v1/enrollment-sessions`

The builder emits the closed household shape below. It carries **no
prescription field** by design (section 0).

```jsonc
{
  "context":  { "product": "aca", "exchange": "on_exchange", "coverage_family": "medical",
                "coverage_type": "medical", "plan_year": 2027, "flow": "agent_assisted",
                "locale": "en-US" },
  "external_id": "truenroll-<session id>",
  "location": { "zip_code": "33101", "fips_code": "12086", "state": "FL" },
  "household": {
    "annual_income": 42000,
    "household_size": 2,
    "applicants": [
      { "relationship": "primary", "date_of_birth": "1980-05-04", "sex": "female",
        "uses_tobacco": false, "income_sources": [{ "amount": 42000 }],
        "first_name": "…", "last_name": "…", "email": "…", "phone_number": "…" }
    ]
  },
  "providers": ["1234567893"],
  "notes": "<= 500 characters"
}
```

There is no `prescriptions` key on any applicant, no top-level `prescriptions`
array, and no `client.prescriptions` container.

## 2. Live rejections on `/v1/enrollment-sessions` (2026-08-05)

Four authorized non-consumer validation requests. **No prescription placement
has ever been accepted by `/v1/enrollment-sessions`.** These historical results
are why prescriptions are omitted; no further live probing is needed.

| Request ID | Placement attempted | Validator response |
| --- | --- | --- |
| `6654bbdb-88b5-4080-9cb3-976fa92eb1d2` | `household.applicants[].prescriptions` with only `rx_norm_identifier` | HTTP 400 - `client: ["Client prescriptions must be provided in this format [{id: , duration: , applicant_index: , rx_norm_identifier: }]"]` |
| `6a8ff4cb-a00e-414e-ad4c-9e840f4997df` | top-level `client.prescriptions` | HTTP 400 - `client.prescriptions: Prescriptions is not a recognized field` |
| `e6a8a9b1-6d87-4ffd-84ae-cf6bb9fc06b1` | `household.applicants[].prescriptions[].applicant_index` | HTTP 400 - `Applicant index is not a recognized field` |
| `2896b641-a212-471f-b7bc-b9b1a66b3e1f` | top-level `prescriptions` array (sibling of `household`) | HTTP 400 - top-level `prescriptions` is not a recognized field |

The four-field message in the first observation names the **Intake Form**
prescription schema (section 3), not an `/v1/enrollment-sessions` field set.
The official on-exchange documentation does not document prescription handoff
through `/v1/enrollment-sessions` at all.

Current behaviour: the builder emits no prescription field at all. All
placements have been removed and the omission is guarded by regression
assertions in `hs-body.test.ts`.

## 3. Documented prescription path: HealthSherpa Intake Forms (not implemented)

Two separate, separately credentialed endpoints on the `healthsherpa.com`
host - not `api.one.healthsherpa.com`:

**Prescription search**

`GET https://healthsherpa.com/external/prescriptions`
- Requires a separate **External API Bearer token**.
- Returns the HealthSherpa system `id` used for prescription deeplinks.

**Agent intake handoff**

`POST https://healthsherpa.com/external/intake_forms`
- Requires **OAuth 2.0** with scope `intake_form_api` and an authorized
  HealthSherpa agent.
- Prescriptions are **top-level** and require all four fields **as strings**:
  `{ id, duration, applicant_index, rx_norm_identifier }`.
- `duration` is expressed in **months**; HealthSherpa says use `"12"` when
  unknown.
- `applicant_index` indexes `tax_household_members`.
- These prescriptions only **decorate the returned `shopping_url`**. They are
  not persisted and do not affect `client_apply_url`.

Staging additionally requires **Basic Auth** plus HealthSherpa-issued
**test-agent credentials**.

## 4. Current external blocker

Intake OAuth is intentionally **not implemented** in this pass because none of
its prerequisites are configured:

- no HealthSherpa Intake OAuth application or access token (`intake_form_api`)
- no External API prescription bearer token
- no staging Basic Auth credentials
- no HealthSherpa-issued test-agent credentials

Until HealthSherpa issues these, prescriptions remain omitted from the handoff
(section 0). If and when the Intake path is enabled, prescription shaping would
live against `/external/intake_forms` with the four-string object above, while
`/v1/enrollment-sessions` continues to carry no prescription field.

## 5. Unchanged elsewhere

No `plan_id`, no `household.effective_date` (plan year is derived from it),
`income_sources` limited to `amount` and `employer`, agent notes rejected above
500 characters, atomic `claim_handoff` idempotency, agent-assignment gating,
and audit events.
