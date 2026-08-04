import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const ITEM_HEIGHT = 40;

const pad = (n: number) => String(n).padStart(2, "0");

const daysInMonth = (year: number, monthIndex: number) =>
  new Date(year, monthIndex + 1, 0).getDate();

type WheelProps = {
  label: string;
  values: string[];
  index: number;
  onIndexChange: (index: number) => void;
};

const Wheel = ({ label, values, index, onIndexChange }: WheelProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const frame = React.useRef<number>();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = index * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 2) el.scrollTop = target;
  }, [index]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) window.clearTimeout(frame.current);
    frame.current = window.setTimeout(() => {
      const next = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)));
      if (next !== index) onIndexChange(next);
    }, 90);
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <div
        ref={ref}
        onScroll={handleScroll}
        role="listbox"
        aria-label={label}
        className="relative h-[200px] snap-y snap-mandatory overflow-y-auto scrollbar-hide"
        style={{ scrollPaddingTop: ITEM_HEIGHT * 2 }}
      >
        <div style={{ height: ITEM_HEIGHT * 2 }} aria-hidden />
        {values.map((v, i) => (
          <button
            key={v}
            type="button"
            role="option"
            aria-selected={i === index}
            onClick={() => onIndexChange(i)}
            className={cn(
              "flex w-full snap-center items-center justify-center text-[15px] tabular-nums transition-colors",
              i === index ? "font-semibold text-primary" : "text-muted-foreground/60",
            )}
            style={{ height: ITEM_HEIGHT }}
          >
            {v}
          </button>
        ))}
        <div style={{ height: ITEM_HEIGHT * 2 }} aria-hidden />
      </div>
    </div>
  );
};

type DobPickerProps = {
  value: string;
  onChange: (value: string) => void;
  maxDate?: string;
  ariaLabel: string;
  invalid?: boolean;
  className?: string;
};

export const DobPicker = ({ value, onChange, maxDate, ariaLabel, invalid, className }: DobPickerProps) => {
  const [open, setOpen] = React.useState(false);

  const maxYear = maxDate ? Number(maxDate.slice(0, 4)) : new Date().getFullYear();
  const years = React.useMemo(
    () => Array.from({ length: 100 }, (_, i) => String(maxYear - i)),
    [maxYear],
  );

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
  const initial = parsed || `${maxYear - 35}-01-01`;

  const [year, setYear] = React.useState(Number(initial.slice(0, 4)));
  const [month, setMonth] = React.useState(Number(initial.slice(5, 7)) - 1);
  const [day, setDay] = React.useState(Number(initial.slice(8, 10)));

  React.useEffect(() => {
    if (!open) return;
    const base = parsed || `${maxYear - 35}-01-01`;
    setYear(Number(base.slice(0, 4)));
    setMonth(Number(base.slice(5, 7)) - 1);
    setDay(Number(base.slice(8, 10)));
  }, [open, parsed, maxYear]);

  const dayCount = daysInMonth(year, month);
  const clampedDay = Math.min(day, dayCount);

  const confirm = () => {
    onChange(`${year}-${pad(month + 1)}-${pad(clampedDay)}`);
    setOpen(false);
  };

  const display = parsed
    ? `${MONTHS[Number(parsed.slice(5, 7)) - 1]} ${Number(parsed.slice(8, 10))}, ${parsed.slice(0, 4)}`
    : "Date of birth";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={cn(
          "h-10 shrink-0 rounded-md border border-input bg-background px-3 text-left text-[12px] transition-colors hover:border-primary/40",
          !parsed && "text-muted-foreground",
          invalid && "border-destructive",
          className,
        )}
      >
        {display}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle className="text-base">Date of birth</DialogTitle>
          </DialogHeader>

          <div className="relative mt-1">
            <div
              className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 rounded-lg border-y border-primary/25 bg-primary/[0.04]"
              style={{ height: ITEM_HEIGHT, marginTop: 10 }}
              aria-hidden
            />
            <div className="flex gap-1">
              <Wheel label="Month" values={MONTHS} index={month} onIndexChange={setMonth} />
              <Wheel
                label="Day"
                values={Array.from({ length: dayCount }, (_, i) => String(i + 1))}
                index={clampedDay - 1}
                onIndexChange={i => setDay(i + 1)}
              />
              <Wheel
                label="Year"
                values={years}
                index={Math.max(0, years.indexOf(String(year)))}
                onIndexChange={i => setYear(Number(years[i]))}
              />
            </div>
          </div>

          <DialogFooter className="mt-2 flex-row gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" onClick={confirm}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
