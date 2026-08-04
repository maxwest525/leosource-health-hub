import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SMART_TOOLS } from "@/data/smart-tools";
import { Section, SectionHeading } from "@/components/premium/Section";
import { Reveal, RevealGroup, RevealItem } from "@/components/premium/Reveal";
import { PremiumCard } from "@/components/premium/PremiumCard";

/** Homepage band highlighting the live Marketplace tools included at no cost. */
const SmartTools = () => (
  <Section tone="tinted">
    <div className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
      <SectionHeading
        eyebrow="Included with every client"
        title="Tools that answer the questions quotes never do"
        blurb="Is my doctor in network? Is my prescription covered? What is my real subsidy? We pull the answers from the same federal data HealthCare.gov uses, with no account required."
      />
      <Reveal delay={0.1} className="shrink-0">
        <Link
          to="/tools"
          className="group inline-flex items-center gap-2 text-[13px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          See all coverage tools
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={2}
          />
        </Link>
      </Reveal>
    </div>

    <RevealGroup gap={0.06} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {SMART_TOOLS.slice(0, 6).map((tool) => (
        <RevealItem key={tool.href} className="h-full">
          <Link to={tool.href} className="group block h-full focus-visible:outline-none">
            <PremiumCard className="flex h-full flex-col p-6 group-focus-visible:border-primary/60 group-focus-visible:ring-2 group-focus-visible:ring-primary/40">
              <tool.icon
                className="mb-4 h-5 w-5 text-primary transition-transform duration-300 group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
              <h3 className="font-display text-[15px] font-semibold leading-snug text-foreground transition-colors duration-300 group-hover:text-primary">
                {tool.title}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">{tool.blurb}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary">
                Open tool
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </span>
            </PremiumCard>
          </Link>
        </RevealItem>
      ))}
    </RevealGroup>
  </Section>
);

export default SmartTools;
