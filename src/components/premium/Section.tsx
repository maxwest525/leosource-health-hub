import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/premium/Reveal";

export type BandTone = "plain" | "tinted" | "ink";

const toneClass: Record<BandTone, string> = {
  plain: "bg-background",
  tinted: "bg-surface-sunken",
  ink: "band-ink",
};

type SectionProps = {
  id?: string;
  tone?: BandTone;
  /** Adds the fine dot lattice used on feature bands. */
  lattice?: boolean;
  className?: string;
  containerClassName?: string;
  children: ReactNode;
};

/**
 * Standard page band. Owns the surface tone, hairline top rule, vertical
 * rhythm and the optional decorative lattice so no section reinvents them.
 */
export const Section = ({
  id,
  tone = "plain",
  lattice = false,
  className,
  containerClassName,
  children,
}: SectionProps) => (
  <section
    id={id}
    className={cn(
      "relative overflow-hidden py-16 sm:py-20 md:py-28",
      toneClass[tone],
      className,
    )}
  >
    <span aria-hidden className="absolute inset-x-0 top-0 h-px hairline-rule" />
    {lattice && <span aria-hidden className="dot-lattice" />}
    <div className={cn("section-container relative z-10", containerClassName)}>{children}</div>
  </section>
);

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  blurb?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

/** Eyebrow + display headline + blurb, on the shared type scale. */
export const SectionHeading = ({
  eyebrow,
  title,
  blurb,
  align = "left",
  className,
}: SectionHeadingProps) => (
  <Reveal
    className={cn(
      "max-w-2xl",
      align === "center" && "mx-auto text-center",
      className,
    )}
  >
    {eyebrow && (
      <p className="eyebrow mb-4">
        <span
          aria-hidden
          className={cn("inline-block h-px w-6 bg-accent/60 align-middle", align === "center" && "mr-3")}
        />
        {align === "center" ? <span className="mx-1">{eyebrow}</span> : <span className="ml-3">{eyebrow}</span>}
        {align === "center" && <span aria-hidden className="ml-3 inline-block h-px w-6 bg-accent/60 align-middle" />}
      </p>
    )}
    <h2 className="text-balance font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl md:text-[2.9rem]">
      {title}
    </h2>
    {blurb && (
      <p className="mt-5 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {blurb}
      </p>
    )}
  </Reveal>
);
