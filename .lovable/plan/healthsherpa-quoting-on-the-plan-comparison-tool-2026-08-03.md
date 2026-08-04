# HealthSherpa quoting on the plan comparison tool

Add a secure HealthSherpa ACA quoting flow to the plan comparison page (`/compare-plans`). HealthSherpa becomes the primary source for ACA quotes; the existing CMS Marketplace data stays as the fallback and remains the source for Medicare, medication, and provider lookups (HealthSherpa's quote API does not cover those).

## Source priority

- ACA quotes: HealthSherpa first. If the key is missing, the call fails, or it returns no plans, fall back to the current CMS results with a small notice explaining which source is showing.
- Medicare, drug coverage, provider coverage: unchanged, still CMS.
- Each result set is labelled so an agent always knows which source priced the plans.

## Flow on the comparison page

1. ZIP code entry (5 digits, validated).
2. Backend county lookup. If the ZIP maps to multiple counties, show a county picker; store `name`, `fips_code`, `state`.
3. Household inputs: household size, annual income, primary applicant age, tobacco use, pregnancy, effective date.
4. Effective date defaults at runtime to the first day of next month (`YYYY-MM-DD`); `plan_year` is derived from that date, never hardcoded.
5. Submit runs the quote through the backend, results render as plan cards sorted by premium.

Quote submission stays blocked until a county is resolved.

## Plan cards and detail modal

Cards show carrier, net premium (falling back to gross), gross premium, subsidy applied, metal level, and plan type. Labels normalise values like `expanded_bronze` into readable text, and every field is read with optional chaining so missing data never crashes a card.

"View details" opens a modal with gross premium, subsidy and maximum APTC, net premium, metal level, plan type, and issuer, plus external links (summary of benefits, brochure, formulary, provider directory, plan details) when the response includes them. External links open in a new tab with `rel="noopener noreferrer"`.

States covered: loading skeletons, empty results, invalid ZIP, missing county, invalid key, rate limit, and upstream errors, each with distinct copy.

Styling follows the existing tool page chrome: glass cards, hairline dividers, outlined buttons, semantic tokens only.

## Setup checklist

A collapsible checklist on the page tells the agent that `HEALTHSHERPA_API_KEY` must be saved in the project's backend secrets before live quotes work, and that no key is ever entered in the browser. It reads live status from the backend (configured / not configured) without ever exposing the value.

## Technical details

- New backend function `healthsherpa` (single file, Zod-validated, CORS on every response including errors) with three actions:
  - `counties` -> `GET https://api.one.healthsherpa.com/v1/reference/counties?zip_code=...`
  - `issuers` -> `GET /v1/reference/issuers?state=..&plan_year=..`
  - `quotes` -> `POST /v1/quotes` with the documented `context` / `location` / `household` / `sort` / `page` body
- Auth header is `x-api-key`, read from `Deno.env.get("HEALTHSHERPA_API_KEY")` server side only. The key is never referenced in frontend code, never logged, never returned.
- The browser only ever calls the backend function through the existing client wrapper; no direct calls to `api.one.healthsherpa.com`.
- Upstream status codes map to typed error codes (`unauthorized`, `rate_limited`, `upstream_error`) so the UI can show precise messages.
- New `src/lib/healthsherpa.ts` client module with response types mirroring the OpenAPI contract, plus `src/components/quote/HealthSherpaPlanCard.tsx` and a details modal component.
- Before implementation the current docs at `one.healthsherpa.com/docs.html` and `openapi.json` are fetched to confirm endpoint shapes and response field names.
- A short unit test covers the effective-date/plan-year derivation and the metal-level label formatting.

## Note

This is prototype-grade quoting logic. Before real client data flows through it, access control, logging, rate limiting, and key handling should get a dedicated review.

## What you need to do

Save your HealthSherpa key as a backend secret named `HEALTHSHERPA_API_KEY`. I will request it through the secure secret form during the build, so do not paste it into chat.
