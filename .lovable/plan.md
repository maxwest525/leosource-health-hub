# HealthSherpa prescription rollback and documentation

Restore the handoff body builder to the documented `/v1/enrollment-sessions` shape and record the intake-form findings. No live HealthSherpa calls, no migrations, no RLS or secret changes.

## 1. Restore the request builder

In `supabase/functions/healthsherpa-handoff/hs-body.ts`:

- Delete `TopLevelPrescription` and `topLevelPrescriptions`, and the top-level `prescriptions` array emitted alongside `client`/`household`.
- Keep `verifiedPrescriptions` and its provenance rules unchanged (catalog markers to `id`, RxNorm markers to `rx_norm_identifier`, legacy all-digit `id` treated as RxNorm, manual/unresolved rows dropped).
- Emit prescriptions nested on the primary applicant as `household.applicants[].prescriptions`, each object containing only its single documented identifier plus optional integer `duration` when a real nonnegative value is stored.
- Emit no `applicant_index` anywhere, no `client.prescriptions`, and omit the applicant key entirely when there are no verified prescriptions.

## 2. Restore tests

In `hs-body.test.ts`:

- Point every prescription assertion at `household.applicants[<primary index>].prescriptions`.
- Keep all provenance tests (FindPrescriptions RxNorm shape, ComparePlans shape, legacy digit ID, catalog markers, dedupe, manual-drop).
- Replace the top-level contract tests with regression assertions that the built body has no top-level `prescriptions`, no `client` block, and that no prescription object contains `applicant_index`.
- Keep the duration tests, rewritten against the nested shape.

## 3. Rewrite CONTRACT.md

Four clearly separated sections:

- Documented `/v1/enrollment-sessions` request shape (nested applicant prescriptions), with a redacted example body.
- The four live rejections, each with its request ID and the exact validator message: `6654bbdb-88b5-4080-9cb3-976fa92eb1d2`, `6a8ff4cb-a00e-414e-ad4c-9e840f4997df`, `e6a8a9b1-6d87-4ffd-84ae-cf6bb9fc06b1`, `2896b641-a212-471f-b7bc-b9b1a66b3e1f`. Stated plainly: no prescription placement has been accepted by `/v1`.
- The documented intake path: `GET https://healthsherpa.com/external/prescriptions` (External API bearer token, returns HealthSherpa system `id`) and `POST https://healthsherpa.com/external/intake_forms` (OAuth 2.0 scope `intake_form_api`, authorized agent), with the four-string prescription fields, `duration` in months defaulting to `"12"`, `applicant_index` indexing `tax_household_members`, and the note that these only decorate `shopping_url`.
- Current blocker: no Intake OAuth app/access token, no External API prescription token, no staging Basic Auth, no HealthSherpa test-agent credentials configured. Intake OAuth is therefore not implemented in this pass.

## 4. Verify and deploy

- Run the full Deno test suite for the function and a TypeScript check.
- Deploy `healthsherpa-handoff` and confirm it is live.

## Report back

Files changed, test/type-check results, deployment status, the exact restored redacted RxNorm shape, and confirmation that all four request IDs and the intake prerequisites are documented.
