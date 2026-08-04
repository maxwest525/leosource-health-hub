import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section, SectionHeading } from "@/components/premium/Section";
import { Reveal } from "@/components/premium/Reveal";

const faqs = [
  {
    q: "What types of health insurance plans can I explore?",
    a: "We help individuals and families access ACA Marketplace health plans, short-term medical, dental and vision, Medicare Advantage and Supplement, Part D prescription, and supplemental coverage like accident, critical illness, and life insurance.",
  },
  {
    q: "Is there any cost or obligation to speak with an agent?",
    a: "No. Our consultations are completely free, and there is never any obligation to enroll in a plan. We are here to help you understand your options so you can make an informed decision on your own terms.",
  },
  {
    q: "Are your agents licensed?",
    a: "Yes. Every agent at TruEnroll is state-licensed, background-checked, and trained to provide accurate, compliant health insurance guidance. We maintain active licenses in all 50 states.",
  },
  {
    q: "How does the plan comparison process work?",
    a: "A licensed agent reviews your household size, budget, preferred doctors, and prescriptions, then presents side-by-side plan comparisons priced with your premium tax credit already applied.",
  },
  {
    q: "Do you offer support after I enroll?",
    a: "Yes. We remain available to help with billing questions, provider network issues, claims concerns, and annual plan reviews, all at no additional cost.",
  },
  {
    q: "What information do I need to get started?",
    a: "Your ZIP code, household size, approximate income, and any coverage preferences are a great starting point. Your agent will guide you from there.",
  },
  {
    q: "Do you help with Medicare enrollment?",
    a: "Yes. We provide personalized guidance for Medicare-eligible consumers, including Medicare Advantage, Medicare Supplement, and Part D prescription drug plans.",
  },
  {
    q: "Is my personal information safe?",
    a: "Your privacy is a top priority. All personal information is encrypted in transit, stored securely, and never sold to third-party marketers.",
  },
];

const FAQ = () => (
  <Section tone="plain">
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
      <SectionHeading
        eyebrow="FAQ"
        title="Questions worth asking first"
        blurb="If something is not covered here, a licensed specialist can answer it in a short call."
        className="lg:sticky lg:top-28 lg:self-start"
      />

      <Reveal delay={0.08}>
        <Accordion type="single" collapsible className="space-y-2.5">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.q}
              value={`item-${index}`}
              className="overflow-hidden rounded-xl border border-border/70 bg-surface-raised px-5 shadow-soft transition-colors duration-300 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="py-5 text-left font-display text-[14.5px] font-semibold leading-snug text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[13.5px] leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </div>
  </Section>
);

export default FAQ;
