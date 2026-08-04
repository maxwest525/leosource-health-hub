# Complete the required quote fields in the plan comparison form

Comparing step 1 of the plan comparison wizard against the HealthQuote Pro quote contract, three required or contract-relevant inputs are missing or hard-coded, and one value is sent in the wrong format.

## What's missing today

| Required by the quoting API | In the form today |
| --- | --- |
| ZIP code | Yes |
| County (FIPS) | Yes, auto-resolved |
| Annual household income | Yes |
| Coverage start date | Yes |
| Age per member | Yes |
| Tobacco use per member | Yes |
| Household size | No input — silently set to the number of people listed |
| Relationship per member | No input — everyone after the first is hard-coded as "dependent," so a spouse can never be quoted correctly |
| Gender values | Sent as "Female"/"Male"; the API expects lowercase values |

## What to add

1. **Household size field** — a numeric input next to household income, defaulting to the number of members listed and never allowed to drop below it. Tax household size can legitimately be larger than the number of people applying for coverage, and it drives the subsidy math.
2. **Relationship selector per member** — a small dropdown (You / Spouse / Dependent) on each household row. The first row stays "You" (primary) and is not editable; only one spouse can be selected.
3. **Gender value fix** — keep the F/M toggle exactly as it looks, but normalize to the lowercase values the API expects at the request layer.

## Validation

- Continue stays disabled until ZIP, county, income, coverage start date, and every member's age are present and valid.
- Inline errors under any field that fails, with `aria-invalid` on the input.
- Ages validated 0–120; household size 1–12; income 0 or greater.

## Technical notes

- `src/pages/ComparePlans.tsx`: add `householdSize` and `relationships` state, render the two new controls in the step 1 grid/member rows, and pass them into `quoteHsPlans` instead of the current derived/hard-coded values.
- `src/lib/healthsherpa.ts`: widen `HsApplicant.gender` to the API's lowercase enum and accept the relationship value per applicant.
- `supabase/functions/healthsherpa/index.ts`: update the applicant schema to the lowercase gender enum and redeploy.
- `src/components/quote/HealthSherpaQuoter.tsx` uses the same helper, so it gets the corrected gender mapping automatically; it keeps its current simpler field set.
- Medicare flows are untouched.
