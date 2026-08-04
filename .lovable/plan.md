# Link Logo.dev (and finish remaining remix setup)

## Goal
Attach the existing workspace connection "max's Logo.dev" to this remixed project so carrier logos render on plan results again.

## Steps
1. Link "max's Logo.dev" (connector `logo_dev`, API key, non-gateway) to this project via the connect card. This publishes `VITE_LOVABLE_CONNECTOR_LOGO_DEV_API_KEY` into the project env.
2. Verify the key is present and confirm `src/lib/carrier-logos.ts` picks it up (no code changes expected — it already reads that variable and falls back to bundled PNGs).
3. Spot-check a plan results view in the preview to confirm remote carrier logos load.

## Also still outstanding from the remix checklist
- Link the managed "Google Maps Platform" connection (still unlinked).
- Add `CMS_MARKETPLACE_API_KEY` via the secure form (still missing; values cannot be copied from the other project).

Say the word and I can fold those two into the same pass.

## Technical notes
- Logo.dev is frontend-only and non-gateway: the publishable key is used directly against `img.logo.dev` in browser code.
- No source files change for this task; it is purely a connection link plus verification.
