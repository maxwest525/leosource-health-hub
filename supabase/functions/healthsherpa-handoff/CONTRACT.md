# HealthSherpa agent-assisted enrollment-session contract (as deployed)

`POST https://api.one.healthsherpa.com/v1/enrollment-sessions`

## Contract drift: prescriptions (three live observations, 2026-08-05)

**Observation 1 - request id `6654bbdb-88b5-4080-9cb3-976fa92eb1d2`**

Prescriptions sent as `household.applicants[].prescriptions` with only
`{ rx_norm_identifier }` were rejected with HTTP 400:

```json
{ "error": { "code": "invalid_request", "message": "Validation failed.",
  "details": { "client": ["Client prescriptions must be provided in this format [{id: , duration: , applicant_index: , rx_norm_identifier: }]"] } } }
```

The validator names the legacy object shape - `id`, `duration`,
`applicant_index`, `rx_norm_identifier` - it does **not** name a container.

**Observation 2 - request id `6a8ff4cb-a00e-414e-ad4c-9e840f4997df`**

Moving the array to a top-level `client.prescriptions` was rejected with HTTP 400:
`client.prescriptions: Prescriptions is not a recognized field`.

**Observation 3 - request id `e6a8a9b1-6d87-4ffd-84ae-cf6bb9fc06b1`**

Adding `applicant_index` inside `household.applicants[0].prescriptions[0]` was
rejected with HTTP 400: `Applicant index is not a recognized field`. The
applicant schema therefore does not accept the legacy linkage object at all.

**Conclusion (implemented):** the only placement consistent with the deployed
validator is a **top-level `prescriptions` array**, a sibling of `client`,
`household`, `providers` and `notes`. Each object carries `applicant_index`
pointing at the primary applicant. Prescriptions appear neither under `client`
nor under any `household.applicants[]` item.

## CMS / RxNorm provenance

TruEnroll prescription search goes through the CMS Marketplace gateway
(`cms-lookup` -> `drugAutocomplete`) and returns an **RxCUI**. That value is
emitted only as `rx_norm_identifier`. It is never labelled or copied into `id`.
The checked-in HealthSherpa public API reference has no prescription-search
endpoint, so `id` is reserved for a genuine HealthSherpa catalog identifier if
one is ever obtained.

## Prescription object (live, top-level array)

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `applicant_index` | integer | yes | Zero-based index into `household.applicants`. TruEnroll points every prescription at the primary applicant. |
| `id` | string | one of | HealthSherpa **catalog** identifier only. |
| `rx_norm_identifier` | string (digits) | one of | CMS / RxNorm CUI. Never copied into `id`. |
| `duration` | integer >= 0 | no | Days supply. Emitted only when the saved record carries a real, nonnegative integer value; never invented. |

Provenance rules implemented in `hs-body.ts` (`verifiedPrescriptions`,
`topLevelPrescriptions`):

- explicit catalog markers (`hs_id`, `medication_id`, `id_type: "healthsherpa"`) -> `id`
- explicit RxNorm markers (`rxcui`, `rxnorm_id`, `id_type: "rxnorm" | "rxcui"`) -> `rx_norm_identifier`
- legacy bare all-digit `id` with no provenance -> `rx_norm_identifier`
  (HealthSherpa catalog ids are never bare digits)
- manual / unverified / unresolved rows are dropped

## Emitted body outline

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
  "prescriptions": [{ "rx_norm_identifier": "617310", "applicant_index": 0 }],
  "providers": ["1234567893"],
  "notes": "<= 500 characters"
}
```

Unchanged from the prior pass: no `plan_id`, no `household.effective_date`
(plan year is derived from it), `income_sources` limited to `amount` and
`employer`, agent notes rejected above 500 characters, atomic `claim_handoff`
idempotency, agent-assignment gating, and audit events.
