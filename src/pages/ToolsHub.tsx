import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ToolPageShell from "@/components/ToolPageShell";
import CTABanner from "@/components/CTABanner";
import { SMART_TOOLS } from "@/data/smart-tools";

const ToolsHub = () => (
  <>
    <ToolPageShell
      eyebrow="Coverage tools"
      title="Everything you need to choose coverage with confidence"
      description="Each tool runs against live Centers for Medicare and Medicaid Services Marketplace data, so what you see here is what you would see on HealthCare.gov, with a licensed specialist a phone call away."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SMART_TOOLS.map((tool, index) => (
          <motion.div
            key={tool.href}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: index * 0.06 }}
          >
            <Link
              to={tool.href}
              className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <tool.icon
                  className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.3)] group-hover:scale-110 transition-transform"
                  strokeWidth={1.5}
                />
                {tool.badge && (
                  <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-primary/80">
                    {tool.badge}
                  </span>
                )}
              </div>
              <h2 className="font-semibold text-foreground text-sm mb-1.5 group-hover:text-primary transition-colors">
                {tool.title}
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed flex-1">{tool.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-primary">
                Open tool
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </ToolPageShell>
    <CTABanner />
  </>
);

export default ToolsHub;
