import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/premium/Section";
import { Reveal } from "@/components/premium/Reveal";
import { StatCounter } from "@/components/premium/PremiumCard";

const STATS = [
  { value: 24000, suffix: "+", label: "Families served since 2016" },
  { value: 50, label: "State licenses held" },
  { value: 98, suffix: "%", label: "Client satisfaction rating" },
  { value: 0, prefix: "$", label: "Cost to work with an agent" },
];

const About = () => (
  <Section tone="plain">
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-20">
      <SectionHeading
        eyebrow="About"
        title="Built on doing things right"
        blurb="TruEnroll was founded on a straightforward belief: families deserve clear, honest help understanding their health coverage options. No pressure, no fine print surprises, and no selling your information to the highest bidder."
        className="max-w-xl"
      />

      <Reveal delay={0.08}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-l border-border/70 pl-8 sm:gap-x-12 sm:pl-12">
          {STATS.map((stat) => (
            <StatCounter
              key={stat.label}
              value={stat.value}
              prefix={stat.prefix}
              suffix={stat.suffix}
              label={stat.label}
              className="text-left"
            />
          ))}
        </div>
      </Reveal>
    </div>

    <Reveal delay={0.12} className="mt-12">
      <Link
        to="/about"
        className="group inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Learn more about our company
        <ArrowRight
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          strokeWidth={2}
        />
      </Link>
    </Reveal>
  </Section>
);

export default About;
