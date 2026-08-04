import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ArrowLeft, ArrowRight, Check, Info, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";

export type LedgerStep = { id: string; label: string; value?: string };

type Props = {
  /** Stable id for the question currently on screen — drives the exit/enter swap. */
  questionId: string;
  index: number;
  total: number;
  /** Short section name shown beside the step counter, e.g. "Household". */
  stepLabel?: string;
  /** Ordered list of every question, used for the vertical ledger rail. */
  ledger?: LedgerStep[];
  /** Jump straight to a completed ledger step. */
  onJumpStep?: (id: string) => void;
  direction: 1 | -1;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  error?: string | null;
  canNext: boolean;
  nextLabel?: string;
  busy?: boolean;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  /** Save progress behind the device lock (Face ID / PIN). */
  onSave?: () => void;
  saving?: boolean;
  saved?: boolean;
};

/** Match the sitewide deep-navy band instead of the brighter action blue. */
const inkVars = {
  "--primary": "var(--ink)",
  "--primary-foreground": "var(--ink-foreground)",
} as React.CSSProperties;

type StepStatus = "answered" | "required" | "optional";

/** Live completion state for the step the user is on. */
const StatusPill = ({ status }: { status: StepStatus }) => (
  <motion.span
    key={status}
    initial={{ opacity: 0, scale: 0.94 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: dur.sm, ease: ease.out }}
    aria-live="polite"
    className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-[0.14em]",
      status === "answered"
        ? "bg-primary-foreground/90 text-primary"
        : status === "optional"
          ? "bg-primary-foreground/10 text-primary-foreground/70"
          : "bg-primary-foreground/15 text-primary-foreground/85",
    )}
  >
    {status === "answered" && <Check className="h-2 w-2" strokeWidth={4} />}
    {status === "answered" ? "Answered" : status === "optional" ? "Optional" : "Required"}
  </motion.span>
);

const variants = {

  enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0, transition: { duration: dur.md, ease: ease.out } },
  exit: (dir: 1 | -1) => ({
    opacity: 0,
    x: dir * -24,
    transition: { duration: dur.sm, ease: ease.inOut },
  }),
};

