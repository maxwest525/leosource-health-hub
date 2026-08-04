import { ClipboardList, Search, HeadphonesIcon, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Section, SectionHeading } from "@/components/premium/Section";
import { RevealGroup, RevealItem } from "@/components/premium/Reveal";
import { ease, viewportOnce } from "@/lib/motion";

const steps = [
  {
    icon: ClipboardList,
    label: "Tell us what you need",
    description: "Household size, budget, doctors and prescriptions. Two minutes, no account.",
  },
  {
    icon: Search,
    label: "Review your options",
    description: "Live Marketplace pricing for your county, sorted by what you actually pay.",
  },
  {
    icon: HeadphonesIcon,
    label: "Get licensed guidance",
    description: "A state-licensed specialist reviews the shortlist with you at no cost.",
  },
  {
    icon: CheckCircle2,
    label: "Enroll with confidence",
    description: "We handle the application and stay on file for billing and network questions.",
  },
];

/** Deep navy anchor band. Four-step rail with a line that draws in on scroll. */
const HowItWorks = () => (
  <Section tone="ink" lattice>
    <SectionHeading
      align="center"
      eyebrow="Process"
      title="Four steps from question to coverage"
      blurb="No call center scripts and no lead resale. The same specialist stays with you from the first question through your renewal."
      className="mb-14 md:mb-20"
    />

    {/* Desktop rail */}
    <div className="mx-auto hidden max-w-5xl md:block">
      <div className="relative grid grid-cols-4 gap-6">
        <motion.span
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1.1, ease: ease.out, delay: 0.15 }}
          className="absolute left-[12.5%] right-[12.5%] top-6 h-px origin-left bg-gradient-to-r from-primary/50 via-border to-border/20"
        />
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.55, delay: 0.2 + index * 0.12, ease: ease.out }}
            className="group relative text-center"
          >
            <div className="relative z-10 mx-auto mb-6 flex h-12 w-12 items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-background ring-1 ring-border transition-colors duration-300 group-hover:ring-primary/50"
              />
              <step.icon
                className="relative h-5 w-5 text-primary transition-transform duration-300 group-hover:-translate-y-0.5"
                strokeWidth={1.5}
              />
            </div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              Step {index + 1}
            </p>
            <p className="font-display text-[15px] font-semibold leading-snug text-foreground">
              {step.label}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Mobile stack */}
    <RevealGroup className="mx-auto max-w-md md:hidden">
      {steps.map((step, index) => (
        <RevealItem key={step.label} className="relative flex items-start gap-4">
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[23px] top-12 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-border to-transparent"
            />
          )}
          <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <step.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </span>
          <div className="pb-8 pt-1.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/80">
              Step {index + 1}
            </p>
            <p className="font-display text-[15px] font-semibold leading-snug text-foreground">
              {step.label}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        </RevealItem>
      ))}
    </RevealGroup>
  </Section>
);

export default HowItWorks;
