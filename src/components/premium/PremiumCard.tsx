import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";
import { ease } from "@/lib/motion";

type PremiumCardProps = {
  className?: string;
  /** Enables the subtle mouse-reactive tilt on precise-pointer devices. */
  tilt?: boolean;
  children: ReactNode;
};

/** Shared card chrome: hairline border, inner top highlight, restrained lift. */
export const PremiumCard = ({ className, tilt = false, children }: PremiumCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>();

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || window.matchMedia("(pointer: coarse)").matches) return;
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    setTransform(`perspective(1100px) rotateX(${-py * 4}deg) rotateY(${px * 5}deg)`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setTransform(undefined)}
      style={transform ? { transform } : undefined}
      className={cn("premium-card", className)}
    >
      {children}
    </div>
  );
};

type StatCounterProps = {
  value: number;
  /** Rendered after the animated number, e.g. "+" or "%". */
  suffix?: string;
  prefix?: string;
  label: string;
  className?: string;
};

/** Counts up once the stat scrolls into view. Falls back to the final value. */
export const StatCounter = ({ value, suffix = "", prefix = "", label, className }: StatCounterProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const duration = 1100;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: ease.out }}
      className={cn("text-center sm:text-left", className)}
    >
      <p className="font-display text-3xl font-semibold tabular-nums tracking-[-0.02em] text-foreground sm:text-4xl">
        {prefix}
        {display.toLocaleString("en-US")}
        {suffix}
      </p>
      <p className="mt-1.5 text-[12px] leading-snug text-muted-foreground">{label}</p>
    </motion.div>
  );
};
