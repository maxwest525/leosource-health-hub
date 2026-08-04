# TruEnroll consolidation: audit findings and unification plan

Audit is complete. Nothing gets rebuilt. The app already has a working live-data quoting engine, working doctor/Rx lookup, a working AI concierge, and working lead capture. The problem is that these are spread across six separate intake forms with six separate state shapes and no shared session, so a consumer restarts from zero at every hop.

## 1. Current page and route map

23 pages, 23 routes. Three groups.

**Marketing / static (no data layer):** `/` Index, `/home-v2` HomeV2 (approved TruEnroll design), `/individual-family`, `/medicare`, `/mapd-supplement`, `/dental-vision`, `/about`, `/contact`, `/resources`, `/tools`, `/get-started`, `*` NotFound. Network touch is only the shared quote dialog.

**Consumer tools (real data):** `/compare-plans` and `/wizard` (same `ComparePlans.tsx`, 3178 lines, the real quoting engine), `/provider-search`, `/find-prescriptions`, `/subsidy-calculator`, `/carriers`, `/plan-lookup`, `/ai-quote`, `/find-mapd`.

**Internal:** `/agent-login`, `/admin`, `/admin/import`.

## 2. Existing API integration map

Three live backends, all real, all working:

- `src/lib/cms.ts` → `cms-lookup` function → CMS Marketplace API. Powers plan detail, county/place resolution, issuer directory, subsidy eligibility, provider search, drug search, coverage checks. Used by ComparePlans, ProviderSearch, FindPrescriptions, SubsidyCalculator, CarrierDirectory, PlanLookup.
- `src/lib/healthsherpa.ts` → `healthsherpa` function → HealthSherpa quoting. County lookup and priced plan quotes. Used by ComparePlans and the standalone quoter component.
- `src/lib/services/*` → direct Supabase table reads (`plans`, `providers`, `medications`, `formularies`, `provider_networks`, `carriers`). Used only by FindMAPD.

Assistant and lead functions: `ai-quote` (AiQuote page, raw fetch), `coverage-concierge` (CoverageConcierge inside FindMAPD, raw fetch), `voice-guide` (wizard VoiceGuide), `send-quote-request` (Contact, QuoteFormDialog, GetStarted), `enrich-hcgov-plan` and `import-hcgov-plans` (admin import only).

Dead functions with zero frontend callers: `geocode-place`, `update-plan-attributes`, `update-plan-benefits`.

## 3. Working vs broken

**Fully working:** ComparePlans end-to-end quoting, ProviderSearch, FindPrescriptions, SubsidyCalculator, CarrierDirectory, PlanLookup, AiQuote (Trudy), admin lead console, admin import, all marketing pages.

**Broken in practice:** FindMAPD. Its code is fine but every table it reads is empty right now: plans 0, providers 0, medications 0, carriers 0, formularies 0, provider_networks 0. It will render zero results for any search. Its lead writes go to `tool_leads`, which is also empty (0 rows), so no consumer has ever completed a tracked journey.

**Mocked:** `TruChatPanel` (hardcoded message array, no input wiring), `LeoMode` in the hero (no model call, just redirects to /ai-quote).

## 4. Duplicate workflow list

- **Six separate quote intakes**, no shared type: hero SelfEnrollMode, HealthSherpaQuoter, ComparePlans steps 1-2, SubsidyCalculator, FindMAPD, plus the two contact forms. Age is `ages: number[]` in three places and `dobs: string[]` in ComparePlans; tobacco is a parallel `boolean[]` in three places and a per-member property in two.
- **Two unrelated storage keys that never meet:** `leosource.wizard.prefill` (written by the hero, read by ComparePlans) and `leosource:compare-income` (ComparePlans only). FindMAPD ignores both and invents a `?zip=` query convention.
- **GetStarted and QuoteFormDialog are the same form** copy-pasted into a page and a dialog.
- **Three competing lead paths:** `lead-engine.ts` scoring (wired only into FindMAPD), BookAgentDialog writing `tool_leads` directly with hardcoded intent 90, and `send-quote-request` email-only with no lead row at all. ComparePlans, the richest signal source, writes no lead.
- **Two provider result shapes:** ComparePlans/ProviderSearch use `cms.ts` directly, FindMAPD goes through `provider-service.ts` and gets a different object shape.
- **Five assistant surfaces, three personas' worth of wiring**, all branded Trudy except CoverageConcierge which has no name.

## 5. Proposed unified consumer journey

One session, existing pages, in place.

```text
TruEnroll home (/home-v2 design)
  -> Intake        (ComparePlans steps 1-2, the only intake kept)
  -> Doctors       (ProviderSearch, reads session, writes savedDoctors)
  -> Prescriptions (FindPrescriptions, reads session, writes savedRx)
  -> Subsidy       (SubsidyCalculator, reads session, no re-entry)
  -> Plans         (ComparePlans step 3 results, HealthSherpa priced)
  -> Handoff       (HealthSherpa agent-assisted enrollment + lead write)
Trudy available at every stage.
```

## 6. Reuse and refactor plan

**Preserve untouched:** `cms.ts`, `healthsherpa.ts`, all edge functions, ComparePlans' quoting and results rendering, the TruEnroll visual design.

**Add (small, additive):**
- `src/lib/enrollment-session.ts` — one canonical session type (zip, county/fips, household, incomes, members with dob+tobacco+relationship+gender, effective date, savedDoctors, savedRx, comparedPlans, sessionId) on a single storage key, with a `useEnrollmentSession` hook. Migrates and absorbs the two existing keys so nothing in flight is lost.
- `src/lib/adapters/` — one adapter normalizing `ages[]`/`dobs[]` and flat-vs-nested tobacco, and one normalizing `provider-service` results onto the `cms.ts` provider shape.

**Refactor to consume the session:** ComparePlans (source of truth, writes on every step), ProviderSearch and FindPrescriptions (prefill ZIP/household, push saved items back, add a return-to-plans action), SubsidyCalculator (prefill, stop re-asking), hero SelfEnrollMode (write session instead of the prefill key).

**Trudy:** wire `TruChatPanel` to the real `ai-quote` function with the session as context, rename `LeoMode` to `TrudyMode` and make it answer inline instead of bouncing, give CoverageConcierge the Trudy name. One persona, one function, one context object.

**Handoff:** at the end of ComparePlans results, a single agent-assisted step that writes one scored lead through `lead-engine.ts` (using the full session, not the hardcoded 90) and hands off to HealthSherpa agent-assisted enrollment for the selected plan. BookAgentDialog is repointed at `lead-engine` so there is one write path.

**Merge / retire:** GetStarted becomes a thin wrapper over the QuoteFormDialog form; FindMAPD is kept but flagged as data-blocked, not rewired into the consumer journey until its tables are populated; the three uncalled edge functions are left alone pending your call.

## 7. Open decision

FindMAPD is the one place the audit found something genuinely unusable, and the cause is empty tables rather than bad code. I have not planned any Medicare work into the consumer journey because of that. Say the word if you want the Medicare path fed from the live CMS API instead of the internal tables.

## Technical notes

Session lives in `sessionStorage` under one key with a version field and a migration read for the two legacy keys. No new tables, no new API layer, no new form library. ComparePlans keeps its internal `useState` for step-local UI and syncs the durable fields into the session on step transitions, so the 3178-line file is edited at its boundaries rather than restructured.
