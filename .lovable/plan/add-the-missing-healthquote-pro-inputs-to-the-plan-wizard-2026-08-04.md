# Add the missing HealthQuote Pro inputs to the plan wizard

Fold the quote fields the API supports but the wizard never collects into the existing flow, using the same visual language Step 1 already uses: white card, `rounded-2xl`, section heading plus a small muted helper line, `FieldLabel` uppercase labels, 10px-tall inputs, segmented pill toggles, hairline `border-border/30` dividers.

## Step 1 — Location & coverage

1. Location block (unchanged): ZIP, city and county.
2. Household members: replace the age number input with a **date of birth** field in the same slot and width. Age is derived from the DOB (as of the coverage effective date) and shown as a small muted "42 yrs" readout next to the field, so nothing downstream loses the age value. Row order stays: relationship, date of birth, gender, tobacco, then one added compact pill:
   - "Disabled or blind" (affects cost sharing)
   Native American / tribal status is out of scope for now.
3. Income and tax household size (unchanged).

Validation: DOB required per member, must be a real past date, and yields an age of 0–120. Inline error under the field with `aria-invalid`, same as the current age validation.

## Step 3 — Review

Member rows show date of birth with the derived age in parentheses, plus the disability flag when set.

## Step 4 — Results: unified filter bar

The coverage preference controls belong with the plan list, not the intake form, so they live here and replace the current ad-hoc sort/filter controls with one consistent bar:

- One row of identical dropdown/popover triggers, each styled the same: label, current value, chevron, and an active-count badge when a filter is applied.
- Filters: **Metal level** (Bronze, Expanded bronze, Silver, Gold, Platinum, Catastrophic), **Plan type** (HMO, PPO, EPO, POS, Indemnity), **Carrier**, **Monthly premium** (range), **Deductible** (range), plus toggles for **HSA eligible** and **Standardized plans**.
- **Sort** sits at the right end of the same bar with matching chrome: Premium, Deductible, Best value.
- Applied filters render as removable chips under the bar, with a single "Clear all".
- On mobile the bar scrolls horizontally with the same snap behaviour used elsewhere; each trigger opens a sheet with checkbox lists and Apply / Clear actions.
- Metal level, plan type, carrier, HSA and standardized are sent to the API as quote filters; premium and deductible ranges apply client-side to returned results.

## Technical notes

- `supabase/functions/healthsherpa/index.ts`: extend the quotes Zod schema with optional `filters` (issuer_ids, `medical.metal_levels`, `medical.plan_types`, `medical.hsa_eligible`, `medical.standardized_only`) and optional applicant `date_of_birth` and `blind_or_disabled`; pass `sort.field` through and forward everything to `POST /v1/quotes` unchanged.
- `src/lib/healthsherpa.ts`: widen `HsApplicant` and the `quoteHsPlans` params with the same optional fields plus `filters` and `sort`.
- `src/pages/ComparePlans.tsx`: swap member `age` state for `dob` with a derived-age helper, add the disability flag, and build the shared filter-bar component used by Step 4.
- Reuse the existing pill and segmented-toggle markup rather than introducing new control styles.
- The `/individual-family` HealthQuote Pro quoter is a separate component and stays as-is unless you want the same treatment there.
