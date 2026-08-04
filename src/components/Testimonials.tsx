import { Quote } from "lucide-react";
import { Section, SectionHeading } from "@/components/premium/Section";
import { RevealGroup, RevealItem } from "@/components/premium/Reveal";
import { PremiumCard } from "@/components/premium/PremiumCard";

const testimonials = [
  {
    name: "Maria Gonzalez",
    location: "Houston, TX",
    text: "I was overwhelmed trying to find the right plan after losing my employer coverage. My agent walked me through every option clearly and patiently. I never felt rushed or pressured.",
    plan: "Individual and family",
  },
  {
    name: "David Park",
    location: "Atlanta, GA",
    text: "What impressed me most was the follow-up. Even months after enrollment, they checked in to make sure everything was working. That kind of ongoing support is genuinely rare.",
    plan: "ACA Marketplace",
  },
  {
    name: "Sandra Mitchell",
    location: "Phoenix, AZ",
    text: "My parents needed Medicare guidance, and the team here made the entire process simple. They explained the differences between plans in a way we could actually understand.",
    plan: "Medicare",
  },
];

const Testimonials = () => (
  <Section tone="tinted">
    <SectionHeading
      eyebrow="Testimonials"
      title="What our clients say"
      blurb="Real households in real counties, reviewed by a licensed specialist before they enrolled."
      className="mb-12 md:mb-16"
    />

    <RevealGroup gap={0.09} className="grid gap-5 md:grid-cols-3">
      {testimonials.map((item) => (
        <RevealItem key={item.name} className="h-full">
          <PremiumCard className="flex h-full flex-col p-7">
            <Quote className="mb-5 h-5 w-5 text-accent" strokeWidth={1.5} aria-hidden />
            <blockquote className="flex-1 text-[14.5px] leading-relaxed text-foreground/85">
              {item.text}
            </blockquote>
            <div className="mt-7 border-t border-border/70 pt-5">
              <p className="font-display text-sm font-semibold text-foreground">{item.name}</p>
              <p className="mt-1 text-[11.5px] text-muted-foreground">
                {item.location} · {item.plan}
              </p>
            </div>
          </PremiumCard>
        </RevealItem>
      ))}
    </RevealGroup>
  </Section>
);

export default Testimonials;
