import { Link } from "react-router-dom";
import {
  ArrowRight,
  Stethoscope,
  Pill,
  Calculator,
  FileSearch,
  Building2,
  Compass,
  ShieldCheck,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/premium/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/premium/Reveal";
import { PremiumCard } from "@/components/premium/PremiumCard";

type Capability = {
  title: string;
  detail: string;
  href: string;
  cta: string;
  icon: typeof Compass;
  points: string[];
};

const CAPABILITIES: Capability[] = [
  {
    title: "Price every plan in your county",
    detail:
      "The guided wizard pulls the full 2026 plan list for your rating area, applies your premium tax credit, and sorts by what you actually pay.",
    href: "/wizard",
    cta: "Start the wizard",
    icon: Compass,
    points: ["Net premium after subsidy", "Deductible and out of pocket max", "Metal level and quality rating"],
  },
  {
    title: "Know your real subsidy first",
    detail:
      "Enter household size and income and we return your monthly tax credit, cost sharing reduction level, and Medicaid or CHIP flags.",
    href: "/subsidy-calculator",
    cta: "Estimate my savings",
    icon: Calculator,
    points: ["APTC amount", "CSR 73 / 87 / 94 eligibility", "Coverage gap and hardship flags"],
  },
  {
    title: "Confirm your doctor is in network",
    detail:
      "Search a physician by name and ZIP, then see in-network status plan by plan before you enroll instead of after.",
    href: "/provider-search",
    cta: "Check my doctor",
    icon: Stethoscope,
    points: ["NPI and specialty match", "Per plan network status", "Provider directory links"],
  },
  {
    title: "Check every prescription",
    detail:
      "Autocomplete against the federal drug list, then confirm coverage and tier for each medication on each plan you are considering.",
    href: "/find-prescriptions",
    cta: "Check my medications",
    icon: Pill,
    points: ["RxNorm drug and strength search", "Covered or not covered per plan", "Formulary documents"],
  },
  {
    title: "Look up any plan by ID",
    detail:
      "Paste a plan ID and get official benefits, cost sharing rows, plan documents, and the crosswalk plan for next year.",
    href: "/plan-lookup",
    cta: "Look up a plan",
    icon: FileSearch,
    points: ["Benefit and cost sharing rows", "SBC, brochure, formulary, directory", "2026 crosswalk"],
  },
  {
    title: "Browse licensed carriers",
    detail:
      "See every insurer approved to sell on your state Marketplace this plan year, with the plan counts behind each one.",
    href: "/carriers",
    cta: "Open the directory",
    icon: Building2,
    points: ["State by state issuer list", "Plan counts per carrier", "Direct plan drill down"],
  },
];

/** Shows off what the live Marketplace integration can actually do. */
const FeatureShowcase = () => (
  <Section tone="plain">
    <SectionHeading
      eyebrow="Live federal Marketplace data"
      title="Everything you can do here, right now"
      blurb="These are not brochures. Each one queries the same Centers for Medicare and Medicaid Services data that powers HealthCare.gov, so the premiums, networks, and formularies you see are the real ones."
      className="mb-12 md:mb-16"
    />

    <RevealGroup gap={0.06} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {CAPABILITIES.map((item) => (
        <RevealItem key={item.href} className="h-full">
          <PremiumCard className="flex h-full flex-col p-7">
            <item.icon className="mb-4 h-5 w-5 text-primary" strokeWidth={1.5} />
            <h3 className="font-display text-[15px] font-semibold leading-snug text-foreground">
              {item.title}
            </h3>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{item.detail}</p>

            <ul className="mt-5 space-y-2 border-t border-border/60 pt-5">
              {item.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-[12.5px] text-muted-foreground">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {point}
                </li>
              ))}
            </ul>

            <Link
              to={item.href}
              className="group/link mt-auto inline-flex items-center gap-2 pt-6 text-[12.5px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item.cta}
              <ArrowRight
                className="h-3.5 w-3.5 transition-transform duration-300 group-hover/link:translate-x-1"
                strokeWidth={2}
              />
            </Link>
          </PremiumCard>
        </RevealItem>
      ))}
    </RevealGroup>

    <Reveal delay={0.1} className="mt-6">
      <div className="premium-card flex flex-col gap-4 p-7 sm:flex-row sm:items-center">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} />
        <p className="flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
          Every tool is free, requires no account, and never sells your information. A licensed TruEnroll
          specialist can walk through any result with you.
        </p>
        <Link
          to="/tools"
          className="group inline-flex shrink-0 items-center gap-2 text-[12.5px] font-semibold text-primary"
        >
          See all coverage tools
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={2}
          />
        </Link>
      </div>
    </Reveal>
  </Section>
);

export default FeatureShowcase;
