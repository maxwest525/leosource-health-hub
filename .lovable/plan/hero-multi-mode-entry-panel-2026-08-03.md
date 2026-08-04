# Hero: multi-mode entry panel

Turn the single "Check eligibility" card in the hero into one switchable panel with five modes, so every capability we already built is visible in the first screen instead of buried in nav.

## Brainstorm summary

Angles considered: segmented tab strip, stacked accordion cards, rotating carousel, icon rail + panel, single AI box that branches, full-width mode bar under hero.

Top 3:
1. Icon/label rail + morphing panel — one card, five modes, no height jump, works on mobile as a scrollable chip row. Highest impact, lowest effort, reuses the existing floating card.
2. Full-width mode bar under the hero — more visible, but competes with the trust strip and grows page height.
3. AI-first box that branches into the other four — elegant, but hides the self-enrollment and Medicare paths behind a conversation.

Recommendation: option 1.

## The five modes

1. Check eligibility (default) — exactly what exists today: ZIP, household, age, category, Go.
2. Enroll yourself — ZIP + household, goes straight to the plan wizard in self-serve mode. Trust line: real-time CMS pricing, enroll online, no agent required.
3. Medicare — ZIP + "add your medications / add your doctors" chips, routes to the Medicare finder with those prefilled. Trust line: CMS star ratings, side-by-side out-of-pocket totals, no sales pressure.
4. Talk to an expert — name, phone, ZIP, preferred time, and a phone-vs-video toggle. Uses the existing book-agent flow.
5. Ask Trudy — single prompt box with 3 example questions ("What's my subsidy?", "Can I switch mid-year?", "Is my doctor covered?"), sends the typed question into the AI quote walkthrough as the opening message.

## Interaction

- Mode rail sits at the top of the card: compact icon + short label, active one gets the accent underline/tint. Horizontally scrollable on mobile.
- Panel body cross-fades between modes with the existing motion system; card keeps a stable min-height so the hero doesn't jump.
- Card stays draggable and collapsible as it is now.
- Selected mode persists in the URL hash (e.g. `#hero=medicare`) so links can deep-link a mode.

## Technical notes

- Refactor `src/components/HeroPlanFinder.tsx` into `src/components/hero/HeroEntryPanel.tsx` plus one small component per mode (`EligibilityMode`, `SelfEnrollMode`, `MedicareMode`, `ExpertMode`, `TrudyMode`) sharing the current card chrome.
- Routing targets, all existing: `/wizard`, `/find-mapd`, `/find-prescriptions` + `/provider-search` (via prefill), `/ai-quote`.
- Expert mode reuses `BookAgentDialog`'s submit path into `tool_leads`, inline rather than in a dialog; adds a contact-method field to the payload.
- Trudy mode pushes the question through the existing wizard prefill mechanism so `/ai-quote` opens mid-conversation.
- Medication/doctor chips reuse the CMS autocomplete helpers in `src/lib/cms.ts`.
- No backend schema changes beyond the optional contact-method value on the lead record.

## Assumption

The AI assistant on `/ai-quote` is currently named Barry O. This plan renames it to Trudy everywhere for consistency; say so if you'd rather keep both.
