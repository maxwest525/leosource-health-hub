import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ChevronRight, Check, Phone } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const DentalVision = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);

  const plans = [
    { title: "Dental Coverage", desc: "Plans covering preventive care like cleanings and X-rays, basic procedures, and major services like crowns and bridges.", features: ["Preventive cleanings & exams", "Basic fillings & extractions", "Major services (crowns, bridges)", "Orthodontic options"] },
    { title: "Vision Coverage", desc: "Plans covering annual eye exams, prescription lenses, frames, and contact lenses for year-round vision health.", features: ["Annual eye exams", "Prescription lenses", "Frames & contact lenses", "Corrective procedure discounts"] },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>
          <div className="section-container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Dental & Vision</p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="h-px w-8 bg-primary/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Dental & Vision Plans
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed mb-8">
                Protect your oral and eye health with standalone dental and vision plans for you and your family.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" onClick={() => setQuoteOpen(true)} className="group bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                  View Plans <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </Button>
                <Button size="lg" variant="outline" className="border-border/60" asChild>
                  <a href="tel:+18007581590"><Phone className="mr-1 w-4 h-4" strokeWidth={1.5} /> Call an Agent</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <ScrollFadeIn>
          <section className="py-10 md:py-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/3 w-[500px] h-[400px] rounded-full bg-primary/[0.05] blur-[100px]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            </div>
            <div className="section-container relative z-10">
              <div className="text-center mb-10 md:mb-14">
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Coverage Details</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="h-px w-8 bg-primary/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="h-px w-8 bg-primary/40" />
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight leading-[1.1]">What Plans Typically Cover</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {plans.map((plan, i) => (
                  <motion.div key={plan.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6">
                    <h3 className="font-semibold text-foreground text-base mb-3">{plan.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-5">{plan.desc}</p>
                    <ul className="space-y-2">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-foreground/80">
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        <ScrollFadeIn>
          <section className="py-10 md:py-16 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-primary/[0.07] blur-[100px]" />
            </div>
            <div className="section-container relative z-10 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Ready to explore dental and vision options?</h2>
              <p className="text-muted-foreground text-sm mb-6">Talk to a licensed agent who can walk you through what's available.</p>
              <Button size="lg" onClick={() => setQuoteOpen(true)} className="group bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                View Dental & Vision Plans <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
              </Button>
            </div>
          </section>
        </ScrollFadeIn>
      </main>
      <Footer />
      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
};

export default DentalVision;
