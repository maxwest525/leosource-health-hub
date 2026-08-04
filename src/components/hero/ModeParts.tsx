import { ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** One-line credibility note shared by every hero mode. Never wraps. */
export const ModeTrust = ({
  icon: Icon = ShieldCheck,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "mt-2.5 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5",
      className,
    )}
  >
    <Icon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
    <p className="min-w-0 truncate text-[10.5px] leading-none text-muted-foreground">{children}</p>
  </div>
);

/** Tab-specific description line that sits directly under the rail. */
export const ModeDescription = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[11px] leading-snug text-muted-foreground">{children}</p>
);

export type ModeChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

/** Sub-category toggles for a mode. */
export const ModeChips = <T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<ModeChipOption<T>>;
  value: T;
  onChange: (next: T) => void;
  label: string;
}) => (
  <div role="group" aria-label={label} className="mb-2 flex flex-wrap items-center gap-1">
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
            active
              ? "border-primary bg-primary/10 text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {option.icon && <option.icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />}
          {option.label}
        </button>
      );
    })}
  </div>
);

/** Inline validation message. */
export const ModeError = ({ children }: { children: React.ReactNode }) =>
  children ? (
    <p role="alert" className="mt-1.5 text-[10.5px] text-destructive">
      {children}
    </p>
  ) : null;

/** Two-field row wrapper so every mode keeps the same rhythm. */
export const ModeRow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={cn("flex items-center gap-2", className)}>{children}</div>;
