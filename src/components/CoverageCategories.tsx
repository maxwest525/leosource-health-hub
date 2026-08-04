import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Section, SectionHeading } from "@/components/premium/Section";
import { RevealGroup, RevealItem } from "@/components/premium/Reveal";
import { PremiumCard } from "@/components/premium/PremiumCard";

const categories = [
  {
    title: "Individual and family",
    description:
      "ACA Marketplace, short-term medical, and limited medical plans for individuals and families at every stage of life.",
    link: "/individual-family",
    tag: "Most requested",
  },
  {
    title: "Medicare",
    description:
      "Licensed guidance through Medicare Advantage, Supplement (Medigap), and Part D prescription drug plans.",
    link: "/medicare",
    tag: "Age 65 and eligible",
  },
  {
    title: "Dental and vision",
    description:
      "Standalone dental and vision coverage for preventive care, exams, major services, and eyewear.",
    link: "/dental-vision",
    tag: "Add-on",
  },
  {
    title: "Supplemental",
    description:
      "Accident, critical illness, hospital indemnity, and term life options that sit alongside your medical plan.",
    link: "/individual-family",
    tag: "Extra protection",
  },
];

const CoverageCategories = () => (
  <Section tone="plain" lattice>
    <SectionHeading
      eyebrow="Coverage"
      title="Four ways we help households get covered"
      blurb="Each path is handled by a state-licensed specialist who compares real plans in your county before recommending anything."
      className="mb-12 md:mb-16"
    />

    <RevealGroup gap={0.08} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((cat, index) => (
        <RevealItem key={cat.title} className="h-full">
          <Link to={cat.link} className="group block h-full focus-visible:outline-none">
            <PremiumCard
              tilt
              className="flex h-full flex-col p-6 group-focus-visible:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-primary/40"
            >
              <div className="mb-6 flex items-start justify-between">
                <span className="font-display text-[11px] font-semibold tabular-nums tracking-[0.2em] text-muted-foreground/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
                  strokeWidth={1.75}
                />
              </div>

              <h3 className="font-display text-[16px] font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
                {cat.title}
              </h3>
              <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                {cat.description}
              </p>
              <p className="mt-6 flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-foreground/60">
                <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                {cat.tag}
              </p>
            </PremiumCard>
          </Link>
        </RevealItem>
      ))}
    </RevealGroup>
  </Section>
);

export default CoverageCategories;
