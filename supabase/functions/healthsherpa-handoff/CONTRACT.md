# HealthSherpa prescription handling: documented shapes, live rejections, blockers

## 1. Documented `/v1/enrollment-sessions` request shape (implemented)

`POST https://api.one.healthsherpa.com/v1/enrollment-sessions`

The checked-in OpenAPI reference nests prescriptions on the applicant they
belong to. Each object carries only its own documented identifier plus an
optional integer `duration`. There is no `applicant_index`, no top-level
`prescriptions` array, and no `client.prescriptions` container.

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
        "first_name": "…", "last_name": "…", "email": "…", "phone_number": "…",
        "prescriptions": [{ "rx_norm_identifier": "617310" }] }
    ]
  },
  "providers": ["1234567893"],
  "notes": "<= 500 characters"
}
```

### Prescription object (nested on the primary applicant)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | one of | HealthSherpa **catalog** identifier only. |
| `rx_norm_identifier` | string (digits) | one of | CMS / RxNorm CUI. Never copied into `id`. |
| `duration` | integer >= 0 | no | Emitted only when the saved record carries a real nonnegative integer; never invented. |

Provenance rules implemented in `hs-body.ts` (`verifiedPrescriptions`,
`applicantPrescriptions`):

- explicit catalog markers (`hs_id`, `medication_id`, `id_type: "healthsherpa"`) -> `id`
- explicit RxNorm markers (`rxcui`, `rxnorm_id`, `id_type: "rxnorm" | "rxcui"`) -> `rx_norm_identifier`
- legacy bare all-digit `id` with no provenance -> `rx_norm_identifier`
  (HealthSherpa catalog ids are never bare digits)
- manual / unverified / unresolved rows are dropped

TruEnroll prescription search goes through the CMS Marketplace gateway
(`cms-lookup` -> `drugAutocomplete`) and returns an **RxCUI**. That value is
emitted only as `rx_norm_identifier`.

## 2. Live rejections on `/v1/enrollment-sessions` (2026-08-05)

Four authorized non-consumer validation requests. **No prescription placement
has ever been accepted by `/v1/enrollment-sessions`.**

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

Current behaviour: the builder emits the documented nested shape. All
experimental placements have been removed and are guarded by regression
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

Once HealthSherpa issues these, the prescription path moves to
`/external/intake_forms` with the four-string object above, and
`/v1/enrollment-sessions` continues to carry the documented nested shape.

## 5. Unchanged elsewhere

No `plan_id`, no `household.effective_date` (plan year is derived from it),
`income_sources` limited to `amount` and `employer`, agent notes rejected above
500 characters, atomic `claim_handoff` idempotency, agent-assignment gating,
and audit events.
