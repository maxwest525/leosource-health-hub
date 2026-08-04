import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

export type ChoiceTile = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  options: ChoiceTile[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3 | 4;
  ariaLabel: string;
};

/** Large, springy selection tiles used across the guided wizard. */
export const ChoiceTiles = ({ options, value, onChange, columns = 2, ariaLabel }: Props) => (
  <div
    role="radiogroup"
    aria-label={ariaLabel}
    className={cn(
      "grid gap-2.5",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-2 sm:grid-cols-3",
      columns === 4 && "grid-cols-2 sm:grid-cols-4",
    )}
  >
    {options.map(option => {
      const active = option.value === value;
      return (
        <motion.button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(option.value)}
          whileTap={{ scale: 0.97 }}
          transition={spring}
          className={cn(
            "relative flex min-h-[3.5rem] flex-col items-start justify-center rounded-xl border px-4 py-3 pr-10 text-left transition-colors",
            active
              ? "border-primary bg-primary/[0.07] text-foreground"
              : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          <span className="text-[14px] font-semibold leading-tight">{option.label}</span>
          {option.hint && (
            <span className="mt-0.5 text-[11.5px] leading-tight text-muted-foreground/70">
              {option.hint}
            </span>
          )}
          {active && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={spring}
              className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </motion.span>
          )}
        </motion.button>
      );
    })}
  </div>
);
