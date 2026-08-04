# Restore the guided compare experience on /wizard, powered by HealthQuote Pro

Bring back your original 3-step plan comparison form and full results experience, but have the plan data come from HealthQuote Pro instead of the plain Marketplace list. One form on the page, not two.

## What you get back

1. **Step 1 - Location and coverage**: ZIP with county resolution, coverage category, household size, income, ages, tobacco, effective date. Fields use the same input styling as the current HealthQuote Pro form so it all matches.
2. **Step 2 - Preferences**: budget range, priorities, saved doctors, saved prescriptions (these keep using the live CMS provider and drug directories, which HealthQuote Pro does not provide).
3. **Step 3 - Results**: the rich plan cards with fit score match bars, metal filters, sort options (best match, lowest premium, lowest deductible, highest rated, best doctor match, best Rx match), expandable plan detail, add-to-compare, and the side-by-side compare drawer.

The standalone HealthQuote Pro block is removed from the page since the wizard now runs it, so there is only one form.

## Pricing and plan data rules

- Premiums, subsidy, deductible, out-of-pocket max, plan type, HSA flag, and plan documents come from HealthQuote Pro.
- Show net premium as the headline price with gross premium struck through when a subsidy applies.
- Doctor and prescription match counts stay on the CMS directory, matched to each plan by its plan ID.
- If a plan cannot be matched in the CMS directory, the card shows premium, deductible, and benefits normally and simply omits the doctor/Rx match line rather than showing a zero.

## Technical notes

- `src/pages/ComparePlans.tsx`: re-add the step 1 and step 2 form sections and the step 3 results section (StepIndicator, MatchBar, PlanCard, CompareDrawer, ResultSkeleton and the sort/filter state are all still in the file and get reused). Remove the `HealthSherpaQuoter` mount.
- Introduce an adapter that maps `HsPlan` into the existing `EnrichedPlan` shape so the current card, sort, and compare code works unchanged; keep `computeFitScore` but feed it the HealthQuote Pro premium, metal level, deductible, and plan type.
- ZIP entry calls `lookupHsCounties`; step 1 to step 2 requires a resolved county. Running the quote calls `quoteHsPlans` with applicants derived from the ages entered.
- Numeric coercion goes through the existing `healthsherpa-format` helpers since the API returns some numbers as strings.
- Doctor and drug lookups keep using `searchProviders` / `checkProviderCoverage` and `searchDrugs` / `checkDrugCoverage` from `src/lib/cms.ts`.
- Medicare and dental/vision paths are untouched.
