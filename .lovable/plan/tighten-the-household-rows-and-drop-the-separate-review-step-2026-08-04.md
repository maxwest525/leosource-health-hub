# Tighten the household rows and drop the separate Review step

## Household member rows (Step 1)

- **Move the remove (X) control.** Today it is the last item inside the horizontally scrolling row of pills, so on narrower desktop widths it scrolls out of view. It moves outside the scroll area and is pinned at the far right of each member row, vertically centered, with the row's pills scrolling beneath it. Mobile keeps its existing X in the member header (You / Member 2), so there is exactly one remove control per member at any width.
- **Shorten the date of birth control.** The trigger drops from a fixed 148px to a compact width sized to its content (roughly 118px) with tighter horizontal padding, and the derived "30 yrs" readout tightens against it so the pair no longer carries dead space.
- **Darken the divider between members.** The hairline between member blocks goes from `border-border/30` to a clearly visible `border-border/70`, matching thickness and spacing as-is.

## Remove the Review step

The standalone Review page (step 3) goes away entirely.

- The stepper becomes: Location & coverage, Results, Confirmation.
- "Continue" at the bottom of Step 1 runs the quote directly and lands on Results.
- On the Results page, the same review content appears as a collapsed "Your details" summary card above the filter bar. Expanding it shows the existing detail grid; "Edit" on any row returns to Step 1.
- "Save as PDF", which lived on the Review page, moves next to the results header so the recap is still one click away.
- Back from Results returns to Step 1.
- The Confirmation step keeps its existing full summary card unchanged.

## Technical notes

- `src/pages/ComparePlans.tsx` only.
- `STEPS` drops `{ num: 3 }`; the `step === 3` block is deleted; Step 1's Continue calls `runSearch` instead of `setStep(3)`; Step 4's back button targets step 1.
- `ReviewSummary` is reused as-is, wrapped in a collapsible container on Step 4 with `onEdit={() => setStep(1)}`; no changes to `reviewRows` or `PrintableRecap`.
- The member-row markup splits into a flex wrapper: the existing scrollable pill row plus a `shrink-0` remove button sibling (desktop only).
