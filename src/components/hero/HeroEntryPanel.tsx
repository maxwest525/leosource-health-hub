import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  GripVertical,
  MousePointerClick,
  CalendarClock,
  Sparkle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelfEnrollMode } from "@/components/hero/SelfEnrollMode";
import { ExpertMode } from "@/components/hero/ExpertMode";
import { LeoMode } from "@/components/hero/LeoMode";

type ModeId = "enroll" | "expert" | "leo";

const MODES: Array<{ id: ModeId; label: string; sub: string; icon: LucideIcon }> = [
  { id: "enroll", label: "Self enroll", sub: "No agent required", icon: MousePointerClick },
  { id: "expert", label: "Talk to an expert", sub: "Licensed, no pressure", icon: CalendarClock },
  { id: "leo", label: "Ask Trudy", sub: "Instant answers", icon: Sparkle },
];

const isModeId = (value: string): value is ModeId =>
  MODES.some((mode) => mode.id === value);

/**
 * Legacy deep links may still arrive as `#hero=leo`. Read the mode once, then
 * strip the hash so the browser never treats it as a scroll anchor.
 */
const readHashMode = (): ModeId => {
  if (typeof window === "undefined") return "enroll";
  const match = window.location.hash.match(/hero=([a-z]+)/);
  return match && isModeId(match[1]) ? match[1] : "enroll";
};

const stripHeroHash = () => {
  if (typeof window === "undefined") return;
  if (!/hero=/.test(window.location.hash)) return;
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
};



type HeroEntryPanelProps = {
  /** Renders the drag handle row. The parent owns the actual drag behavior. */
  draggable?: boolean;
  className?: string;
};

/**
 * The hero's single entry point. One card, five ways in: eligibility check,
 * self-service enrollment, Medicare comparison, a specialist booking, and the
 * AI walkthrough. Height stays stable so the hero never jumps between modes.
 */
export const HeroEntryPanel = ({ draggable = false, className }: HeroEntryPanelProps) => {
  const [mode, setMode] = useState<ModeId>(readHashMode);
  const [collapsed, setCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  

  // No autofocus: focusing a field pops the mobile keyboard and shifts the hero.


  // Consume any legacy `#hero=` deep link once, then clear it from the URL.
  useEffect(() => {
    stripHeroHash();
    const sync = () => {
      const next = readHashMode();
      setMode(next);
      stripHeroHash();
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Mode is local state only: no hash writes, so no anchor jumps or reflow.
  const selectMode = (next: ModeId) => {
    setMode(next);
    setCollapsed(false);
  };


  return (
    <motion.div
      layout
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card/95 px-3 py-2.5 text-left shadow-[0_24px_70px_-25px_rgba(0,0,0,0.7)] backdrop-blur-sm",
        className,
      )}
    >
      {/* Handle + collapse */}
      <div className="mb-2 flex items-center gap-2">
        {draggable && (
          <span
            data-drag-handle
            className="hidden cursor-grab items-center text-muted-foreground/70 transition-colors hover:text-foreground active:cursor-grabbing sm:flex"
            aria-hidden="true"
          >
            <GripVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
        )}
        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {MODES.find((item) => item.id === mode)?.label}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand panel" : "Collapse panel"}
          aria-expanded={!collapsed}
          className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", collapsed && "-rotate-90")}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Mode rail */}
      <div
        ref={railRef}
        role="tablist"
        aria-label="How would you like to start?"
        onWheel={(event) => {
          const rail = railRef.current;
          if (!rail || rail.scrollWidth <= rail.clientWidth) return;
          const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
          if (delta === 0) return;
          event.preventDefault();
          rail.scrollLeft += delta;
        }}
        className="-mx-1 flex items-center justify-between gap-0.5 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MODES.map((item) => {
          const active = item.id === mode;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectMode(item.id)}
              onPointerEnter={(event) => {
                // Hover rotates the panel on precise pointers; touch still needs a tap.
                if (event.pointerType === "mouse") selectMode(item.id);
              }}
              onFocus={() => selectMode(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-lg border px-1.5 py-1.5 text-left transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="whitespace-nowrap text-[10.5px] font-medium leading-none">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[9px] leading-none",
                    active ? "text-primary/70" : "text-muted-foreground/70",
                  )}
                >
                  {item.sub}
                </span>
              </span>
            </button>

          );
        })}
      </div>

      {!collapsed && (
        <motion.div
          ref={panelRef}
          layout
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: "transform" }}
          className="relative min-h-[13.5rem] overflow-hidden border-t border-border/60 pt-2.5"
        >
          {/* popLayout pulls the outgoing panel out of flow, so the incoming one
              never waits for an unmount and the card height never snaps. */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={mode}
              layout="position"
              initial={{ opacity: 0, y: 8, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.985 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {mode === "enroll" && <SelfEnrollMode />}

              
              {mode === "expert" && <ExpertMode />}
              {mode === "leo" && <LeoMode />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}



    </motion.div>
  );
};
