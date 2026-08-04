# Hero pixel-match pass

Bring the `/home-v2` hero in line with the reference mockup. Scope is the hero band only: `TruHero.tsx`, `TruChatPanel.tsx`, and one new illustration asset. No routing, data, or other sections change.

## Differences to close

Left column
- Replace the bordered pill badge with a plain uppercase eyebrow: "SELF-ENROLLMENT MADE SIMPLE", blue, small, wide letter spacing, no border or dot.
- Headline stays two lines but both lines are navy. The blue second line goes away, and the manual break lands after "coverage."
- Subcopy becomes the reference text: "TruEnroll is a consumer resource center that helps you compare and understand health coverage, so you can enroll with confidence, without the hassle of sales calls."
- Add the check-badge trust line under the subcopy: "Powered by direct CMS + HealthSherpa APIs for accurate, up-to-date plan information."
- Buttons: coral "Get Started" with a right arrow and a softer radius (not a full pill), plus an outlined blue "Talk to Trudy" with a chat bubble icon. Both narrower and shorter than today.
- Replace the three-item proof list with the six category chips from the mockup: ACA, Medicare, Doctors, Prescriptions, Subsidies, Plan Match. Each is a white rounded-full chip with a hairline border, a small colored icon, and dark navy label. They wrap on narrow screens.

Right column
- The chat card is taller, sits higher, and bleeds past the container to the right edge of the viewport instead of ending at the grid.
- Behind and to the right of the card, a light landscape illustration panel fills the remaining width to the screen edge. This replaces the current faded bottom-edge landscape band.
- Card header gains a speaker and kebab glyph on the right, and the "Live" pill is removed.
- Messages get avatars: Trudy's portrait beside her bubbles on the left, a user avatar beside the user bubble on the right, with a small right-aligned timestamp under each.
- Message content matches the mockup: a self-employed income question, then Trudy's answer with an inline "ACA Marketplace" link and a three-item green check list ending in "Shall I show you plan options in your area?".
- The suggestion chip row is removed; the input row becomes a full-width rounded field reading "Ask Trudy anything about health coverage..." with a round blue send button.

Background
- Hero background goes near-white, dropping the current blue-to-white gradient wash. The illustration panel carries the color.

## Technical notes

- `src/components/truenroll/TruHero.tsx`: switch the grid to roughly `1.02fr / 1fr`, remove the bottom-masked landscape layer, and add a right-side absolutely positioned illustration panel that extends beyond the max-width container. Chat panel renders above it.
- `src/components/truenroll/TruChatPanel.tsx`: rework the message model to carry `avatar`, `time`, and optional bullet list, so Trudy's structured answer renders without hardcoded markup per bubble.
- Generate one new asset, a soft vector countryside path with a flag and shield, sized to the right panel. Keep it as a project asset alongside the existing TruEnroll images.
- All colors stay literal hex to match the mockup, consistent with how the rest of the TruEnroll components are already written.
