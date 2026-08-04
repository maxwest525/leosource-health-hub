# Wizard overhaul: one question at a time, live plan summary

Replace the single dense "Location & coverage" page with a fast, guided flow: one focused question (or a tight pair) per screen, inside a docked card, with a summary panel beside it that fills in as answers land. Results, filters, compare, and confirmation stay exactly as they are today.

## The flow

Each screen asks one thing, big and centered, with the answer control directly under it. Enter advances, Back steps out, and the whole card cross-fades and slides as you move.

1. Where do you live? — ZIP with the Locate button; city/county resolve and validate automatically, inline.
2. When should coverage start? — the four upcoming first-of-month options as large selectable tiles.
3. Who needs coverage? — just yourself, or you plus others. Choosing "plus others" sets the member count.
4. Tell us about each person — one person per screen (relationship, date of birth, gender, and only-if-relevant follow-ups: pregnant for female members, tobacco, disabled or blind, Native American). Two people means two quick screens rather than one crowded grid.
5. Household income — per-person sliders with the monthly/yearly toggle, one screen.
6. Tax household size — number stepper, paired on the same screen as income since they read together.
7. Optional add-ons — doctors and prescriptions, presented as a skippable screen with a clear "Skip" affordance.

Then the quote runs and lands on Results.

## The summary panel

A sticky card to the right on desktop, and a collapsed bar that expands on mobile. It lists every answer captured so far. Rows appear with a soft slide-in as they're answered, unanswered rows sit as dim placeholders, and each answered row is clickable to jump straight back to that question. Once results exist, the panel's header shows the live plan count and lowest premium.

## Feel

- Card transitions: directional slide plus fade, spring-eased, ~250ms; reverse direction when going back.
- Progress: a thin continuous bar across the top of the card with "3 of 8", replacing the current three-node stepper during the questions. The three-node stepper still marks Questions to Results to Confirmation at the page level.
- Selection controls (tiles, gender, yes/no) get a springy press and an animated check-in on select.
- Auto-advance on single-choice screens after a brief beat; typed screens advance on Enter or Continue.
- Keyboard: Enter to continue, Escape/Back to step out, arrow keys move between tile options.
- All motion honors reduced-motion and falls back to instant swaps.

## Validation

A question can't be skipped unless it's marked optional. Errors only appear after an attempt to continue, and read simply ("Required"). No red state on a field the user hasn't reached yet.

## Technical notes

- `src/pages/ComparePlans.tsx` only, plus small new components under `src/components/wizard/`.
- All existing state (`zip`, `countyFips`, `dobs`, `genders`, `relationships`, `tobacco`, `pregnantFlags`, `disabledFlags`, `tribalFlags`, `memberIncomes`, `incomePeriod`, `householdSize`, `effectiveDate`, `savedDoctors`, `savedRx`) stays as-is; the step 1 JSX is replaced by a question-registry array that maps each question id to its own render and a `canAdvance` predicate. Member screens are generated per index off `dobs.length`.
- New: `QuestionCard` (animated shell with progress + nav), `WizardSummary` (sticky/collapsible answer list reusing the existing `reviewRows`), `ChoiceTiles` (shared tile control).
- Framer Motion `AnimatePresence` with `mode="wait"` and a direction-aware variant, driven from `src/lib/motion.ts` tokens; no new easings.
- `runSearch`, plan cards, filters, `CompareDrawer`, `PrintableRecap`, and the confirmation step are untouched. The existing collapsible "Your details" card on Results is replaced by the same `WizardSummary` component for consistency.
- Existing hero prefill and session-stored income continue to seed answers, and any question already answered from prefill is pre-filled but still shown in sequence.
