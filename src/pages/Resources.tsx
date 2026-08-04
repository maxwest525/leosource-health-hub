import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FAQ from "@/components/FAQ";
import CTABanner from "@/components/CTABanner";
import { BookOpen, FileText, HelpCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";

const resources = [
  { icon: BookOpen, title: "Coverage Guide", desc: "Learn about the types of health insurance available and what each covers.", link: "/individual-family" },
  { icon: FileText, title: "Medicare Basics", desc: "Understand the different parts of Medicare and how they work together.", link: "/medicare" },
  { icon: HelpCircle, title: "Dental & Vision", desc: "Explore standalone dental and vision plans for your family.", link: "/dental-vision" },
  { icon: Phone, title: "Talk to an Agent", desc: "Get personalized guidance from a licensed professional.", link: "/get-started" },
];

const Resources = () => {
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
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">Resources</p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="h-px w-8 bg-primary/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Health Insurance Information You Can Trust
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed">
                Understanding your options is the first step toward making a confident decision.
              </p>
            </div>
          </div>
        </section>

        <ScrollFadeIn>
          <section className="py-10 md:py-16 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            </div>
            <div className="section-container relative z-10">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {resources.map((item, i) => (
                  <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}>
                    <Link to={item.link} className="group block rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
                      <item.icon className="w-5 h-5 text-primary mb-3 drop-shadow-[0_0_6px_hsl(var(--primary)/0.3)] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                      <h3 className="font-semibold text-foreground text-sm mb-1.5 group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </ScrollFadeIn>

        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default Resources;
