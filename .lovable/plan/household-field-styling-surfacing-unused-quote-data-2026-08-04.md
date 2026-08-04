# Household field styling + surfacing unused quote data

## Part 1: What the quoting API returns that the wizard never shows

Based on our mirrored HealthQuote Pro contract (`src/lib/healthsherpa.ts`) and the plan mapper (`src/lib/healthsherpa-adapter.ts`), these fields come back from the quote call but are dropped before the plan cards render:

| Returned data | Where it lives | Currently shown? |
|---|---|---|
| Per-plan subsidy applied and max APTC | `pricing.subsidy_applied`, `pricing.max_aptc` | Only a single global subsidy line, never per plan |
| Gross vs. net premium split | `pricing.gross_premium` / `net_premium` | Card shows one number, not "full price vs. after credit" |
| Network name and network type | `network.name`, `network.type` | Only plan type is shown |
| Payment / enrollment handoff link | `documents.payment_url` | Never used |
| Result count and paging | `meta.result_count`, `page_number`, `page_size` | We request 30 and silently truncate; no "showing X of Y" or load-more |
| Upstream warnings | `meta.warnings` | Discarded, so data caveats never reach the user |
| Standardized (Easy Pricing) plans filter | `filters.medical.standardized_only` | Not offered in the filter bar |
| Issuer pre-filter | `filters.issuer_ids` via the issuers reference call | We filter carriers client-side only, after truncation |

Workflow steps the wizard does not have:
- No enrollment handoff step (the payment URL is the intended "continue to enroll" exit).
- No server-side sorting: we pass no `sort_field`, so sorting only reorders the truncated page.
- No pregnancy input, even though the applicant contract accepts `pregnant`.

## Proposed additions (scoped, low risk)

1. Plan card: show "full price" struck through next to the after-credit premium when a subsidy is applied, plus the plan's own subsidy amount.
2. Results header: "Showing X of Y plans" from `meta.result_count`, with a "Load more" that pages the API instead of truncating.
3. Pass `sort_field` / `sort_direction` to the API so sorting is accurate across all results.
4. Filter bar: add a "Standardized plans" toggle alongside the HSA toggle.
5. Plan detail modal: add network name and an "Enroll" action using `payment_url` when present.
6. Surface `meta.warnings` as a subtle notice above results.
7. Add a "Pregnant" toggle to household members (same rectangular chrome as the rest).

## Part 2: Rectangular household member controls

In `src/pages/ComparePlans.tsx`, the member row currently mixes `rounded-full` pills with rounded-rect inputs. Change all member controls to the same rectangular chrome so the row reads as one form group:

- Gender segmented control: keep the group container, square the inner buttons to `rounded-[4px]`.
- Tobacco, Disabled or blind, Native American toggles: `rounded-full` becomes `rounded-md`.
- Match heights and border treatment to the DOB field and relationship select so every control in the row shares one radius and one border color.

No behavior, state, or API changes in this part.

## Technical notes

- Files touched: `src/pages/ComparePlans.tsx` (member row + results header + filter bar), `src/lib/healthsherpa.ts` (expose `pregnant`, standardized filter, paging response), `src/lib/healthsherpa-adapter.ts` (carry subsidy, network name, payment URL), `supabase/functions/healthsherpa/index.ts` (accept the new filter/sort fields).
- All colors stay on existing semantic navy tokens; no new palette values.
