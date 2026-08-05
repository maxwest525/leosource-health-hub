# Share this backend with a Replit app

Goal: let a separate app running on Replit call this project's existing backend functions, while this Lovable app stays the primary product.

## What Replit actually needs

Only two public values, plus the function names. No admin key is involved, and nothing about this project changes on the Lovable side.

- Backend URL: `https://kztnypomlwmeqrogksky.supabase.co`
- Publishable key: `sb_publishable_ufuSCeGO8YUECcoaVRy8mQ_L2Q2IaP7`

Both are designed to ship in browser code. Access is still controlled by the database access rules already in place, so a Replit client can only do what an anonymous or signed-in visitor here can do.

Note: the admin (service role) key and database password are not retrievable on Lovable Cloud, so a Replit server cannot be given elevated bypass access. Anything privileged has to stay inside a backend function here.

## Steps

1. In the Replit project, add two environment secrets holding the URL and publishable key above (name them to match Replit's framework, e.g. `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`).
2. Install `@supabase/supabase-js` in the Replit app and create a client from those two values.
3. Call the existing functions from Replit with `supabase.functions.invoke("<name>", { body: {...} })`. Available functions: `ai-quote`, `cms-lookup`, `coverage-concierge`, `healthsherpa`, `healthsherpa-handoff`, `geocode-place`, `voice-guide`, `send-quote-request`, `enrich-hcgov-plan`, `import-hcgov-plans`, `update-plan-attributes`, `update-plan-benefits`.
4. Verify one call end to end from Replit (`cms-lookup` is the simplest smoke test), then check the function logs here to confirm the request landed.

## Things to know before wiring it up

- Cross-origin is already open: every function replies with `Access-Control-Allow-Origin: *`, so a Replit origin works with no change here.
- `healthsherpa-handoff` and the agent review actions are staff-gated. From Replit they will only work if a user signed in with an agent or admin account, which means Replit would also need a sign-in screen.
- Auth sessions do not carry across origins. A visitor signed in on this app is not signed in on the Replit app; each origin has its own session.
- If you later want the Replit app to be an allowed sign-in destination, its URL must be added to the backend's redirect list. That is a separate small change, worth doing only once the Replit URL is known.

## On migrating the frontend to Replit

Possible, but out of scope for this plan and not recommended as a first move. The frontend here is a Vite + React app; it can be exported to GitHub and imported into Replit, keeping the same backend. If you want that, the cleanest path is: get the Replit app calling the functions first (this plan), confirm it works, then decide whether to move the whole frontend.

## Technical notes

- No files in this project need to change for step 1 through 4. The work is entirely on the Replit side.
- Function endpoints are `POST https://kztnypomlwmeqrogksky.supabase.co/functions/v1/<function-name>` with headers `apikey: <publishable key>` and `Content-Type: application/json`, if Replit calls them with plain `fetch` instead of the client library.
