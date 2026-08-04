import type { Transition, Variants } from "framer-motion";

/** Shared motion tokens. Nothing in the app should hardcode an easing or duration. */
export const ease = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 30,
  mass: 0.7,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 22,
};

export const dur = { xs: 0.12, sm: 0.2, md: 0.4, lg: 0.7, xl: 1 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: dur.md, ease: ease.out } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: dur.lg, ease: ease.out } },
};

export const stagger = (gap = 0.07, delayChildren = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren } },
});

export const viewportOnce = { once: true, margin: "-12% 0px -8% 0px" } as const;
