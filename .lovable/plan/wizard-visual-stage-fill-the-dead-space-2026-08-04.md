# Wizard visual stage: fill the dead space

Right now each wizard step is a small card floating in an empty page. The plan adds a cinematic "stage" beside (desktop) and behind (mobile) the question card, with art that changes per step — starting with a real satellite map that flies from orbit down to the validated county.

## The satellite fly-down (Step 1)

- Connect Google Maps Platform (managed by Lovable, one click) and load the Maps JavaScript API with the browser key.
- Idle state: slow-rotating satellite view of the continental US, dimmed and tinted to the navy theme, with a soft scanline/vignette overlay so it reads as a system display rather than a raw map.
- As soon as a valid 5-digit ZIP resolves, the camera animates: continent -> state -> county, easing zoom 3 to 10 over about 2.2 seconds, ending centered on the county with a pulsing marker and the city/county name in a small glass label.
- If multiple counties match, hovering or selecting a county option re-targets the camera to that county.
- Reduced motion and mobile: skip the fly-through, jump straight to the final framing.
- If the map fails to load or the key is missing, fall back to the stylized grid backdrop used by the other steps. No blank box, no error.

## Visuals for the other steps

Each step gets its own animated panel in the same stage frame, all built from theme tokens (navy base, green accent, hairline grid, soft glow) so the page feels like one instrument panel:

- Coverage start date: a horizontal month timeline that slides and highlights the chosen first-of-month.
- Who needs coverage / members: silhouette figures that appear and settle one by one as members are added, labeled with relationship.
- Demographics: the active member's chip fills in (age, gender) as fields complete.
- Income: an animated meter that fills with the entered amount plus a subtly moving subsidy-band bar.
- Doctors: pulsing network nodes connecting as providers are saved.
- Prescriptions: capsule glyphs stacking as drugs are added.
- Tobacco / other flags: a quiet status board with the answered items checking off.

Every panel cross-fades on step change with the same easing the card already uses, and none of them block or delay the form.

## Layout

- Desktop (lg and up): three zones — stage panel on the left/center, question card docked right, running summary below the card. The stage absorbs the empty space instead of leaving margin.
- Tablet: stage becomes a shorter banner above the card.
- Mobile: the stage renders as a low-opacity full-bleed backdrop behind the locked-height card, so the screen still fits with no scrolling. Heavy effects (map animation, particle motion) are reduced or replaced by a static frame.

## Technical notes

- New `src/components/wizard/WizardStage.tsx` picks the panel by question id, plus one small component per visual under `src/components/wizard/stage/`.
- New `src/components/wizard/stage/CountyFlyover.tsx` wraps the Maps JS API: async loading with the `callback` param, `google.maps.Map` with satellite type, no `mapId`, no AdvancedMarkerElement. Geocoding for the county center goes through the connector gateway from an edge function, never the browser key.
- `ComparePlans.tsx` only changes layout and passes current step state into the stage — no changes to validation, quoting, or the HealthQuote Pro calls.
- All motion runs on transform/opacity, respects `prefers-reduced-motion`, and the map instance is created once and reused across steps.

## Setup you will need to do

I will open the Google Maps connect card when we start building; it is a one-click managed connection, no Google account or key required from you.
