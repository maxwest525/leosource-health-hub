# Coverage start date as a month dropdown

Replace the free-form date input in step 1 of the plan comparison wizard with a simple dropdown listing the next four upcoming first-of-month dates (for example 09/01/2026, 10/01/2026, 11/01/2026, 12/01/2026). The first option stays selected by default, matching today's behavior.

## What changes

- Step 1 "Coverage start date" becomes a select with exactly four options, labeled in MM/DD/YYYY format.
- The stored value stays the same YYYY-MM-DD string the quote request already sends, so pricing and plan-year logic are unaffected.

## Technical details

- Add a helper in `src/lib/healthsherpa-format.ts`, next to the existing `defaultEffectiveDate`, that returns the next N first-of-month dates as `{ value: "2026-09-01", label: "09/01/2026" }`. It reuses the same UTC month arithmetic so it stays consistent with `defaultEffectiveDate` and the existing unit test.
- In `src/pages/ComparePlans.tsx`, swap the `<Input type="date">` for the same styled `select` used by the county dropdown, populated from that helper.
- Apply the same dropdown to the date field in `src/components/quote/HealthSherpaQuoter.tsx` so both quoting surfaces behave identically.
- Add a unit test for the new helper covering a mid-year date and a December rollover into the next year.
