import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Phone, Check, Stethoscope, Pill, ShieldCheck, Scale } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const tracks = [
  {
    title: "Medicare Advantage (MAPD)",
    desc: "All-in-one plans that bundle hospital, medical and Part D drug coverage through a carrier network, often with extras.",
    features: ["Part D drugs included", "Dental, vision, hearing extras", "Network copays and out-of-pocket max", "Star ratings shown per plan"],
    icon: Stethoscope,
  },
  {
    title: "Medicare Supplement",
    desc: "Medigap plans that pay the gaps Original Medicare leaves behind, with any provider that accepts Medicare.",
    features: ["No carrier network", "Predictable cost sharing", "Plan letters compared side by side", "Pair with a standalone Part D plan"],
    icon: ShieldCheck,
  },
];

const steps = [
  { n: "01", title: "Tell us your ZIP and start date", text: "We pull the plans available in your county for the coverage year." },
  { n: "02", title: "Add doctors and prescriptions", text: "We match your providers and drugs against each plan formulary and network." },
  { n: "03", title: "Compare and speak with an agent", text: "Sort by premium, out-of-pocket max or fit score, then review with a licensed agent." },
];

const MapdSupplement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          </div>
          <div className="section-container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-5">Medicare</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Find my MAPD or Supplement
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed mb-8">
                A short intake matches your ZIP, doctors and prescriptions against the Medicare Advantage and Medigap plans sold in your county. No account needed to see results.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild className="group">
                  <Link to="/find-mapd">
                    Start my Medicare intake
                    <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border/60" asChild>
                  <a href="tel:+18007581590"><Phone className="mr-1 w-4 h-4" strokeWidth={1.5} /> Speak with a specialist</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <ScrollFadeIn>
          <section className="py-10 md:py-20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            </div>
            <div className="section-container relative z-10">
              <div className="text-center mb-10 md:mb-14">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 tracking-tight leading-[1.1]">Two ways to cover Medicare</h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto font-light">
                  The intake asks a few questions, then shows the path that fits your doctors, drugs and budget.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {tracks.map((track, i) => (
                  <motion.div
                    key={track.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6"
                  >
                    <track.icon className="w-5 h-5 text-primary mb-3" strokeWidth={1.5} />
                    <h3 className="font-semibold text-foreground text-base mb-3">{track.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-5">{track.desc}</p>
                    <ul className="space-y-2">
                      {track.features.map((f) => (
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
          <section className="py-10 md:py-20">
            <div className="section-container">
              <div className="text-center mb-10 md:mb-14">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">How the intake works</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.n}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6"
                  >
                    <span className="text-[11px] font-semibold tracking-[0.2em] text-primary">{step.n}</span>
                    <h3 className="font-semibold text-foreground text-base mt-2 mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">{step.text}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button size="lg" asChild className="group">
                  <Link to="/find-mapd">
                    Start my Medicare intake
                    <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={1.5} />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-border/60" asChild>
                  <Link to="/find-prescriptions">
                    <Pill className="mr-1 w-4 h-4" strokeWidth={1.5} /> Check my prescriptions first
                  </Link>
                </Button>
              </div>

              <p className="mt-6 text-center text-[11px] text-muted-foreground/80 max-w-2xl mx-auto flex items-center justify-center gap-2">
                <Scale className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                Plan availability and pricing come from the current Medicare plan year and can change at renewal.
              </p>
            </div>
          </section>
        </ScrollFadeIn>
      </main>
      <Footer />
    </div>
  );
};

export { MapdSupplement };
export default MapdSupplement;
