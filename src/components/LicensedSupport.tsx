import { Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";
import advisorImage from "@/assets/advisor-headshot.jpg";

const benefits = [
  "Licensed in all 50 states",
  "One-on-one guidance",
  "No call center queues",
  "No obligation, ever",
  "Response within one business day",
  "Support after enrollment",
];

const LicensedSupport = () => {
  return (
    <ScrollFadeIn>
      <section className="py-10 md:py-20 relative overflow-hidden section-bg-subtle texture-noise">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.05] blur-[120px]" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </div>

        <div className="section-container relative z-10">
          <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
            <p className="eyebrow mb-4">
              <span aria-hidden className="mr-3 inline-block h-px w-6 bg-accent/60 align-middle" />
              Licensed support
              <span aria-hidden className="ml-3 inline-block h-px w-6 bg-accent/60 align-middle" />
            </p>
            <h2 className="text-balance font-display text-3xl font-semibold leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl md:text-[2.9rem]">
              Speak with a licensed specialist
            </h2>
            <p className="mt-5 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Health insurance decisions are personal. Connect with a licensed agent who explains options in plain
              language.
            </p>
          </div>


          <div className="max-w-4xl mx-auto">
            <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 sm:p-8 md:p-10">
              <div className="grid md:grid-cols-5 gap-8 items-center">
                <div className="md:col-span-2 flex justify-center">
                  <div className="relative">
                    <div className="w-48 h-56 rounded-2xl overflow-hidden">
                      <img src={advisorImage} alt="Licensed TruEnroll insurance agent" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-card border border-border/60 rounded-xl px-3 py-2 shadow-md">
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Licensed Agent</p>
                      <p className="text-foreground font-bold text-xs mt-0.5">Ready to help</p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                    {benefits.map((item) => (
                      <p key={item} className="text-foreground text-sm font-medium flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        {item}
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-3">
                    <Button size="lg" variant="premium" asChild>
                      <Link to="/get-started">Schedule a Consultation</Link>
                    </Button>
                    <Button size="lg" variant="outline" className="border-border/60" asChild>
                      <a href="tel:+18007581590">
                        <Phone className="w-4 h-4 mr-1.5" />
                        Call 800.758.1590
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </ScrollFadeIn>
  );
};

export default LicensedSupport;
