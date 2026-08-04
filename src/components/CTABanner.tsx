import { useState } from "react";
import { ChevronRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import { Section } from "@/components/premium/Section";
import { Reveal } from "@/components/premium/Reveal";

const CTABanner = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);

  return (
    <>
      <Section tone="ink" lattice>
        {/* Warm bloom behind the headline */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.10] blur-[140px]"
        />

        <div className="relative mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="eyebrow mb-5">Ready when you are</p>
            <h2 className="text-balance font-display text-3xl font-semibold leading-[1.06] tracking-[-0.02em] text-foreground sm:text-4xl md:text-[3.1rem]">
              Talk it through with a licensed specialist
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              We review your county pricing, confirm your doctors and prescriptions, and walk through the
              shortlist together. No cost, no obligation.
            </p>
          </Reveal>

          <Reveal delay={0.1} className="mt-10">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                variant="premium"
                onClick={() => setQuoteOpen(true)}
                className="group w-full sm:w-auto"
              >
                Get started
                <ChevronRight
                  className="ml-1 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={1.75}
                />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-border bg-transparent text-foreground transition-colors duration-300 hover:bg-foreground/5 sm:w-auto"
                asChild
              >
                <a href="tel:+18007581590">
                  <Phone className="mr-1 h-4 w-4" strokeWidth={1.75} />
                  Call 800.758.1590
                </a>
              </Button>
            </div>
          </Reveal>
        </div>
      </Section>
      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </>
  );
};

export default CTABanner;
