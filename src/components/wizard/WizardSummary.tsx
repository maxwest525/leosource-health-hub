import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ClipboardList, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";

export type SummaryRow = {
  key: string;
  label: string;
  hint: string;
  value: string;
  icon: LucideIcon;
};

type Props = {
  rows: SummaryRow[];
  onJump?: (key: string) => void;
  /** Headline shown once results exist, e.g. "24 plans · from $118/mo". */
  headline?: string | null;
  /** Renders as an always-open inline block instead of the sticky rail. */
  inline?: boolean;
  className?: string;
};

const RowList = ({ rows, onJump }: Pick<Props, "rows" | "onJump">) => (
  <ul className="divide-y divide-border/40">
    {rows.map(row => {
      const answered = Boolean(row.value);
      const Icon = row.icon;
      const content = (
        <>
          <Icon
            className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              answered ? "text-primary" : "text-muted-foreground/35",
            )}
            strokeWidth={1.75}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
              {row.label}
            </span>
            <span
              className={cn(
                "mt-0.5 block text-[12.5px] leading-snug",
                answered ? "font-medium text-foreground" : "text-muted-foreground/40",
              )}
            >
              {answered ? row.value : row.hint}
            </span>
          </span>
        </>
      );

      return (
        <li key={row.key}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={answered ? "filled" : "empty"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: dur.sm, ease: ease.out }}
            >
              {answered && onJump ? (
                <button
                  type="button"
                  onClick={() => onJump(row.key)}
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-primary/[0.04]"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5">{content}</div>
              )}
            </motion.div>
          </AnimatePresence>
        </li>
      );
    })}
  </ul>
);

/** Live recap of every answer captured so far. Sticky rail on desktop, collapsible on mobile. */
export const WizardSummary = ({ rows, onJump, headline, inline = false, className }: Props) => {
  const [open, setOpen] = useState(false);
  const filled = rows.filter(r => r.value).length;

  const renderShell = (full: boolean) => (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card/70 backdrop-blur-xl",
        full && "h-full",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />
      <header className="flex shrink-0 items-center justify-between gap-3 px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Your details
          </h3>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground/60">
          {filled}/{rows.length}
        </span>
      </header>
      {headline && (
        <p className="shrink-0 px-3.5 pb-2.5 text-[13px] font-semibold text-foreground">{headline}</p>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RowList rows={rows} onJump={onJump} />
      </div>
    </div>
  );

  const shell = renderShell(false);


  if (inline) return <div className={className}>{shell}</div>;

  return (
    <div className={className}>
      {/* Mobile: collapsible bar */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-primary/20 bg-card/70 px-3.5 py-2.5 text-left backdrop-blur-xl"
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold text-foreground">Your details</span>
            <span className="text-[11px] tabular-nums text-muted-foreground/60">
              {filled}/{rows.length}
            </span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground/60 transition-transform", open && "rotate-180")}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: dur.sm, ease: ease.inOut }}
              className="overflow-hidden"
            >
              <div className="pt-2">{shell}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop: sticky rail, height-matched to the question card */}
      <div className="sticky top-28 hidden h-[26rem] lg:block">{renderShell(true)}</div>
    </div>
  );
};
