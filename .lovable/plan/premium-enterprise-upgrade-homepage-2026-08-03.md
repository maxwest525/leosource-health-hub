# Premium enterprise upgrade: homepage

Goal: the homepage should read like a national carrier's site (BCBS, Cigna) rather than a template. Light navy-on-white base, a few deep-navy anchor bands for gravitas, sharper typography, and cinematic but disciplined motion.

## Direction

- **Surface rhythm**: alternating bands. White -> soft tinted -> deep navy -> white. Dark anchors go on the hero footer strip, the "how it works" band, and the final CTA + footer. Every band gets a hairline top rule and generous vertical breathing room (roughly 1.5x current).
- **Type**: Sora for headings, Manrope for body. Tighter tracking on large headlines, a real scale (display / h1 / h2 / eyebrow / body / caption) instead of ad-hoc sizes. Eyebrows stay uppercase micro-caps in gold.
- **Color**: keep deep navy primary and golden orange accent. Add elevated surface tokens, a navy ink token for dark bands, and shadow tokens tuned for light surfaces (soft, wide, low opacity) instead of the current generic shadows.
- **Chrome**: one shared card treatment. Rounded-2xl, hairline border, subtle inner top highlight, restrained hover lift. No mixed border radii across sections.
- **Motion (level 4)**: scroll-triggered staggered reveals on every section, parallax on hero and the dark bands, counting numbers on stats, gentle mouse-reactive tilt on the primary feature cards, animated hairline dividers that draw in. All transform/opacity only, all gated behind reduced-motion.

## Section-by-section

1. **Header** — slimmer, sharper. Solid on scroll with a hairline shadow, transparent over the hero. Mega-menu panels get the shared card chrome.
2. **Hero** — keep the video and the draggable eligibility card. Refine the overlay so the footage reads cleaner, rebuild the headline on the new type scale, and convert the trust strip into a proper glass rail pinned to the bottom of the hero.
3. **Trust strip / carriers** — merge into one credibility band: stat counters (families served, carriers, states) plus the carrier logo rail on a single tinted surface with hairline dividers.
4. **Coverage categories** — editorial card grid with real imagery or iconography, one card given visual priority instead of a uniform 4-up.
5. **Smart tools + feature showcase** — consolidate into one "what you can do here" section with a bento-style grid so the tools actually look like a product suite.
6. **How it works** — deep navy anchor band, numbered timeline with a drawing connector line.
7. **Why choose us / licensed support** — asymmetric 60/40 split, advisor portrait, proof points with concrete numbers.
8. **Testimonials** — quieter editorial treatment, no card soup.
9. **CTA banner + footer** — second navy anchor, full-bleed, single strong action, footer restructured into a proper multi-column enterprise footer.

## Copy

Sentence case throughout. Replace vague claims with concrete ones (licensed in N states, X carriers, no fee to you, 2026 plan year). No em dashes, no hype adjectives. "Speak with a specialist" stays the standard phrasing.

## Technical notes

- Add Sora + Manrope via the existing Google Fonts import; wire `fontFamily.display` and `fontFamily.sans` in `tailwind.config.ts`.
- Extend `src/index.css` tokens: `--ink` (navy band background), `--surface-raised`, `--shadow-soft`, `--shadow-lift`, `--hairline`, plus a `.band-ink` utility that flips foreground/muted tokens inside dark sections so components stay token-driven.
- Add reusable presentation components under `src/components/premium/`: `Section` (band variant + eyebrow + heading), `Reveal` (scroll stagger primitive), `StatCounter`, `PremiumCard`. Existing sections get refactored to use them.
- Motion tokens (`ease`, `dur`, `fadeUp`, `stagger`) in `src/lib/motion.ts` so no section hardcodes easings.
- Wrap the app in `MotionConfig reducedMotion="user"`.
- Scope: homepage sections, `Header`, `Footer`, and the shared tokens. Inner tool pages and the AI quote console are untouched this pass, though they inherit the new tokens and fonts.
- No backend, data, or business logic changes.
