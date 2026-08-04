import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import CTABanner from "@/components/CTABanner";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const values = [
  "Licensed and certified across all 50 states",
  "Focused on consumer education, not pressure",
  "Transparent about plan costs and benefits",
  "Committed to long-term client relationships",
  "Available for questions before and after enrollment",
  "Bilingual support available (English & Spanish)",
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </div>
          <div className="section-container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">About Us</p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="h-px w-8 bg-primary/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Built on Doing Things Right
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed">
                TruEnroll was founded on a simple belief: families deserve clear, honest help understanding their health coverage options — without pressure, confusion, or hidden agendas.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <ScrollFadeIn>
          <section className="py-8 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            </div>
            <div className="section-container relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                {[
                  { value: "24,000+", label: "Families served" },
                  { value: "50", label: "State licenses" },
                  { value: "98%", label: "Client satisfaction" },
                  { value: "24/7", label: "Support access" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center rounded-xl border border-border/60 bg-card/50 p-5">
                    <span className="text-2xl md:text-3xl font-bold text-foreground tabular-nums">{stat.value}</span>
                    <p className="text-muted-foreground text-[11px] mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        {/* Mission */}
        <ScrollFadeIn>
          <section className="py-10 md:py-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-0 w-[500px] h-[400px] rounded-full bg-primary/[0.05] blur-[100px]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            </div>
            <div className="section-container relative z-10">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Philosophy</p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="h-px w-8 bg-primary/40" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                    <span className="h-px w-8 bg-primary/40" />
                  </div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight leading-[1.1]">Our Service Philosophy</h2>
                </div>

                <div className="text-center space-y-4 mb-10">
                  <p className="text-muted-foreground text-base font-light leading-relaxed max-w-2xl mx-auto">
                    We believe that every person deserves access to clear, understandable information about their health coverage options. Our agents don't work on commission pressure — they work on getting it right.
                  </p>
                  <p className="text-muted-foreground text-base font-light leading-relaxed max-w-2xl mx-auto">
                    That means taking the time to listen, educating rather than selling, and remaining available long after enrollment is complete.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {values.map((v, i) => (
                    <motion.div key={v} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
                      className="flex items-start gap-2.5 rounded-lg border border-border/40 p-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-foreground text-sm font-medium leading-snug">{v}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
