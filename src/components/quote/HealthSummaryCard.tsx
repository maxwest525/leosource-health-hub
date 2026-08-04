import type { LucideIcon } from "lucide-react";
import {
  Cigarette,
  DollarSign,
  MapPin,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
  CalendarDays,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AnsweredStep = { question: string; answer: string };

type FieldKey =
  | "zip"
  | "household"
  | "ages"
  | "income"
  | "coverage"
  | "prescriptions"
  | "doctors"
  | "tobacco";

const FIELDS: ReadonlyArray<{
  key: FieldKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  match: readonly string[];
}> = [
  { key: "zip", label: "ZIP code", hint: "Rating area", icon: MapPin, match: ["zip", "postal", "county"] },
  {
    key: "household",
    label: "Household",
    hint: "Applicants",
    icon: Users,
    match: ["household", "how many people", "family size"],
  },
  { key: "ages", label: "Ages", hint: "Age band", icon: CalendarDays, match: ["age", "birth", "how old"] },
  {
    key: "income",
    label: "Income",
    hint: "Subsidy basis",
    icon: DollarSign,
    match: ["income", "earn", "make a year", "salary"],
  },
  {
    key: "coverage",
    label: "Coverage now",
    hint: "Eligibility",
    icon: ShieldCheck,
    match: ["medicare", "medicaid", "coverage", "employer", "qualifying life"],
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    hint: "Formulary check",
    icon: Pill,
    match: ["prescription", "medication", "drug"],
  },
  {
    key: "doctors",
    label: "Doctors",
    hint: "Network check",
    icon: Stethoscope,
    match: ["doctor", "provider", "physician", "specialist you"],
  },
  { key: "tobacco", label: "Tobacco", hint: "Rate factor", icon: Cigarette, match: ["tobacco", "smoke", "nicotine"] },
];


/** Maps the answered question/answer pairs onto a stable set of intake fields. */
const buildValues = (answered: ReadonlyArray<AnsweredStep>) => {
  const values = new Map<FieldKey, string>();
  answered.forEach((step) => {
    const question = step.question.toLowerCase();
    const field = FIELDS.find((candidate) =>
      candidate.match.some((keyword) => question.includes(keyword)),
    );
    if (field && step.answer.trim()) values.set(field.key, step.answer.trim());
  });
  return values;
};

/**
 * Fixed-height intake recap that fills in progressively as the walkthrough
 * collects each detail, so the layout never shifts mid-conversation.
 */
export const HealthSummaryCard = ({
  answered,
  layout = "inline",
  className,
}: {
  answered: ReadonlyArray<AnsweredStep>;
  layout?: "inline" | "rail";
  className?: string;
}) => {
  const values = buildValues(answered);
  const filled = FIELDS.filter((field) => values.has(field.key)).length;

  return (
    <section
      aria-label="Health summary"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 bg-card/60 px-3.5 py-3 shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.55)] backdrop-blur-xl",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <header className="mb-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Health summary
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {filled}/{FIELDS.length}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          What Trudy has captured so far. Used to match you to real 2026 plans.
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary/70 transition-all duration-500"
            style={{ width: `${(filled / FIELDS.length) * 100}%` }}
          />
        </div>
      </header>

      <dl
        className={cn(
          "grid",
          layout === "rail"
            ? "h-[300px] grid-cols-1 grid-rows-8"
            : "h-[152px] grid-cols-2 grid-rows-4 gap-x-4 md:h-[92px] md:grid-cols-4 md:grid-rows-2",
        )}
      >
        {FIELDS.map((field) => {
          const value = values.get(field.key);
          const Icon = field.icon;
          return (
            <div
              key={field.key}
              className="flex min-w-0 items-center gap-2 border-b border-border/25 py-1 last:border-b-0"
              title={value ? `${field.label}: ${value}` : `${field.label} — ${field.hint}`}
            >
              <Icon
                aria-hidden
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-colors",
                  value ? "text-primary" : "text-muted-foreground/40",
                )}
                strokeWidth={2}
              />
              <div className="min-w-0 flex-1">
                <dt className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {field.label}
                  </span>
                  <span className="hidden truncate text-[9px] uppercase tracking-[0.1em] text-muted-foreground/50 xl:inline">
                    {field.hint}
                  </span>
                </dt>
                <dd
                  className={cn(
                    "mt-0.5 flex items-center gap-1",
                    value ? "text-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {value ? (
                    <>
                      <Check aria-hidden className="h-3 w-3 shrink-0 text-primary" strokeWidth={3} />
                      <span className="truncate rounded-md border border-primary/20 bg-primary/5 px-1.5 py-px font-mono text-[11px] font-medium tabular-nums leading-tight">
                        {value}
                      </span>
                    </>
                  ) : (
                    <span className="truncate font-mono text-[11px] leading-tight tracking-widest">
                      ----
                    </span>
                  )}
                </dd>
              </div>
            </div>
          );
        })}

      </dl>
    </section>
  );
};
