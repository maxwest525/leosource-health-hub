import { Compass, Calculator, Stethoscope, Pill, FileSearch, Building2, HeartPulse } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SmartTool = {
  title: string;
  blurb: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

/** The shopper-facing tools powered by live Marketplace data. */
export const SMART_TOOLS: SmartTool[] = [
  {
    title: "Guided plan wizard",
    blurb: "Answer a few questions and we price every plan in your county with your subsidy already applied.",
    href: "/wizard",
    icon: Compass,
    badge: "Start here",
  },
  {
    title: "Savings estimator",
    blurb: "See your premium tax credit, cost sharing reductions, and Medicaid or CHIP eligibility in seconds.",
    href: "/subsidy-calculator",
    icon: Calculator,
  },
  {
    title: "Doctor network check",
    blurb: "Search a physician by name and see which plans actually list them as in network.",
    href: "/provider-search",
    icon: Stethoscope,
  },
  {
    title: "Prescription check",
    blurb: "Look up your medications and confirm coverage and tier before you commit to a plan.",
    href: "/find-prescriptions",
    icon: Pill,
  },
  {
    title: "Plan lookup by ID",
    blurb: "Pull official benefits, cost sharing, and plan documents for any Marketplace plan ID.",
    href: "/plan-lookup",
    icon: FileSearch,
  },
  {
    title: "Carrier directory",
    blurb: "Browse every insurer licensed to sell on your state Marketplace this plan year.",
    href: "/carriers",
    icon: Building2,
  },
  {
    title: "Medicare finder",
    blurb: "Compare Medicare Advantage and supplement options with a licensed specialist.",
    href: "/find-mapd",
    icon: HeartPulse,
  },
];
