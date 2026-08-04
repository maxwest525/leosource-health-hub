import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ChevronRight, Check, Phone } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const Medicare = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);

  const plans = [
    { title: "Medicare Advantage (Part C)", desc: "All-in-one plans combining Part A, Part B, and often Part D, with potential extras like dental, vision, hearing, and fitness.", features: ["Combines hospital & medical", "Often includes prescription", "May include dental & vision"] },
    { title: "Medicare Supplement (Medigap)", desc: "Supplemental policies that cover costs Original Medicare doesn't pay — copayments, coinsurance, and deductibles.", features: ["Covers out-of-pocket gaps", "Use any Medicare provider", "Predictable costs"] },
    { title: "Part D Prescription", desc: "Standalone prescription drug plans that work alongside Original Medicare or Medigap to help cover medication costs.", features: ["Brand & generic coverage", "Pharmacy network options", "Annual formulary review"] },
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Medicare</p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="h-px w-8 bg-primary/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Medicare Guidance from Licensed Professionals
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed mb-8">
                Our licensed agents help you understand Medicare Advantage, Supplement, and Part D options — so you can choose coverage that fits.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" onClick={() => setQuoteOpen(true)} className="group bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                  Explore Medicare Plans <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                </Button>
                <Button size="lg" variant="outline" className="border-border/60" asChild>
                  <a href="tel:+18007581590"><Phone className="mr-1 w-4 h-4" strokeWidth={1.5} /> Speak with an Agent</a>
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
                <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Plan Types</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="h-px w-8 bg-primary/40" />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="h-px w-8 bg-primary/40" />
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight leading-[1.1]">Medicare Plan Types</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
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
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Need help choosing a Medicare plan?</h2>
              <p className="text-muted-foreground text-sm mb-6">Our agents explain the differences and help you find the right fit — at no cost.</p>
              <Button size="lg" onClick={() => setQuoteOpen(true)} className="group bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                Explore Medicare Plans <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
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

export default Medicare;