/** Dense two-pane wizard console: a step ledger rail beside one live question. */
export const QuestionCard = ({
  questionId,
  index,
  total,
  stepLabel,
  ledger,
  onJumpStep,
  direction,
  title,
  subtitle,
  children,
  error,
  canNext,
  nextLabel = "Continue",
  busy = false,
  onBack,
  onNext,
  onSkip,
  onSave,
  saving = false,
  saved = false,
}: Props) => {
  const pct = total > 0 ? ((index + 1) / total) * 100 : 0;
  const status: StepStatus = canNext ? "answered" : onSkip ? "optional" : "required";
  const rootRef = useRef<HTMLDivElement>(null);

  // keep ancestors pinned: focus/scroll side effects can drift the shell sideways on mobile
  useEffect(() => {
    let node = rootRef.current?.parentElement ?? null;
    while (node) {
      if (node.scrollLeft !== 0) node.scrollLeft = 0;
      node = node.parentElement;
    }
  }, [questionId]);

  return (
    <div
      ref={rootRef}
      className="relative flex h-full max-h-[calc(100dvh-5.5rem)] min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_24px_60px_-40px_hsl(var(--primary)/0.5)] sm:h-[27rem] sm:max-h-none"
    >

      {/* ledger rail — desktop only, docked right */}
      {ledger && ledger.length > 0 && (
        <aside
          style={inkVars}
          className="relative order-2 hidden w-[13.5rem] shrink-0 flex-col justify-center gap-0.5 overflow-y-auto border-l border-border/50 bg-primary px-4 py-6 lg:flex"
        >
          <p className="relative mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/55">
            Your intake
          </p>

          {ledger.map((s, i) => {
            const done = i < index;
            const active = i === index;
            const answered = Boolean(s.value);
            const jumpable = done && answered && !!onJumpStep;
            const Row = jumpable ? "button" : "div";
            return (
              <Row
                key={s.id}
                {...(jumpable
                  ? { type: "button" as const, onClick: () => onJumpStep?.(s.id) }
                  : {})}
                className={cn(
                  "relative flex w-full items-start gap-2.5 rounded-md px-1 py-[5px] text-left transition-colors",
                  jumpable && "hover:bg-primary-foreground/10",
                )}
              >
                <span
                  className={cn(
                    "mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-colors",
                    done
                      ? "border-primary-foreground/70 bg-primary-foreground/90 text-primary"
                      : active
                        ? "border-primary-foreground bg-transparent text-primary-foreground"
                        : "border-primary-foreground/25 text-primary-foreground/40",
                  )}
                >
                  {done ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[12px] leading-tight transition-colors",
                      active
                        ? "font-semibold text-primary-foreground"
                        : done
                          ? "text-primary-foreground/70"
                          : "text-primary-foreground/40",
                    )}
                  >
                    {s.label}
                  </span>
                  {active ? (
                    <span className="mt-[3px] flex items-center gap-1.5">
                      <StatusPill status={status} />
                      {answered && (
                        <span className="min-w-0 truncate text-[10.5px] leading-tight text-primary-foreground/55">
                          {s.value}
                        </span>
                      )}
                    </span>
                  ) : (
                    answered && (
                      <motion.span
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: dur.sm, ease: ease.out }}
                        className="mt-[1px] block truncate text-[10.5px] leading-tight text-primary-foreground/55"
                      >
                        {s.value}
                      </motion.span>
                    )
                  )}
                </span>
                {active && (
                  <motion.span
                    layoutId="wizard-ledger-marker"
                    className="absolute -right-4 top-1 h-4 w-[3px] rounded-l-full bg-primary-foreground"
                    transition={{ duration: dur.md, ease: ease.out }}
                  />
                )}

              </Row>
            );
          })}
        </aside>
      )}

      {/* question pane */}
      <div className="relative order-1 flex min-h-0 min-w-0 flex-1 flex-col">
        {/* official secure-intake header — mobile / tablet */}
        <div
          style={inkVars}
          className="sticky top-0 z-30 flex shrink-0 flex-col gap-2 overflow-hidden border-b border-primary-foreground/10 bg-primary px-5 pb-2.5 pt-3.5 lg:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex min-w-0 items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary-foreground/85" strokeWidth={2} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13.5px] font-semibold leading-tight text-primary-foreground">
                  Secure ACA
                </span>
                <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.18em] text-primary-foreground/55">
                  Self enrollment
                </span>
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="How your data is protected"
                    className="flex items-center gap-1.5 rounded-full px-1 py-1 text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-primary-foreground/80 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/40"
                  >
                    <Lock className="h-3 w-3" strokeWidth={2.5} />
                    <Info className="h-3 w-3 opacity-70" strokeWidth={2.5} />

                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 text-[12.5px] leading-relaxed">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    How your data is protected
                  </p>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li>Every answer is sent over TLS 1.2+ encryption.</li>
                    <li>Details are stored encrypted and used only to price your plans.</li>
                    <li>Access is limited to your licensed TruEnroll agent.</li>
                    <li>We never sell your information to third parties.</li>
                  </ul>
                </PopoverContent>
              </Popover>
              <span className="pr-0.5 text-[9.5px] font-medium uppercase leading-none tracking-[0.18em] text-primary-foreground/50">
                TruEnroll #L118979
              </span>
            </div>
          </div>
        </div>

        <div className="sticky top-[4rem] z-30 h-1 w-full shrink-0 bg-border/40 lg:hidden">


          <motion.div
            className="h-full rounded-r-full bg-primary"
            animate={{ width: `${pct}%` }}
            transition={{ duration: dur.md, ease: ease.out }}
          />
        </div>



        <div className="flex min-h-0 flex-1 flex-col px-4 py-3.5 sm:px-7 sm:py-5">
          <div
            className={cn(
              "mb-2 shrink-0 items-center justify-between gap-3",
              ledger && ledger.length > 0 && !onSkip ? "hidden lg:flex" : "flex",
            )}
          >
            <span
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={index + 1}
              aria-label={`Step ${index + 1} of ${total}${stepLabel ? `: ${stepLabel}` : ""}`}
              className={cn(
                "min-w-0 items-baseline gap-2",
                ledger && ledger.length > 0 ? "hidden lg:flex" : "flex",
              )}
            >
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Step {index + 1} of {total}
              </span>
              <span className="truncate text-[11.5px] font-medium text-muted-foreground/70 lg:hidden">
                {stepLabel}
              </span>
            </span>

            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="shrink-0 text-[12px] font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
              >
                Skip
              </button>
            )}
          </div>

          {/* centered body — keeps the card static while content varies */}
          <div className="-mx-1 flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={questionId}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full"
              >
                <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground/80">
                    {subtitle}
                  </p>
                )}

                <div className="mt-4">{children}</div>
              </motion.div>
            </AnimatePresence>
          </div>

          {error && (
            <p role="alert" className="mt-2 shrink-0 text-[12px] font-medium text-destructive">
              {error}
            </p>
          )}

          <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-border/40 pt-3">
            <div className="flex min-w-0 items-center gap-1">
              {onBack && (
                <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
              )}
              {onSave && (
                <Button
                  variant="ghost"
                  onClick={onSave}
                  disabled={saving}
                  className="text-muted-foreground"
                >
                  {saving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <Check className="mr-1.5 h-4 w-4 text-primary" strokeWidth={2.5} />
                  ) : (
                    <Lock className="mr-1.5 h-4 w-4" />
                  )}
                  {saved ? "Saved" : "Save"}
                </Button>
              )}
            </div>

            <Button
              onClick={onNext}
              disabled={busy}
              style={inkVars}
              className={cn("min-w-[9rem] font-semibold transition-all", !canNext && "opacity-60")}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Finding plans
                </>
              ) : (
                <>
                  {nextLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* intake ledger — docked to the bottom on mobile, no pills */}
        {ledger && ledger.length > 0 && (
          <div
            style={inkVars}
            className="relative shrink-0 overflow-hidden border-t border-primary-foreground/10 bg-primary lg:hidden"
          >

            <div className="relative flex items-center justify-between px-5 pb-1.5 pt-2.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/55">
                Intake summary
              </p>
              <span className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/70">
                  Step {index + 1} of {total}
                </span>
              </span>
            </div>
            <div className="relative flex items-stretch gap-1 overflow-x-auto px-5 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

              {ledger.map((s, i) => {
                const done = i < index;
                const active = i === index;
                const answered = Boolean(s.value);
                const jumpable = done && answered && !!onJumpStep;
                const Item = jumpable ? "button" : "div";
                return (
                  <Item
                    key={s.id}
                    ref={
                      active
                        ? (el: HTMLElement | null) => {
                            const track = el?.parentElement;
                            if (!el || !track) return;
                            track.scrollTo({
                              left: el.offsetLeft - (track.clientWidth - el.clientWidth) / 2,
                              behavior: "smooth",
                            });
                          }
                        : undefined
                    }
                    {...(jumpable
                      ? { type: "button" as const, onClick: () => onJumpStep?.(s.id) }
                      : {})}
                    className={cn(
                      "flex shrink-0 items-center gap-2 border-l border-primary-foreground/15 px-3.5 text-left first:border-l-0 first:pl-0",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8.5px] font-bold",
                        done
                          ? "border-primary-foreground/70 bg-primary-foreground/90 text-primary"
                          : active
                            ? "border-primary-foreground text-primary-foreground"
                            : "border-primary-foreground/25 text-primary-foreground/40",
                      )}
                    >
                      {done ? <Check className="h-2 w-2" strokeWidth={4} /> : i + 1}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span
                        className={cn(
                          "whitespace-nowrap text-[12px] leading-tight",
                          active
                            ? "font-semibold text-primary-foreground"
                            : done
                              ? "text-primary-foreground/75"
                              : "text-primary-foreground/40",
                        )}
                      >
                        {s.label}
                      </span>
                      {answered && (
                        <span className="max-w-[10rem] truncate text-[10.5px] leading-tight text-primary-foreground/55">
                          {s.value}
                        </span>
                      )}
                    </span>

                  </Item>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
