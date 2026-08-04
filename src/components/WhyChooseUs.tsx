import { Check } from "lucide-react";
import { Section, SectionHeading } from "@/components/premium/Section";
import { RevealGroup, RevealItem } from "@/components/premium/Reveal";

const points = [
  {
    title: "Licensed, experienced agents",
    description:
      "Every agent is state-licensed and trained across ACA, Medicare, dental, vision, and supplemental lines.",
  },
  {
    title: "Clear, honest explanations",
    description: "Plain language on networks, deductibles, and renewals. No jargon and no fine print surprises.",
  },
  {
    title: "Real people, real support",
    description: "When you call, you reach the specialist assigned to your household. Not a chatbot or a queue.",
  },
  {
    title: "Support beyond enrollment",
    description: "Billing, claims questions, provider network issues, and an annual plan review each fall.",
  },
  {
    title: "Your privacy, our priority",
    description: "Your information is encrypted in transit, stored securely, and never sold to lead buyers.",
  },
  {
    title: "Service over sales",
    description: "We measure success by how well you understand your coverage, not by how fast you sign.",
  },
];

const WhyChooseUs = () => (
  <Section tone="plain">
    <SectionHeading
      eyebrow="Why us"
      title="Why families choose TruEnroll"
      blurb="We exist to make health insurance less confusing, with licensed professionals who stay reachable after the paperwork is done."
      className="mb-12 md:mb-16"
    />

    <RevealGroup
      gap={0.06}
      className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:grid-cols-2 lg:grid-cols-3"
    >
      {points.map((point) => (
        <RevealItem
          key={point.title}
          className="group relative bg-surface-raised p-7 transition-colors duration-300 hover:bg-surface-sunken"
        >
          <Check
            className="mb-4 h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110"
            strokeWidth={2.25}
            aria-hidden
          />
          <h3 className="font-display text-[15px] font-semibold leading-snug text-foreground">{point.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{point.description}</p>
        </RevealItem>
      ))}
    </RevealGroup>
  </Section>
);

export default WhyChooseUs;
