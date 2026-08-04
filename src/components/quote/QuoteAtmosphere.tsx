/**
 * Backdrop for the AI quote walkthrough. Intentionally plain: no dot lattice,
 * no colored glow. Purely decorative, pointer-events disabled, no animation.
 */
export const QuoteAtmosphere = () => (
  <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-background" />
);
