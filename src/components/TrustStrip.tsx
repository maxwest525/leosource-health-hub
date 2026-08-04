import { BadgeCheck, HandCoins, Activity, LifeBuoy, Lock } from "lucide-react";
import { Reveal } from "@/components/premium/Reveal";

const trustItems = [
  { icon: BadgeCheck, label: "Licensed agents in 49 states" },
  { icon: HandCoins, label: "No-cost, no-obligation consultations" },
  { icon: Activity, label: "Live federal Marketplace pricing" },
  { icon: LifeBuoy, label: "Support before and after enrollment" },
  { icon: Lock, label: "Your information is never sold" },
];

/** Thin credibility rail directly under the hero. */
const TrustStrip = () => (
  <section className="relative overflow-hidden border-y border-border/60 bg-surface-sunken py-3">
    <Reveal y={8} className="section-container">
      <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-center md:overflow-visible md:whitespace-normal">
        {trustItems.map(({ icon: Icon, label }) => (
          <span key={label} className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium leading-5 tracking-[0.01em] text-muted-foreground">
            <Icon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </Reveal>
  </section>
);


export default TrustStrip;

