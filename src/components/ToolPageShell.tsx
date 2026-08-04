import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type ToolPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Shared page chrome for the individual Marketplace data tools. */
const ToolPageShell = ({ eyebrow, title, description, children }: ToolPageShellProps) => (
  <div className="min-h-screen bg-background">
    <Header />
    <main>
      <section className="relative pt-28 pb-10 md:pt-32 md:pb-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>
        <div className="section-container relative z-10">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">{eyebrow}</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4 leading-[1.1]">
              {title}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg font-light leading-relaxed">{description}</p>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="section-container">{children}</div>
      </section>
    </main>
    <Footer />
  </div>
);

export default ToolPageShell;
