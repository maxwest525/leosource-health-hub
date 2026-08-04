import { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ExternalLink, Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCarrierLogo } from "@/lib/carrier-logos";


export type QuotePlan = {
  id: string;
  name: string;
  issuer: string;
  metalLevel: string;
  planType: string;
  premium: number;
  premiumWithCredit: number;
  deductible: number | null;
  oopMax: number | null;
  hsaEligible: boolean;
  qualityRating: number | null;
  benefitsUrl: string | null;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const currency = (value: number | null) =>
  value === null || Number.isNaN(value)
    ? "Not listed"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);

/** Eases a number toward its target so refreshed pricing rolls instead of snapping. */
const useCountUp = (target: number, duration = 650) => {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
};

/** True only on devices with a precise pointer, so phones skip the 3D tilt. */
const useFinePointer = () => {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFine(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return fine;
};

/**
 * Holographic quote card: mouse-reactive 3D tilt on desktop, a light sheen that
 * tracks the cursor, corner ticks and a rolling premium readout. On phones the
 * tilt is disabled and the stats stack into full width rows so nothing clips.
 */
export const PlanCard = ({ plan, rank }: { plan: QuotePlan; rank: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const finePointer = useFinePointer();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(y, [0, 1], [6, -6]), { stiffness: 220, damping: 24 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-7, 7]), { stiffness: 220, damping: 24 });
  const sheenX = useTransform(x, (v) => `${v * 100}%`);
  const sheenY = useTransform(y, (v) => `${v * 100}%`);
  const sheen = useMotionTemplate`radial-gradient(320px circle at ${sheenX} ${sheenY}, hsl(var(--primary)/0.16), transparent 70%)`;
  const rolling = useCountUp(plan.premiumWithCredit);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!finePointer) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((event.clientX - rect.left) / rect.width);
    y.set((event.clientY - rect.top) / rect.height);
  };

  const reset = () => {
    x.set(0.5);
    y.set(0.5);
  };

  const stats = [
    { label: "Full price", value: currency(plan.premium) },
    { label: "Deductible", value: currency(plan.deductible) },
    { label: "OOP max", value: currency(plan.oopMax) },
  ];

  const logo = resolveCarrierLogo(plan.issuer);
  const initials =
    plan.issuer
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("") || "?";


  return (
    <motion.div
      layout
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      style={
        finePointer
          ? { rotateX, rotateY, transformStyle: "preserve-3d", perspective: 900 }
          : undefined
      }
      className="group relative w-full min-w-0 max-w-full"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card/70 p-3 backdrop-blur-xl transition-colors duration-300 hover:border-primary/45 sm:p-3.5">
        {/* Cursor sheen */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: sheen }}
        />
        {/* Neon top line */}
        <span className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-40 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            {logo ? (
              <img
                src={logo}
                alt={`${plan.issuer} logo`}
                width={32}
                height={32}
                loading="lazy"
                className="mt-0.5 h-8 w-8 shrink-0 rounded-md object-contain"
              />
            ) : (
              <span
                aria-hidden
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 text-[11px] font-semibold text-primary"
              >
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {plan.metalLevel || "Plan"}
                </span>
                {rank === 1 && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold text-primary">
                    <Sparkle className="h-3 w-3 shrink-0" strokeWidth={2} />
                    Lowest net
                  </span>
                )}
              </div>
              <p className="break-words text-sm font-semibold leading-snug text-foreground">
                {plan.name}
              </p>
              <p className="break-words text-xs leading-snug text-muted-foreground">
                {plan.issuer} · {plan.planType}
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-lg font-bold leading-none tabular-nums text-foreground sm:text-xl">
              {currency(Math.round(rolling))}
            </p>
            <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
              per month after credit
            </p>
          </div>
        </div>

        <dl className="relative mt-2.5 grid grid-cols-3 gap-x-3 rounded-xl border border-border/60 bg-background/40 px-3 py-1.5 text-[11px]">
          {stats.map((cell) => (
            <div key={cell.label} className="min-w-0">
              <dt className="truncate text-muted-foreground">{cell.label}</dt>
              <dd className="truncate font-medium tabular-nums text-foreground">{cell.value}</dd>
            </div>
          ))}
        </dl>

        <div className="relative mt-2.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3">

          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            {plan.hsaEligible && <span className="text-primary">HSA eligible</span>}
            {plan.qualityRating !== null && (
              <span className={cn(plan.hsaEligible && "before:mr-2 before:content-['·']")}>
                CMS rating {plan.qualityRating}/5
              </span>
            )}
          </div>
          {plan.benefitsUrl && (
            <a
              href={plan.benefitsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`View benefits summary for ${plan.name}`}
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 px-4 py-2.5 text-sm text-primary transition-colors hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:min-h-0 sm:w-auto sm:border-0 sm:px-0 sm:py-0 sm:text-xs sm:hover:bg-transparent"
            >
              Benefits
              <ExternalLink className="h-4 w-4 sm:h-3 sm:w-3" />
            </a>
          )}
        </div>

      </div>
    </motion.div>
  );
};
