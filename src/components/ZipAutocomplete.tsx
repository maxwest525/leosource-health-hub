import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  baseZip,
  formatZip,
  isCompleteZip,
  lookupZipPlace,
  readRecentZips,
  saveRecentZip,
  type ZipPlace,
} from "@/lib/zip-lookup";

type ZipAutocompleteProps = {
  value: string;
  onChange: (zip: string) => void;
  onResolved?: (place: ZipPlace) => void;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  /** Right-aligned adornment, e.g. a "use my location" button. */
  adornment?: ReactNode;
};

export function ZipAutocomplete({
  value,
  onChange,
  onResolved,
  invalid,
  placeholder = "30301",
  className,
  adornment,
}: ZipAutocompleteProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recents, setRecents] = useState<ZipPlace[]>([]);
  const [match, setMatch] = useState<ZipPlace | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecents(readRecentZips());
  }, []);

  // Resolve the city/state as soon as the ZIP is complete.
  useEffect(() => {
    if (!isCompleteZip(value)) {
      setMatch(null);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lookupZipPlace(value, controller.signal).then(place => {
        if (cancelled) return;
        setMatch(place);
      });
    }, 200);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    const onDocPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  const suggestions = useMemo(() => {
    const digits = baseZip(value);
    const list: ZipPlace[] = [];
    if (match) list.push(match);
    for (const r of recents) {
      if (list.some(p => p.zip === r.zip)) continue;
      if (digits && !r.zip.startsWith(digits)) continue;
      list.push(r);
    }
    return list.slice(0, 6);
  }, [match, recents, value]);

  const commit = (place: ZipPlace) => {
    onChange(place.zip);
    setRecents(saveRecentZip(place));
    setMatch(place);
    setOpen(false);
    setActive(-1);
    onResolved?.(place);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      commit(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={10}
        placeholder={placeholder}
        aria-label="ZIP code"
        aria-invalid={invalid}
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={e => {
          onChange(formatZip(e.target.value));
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn("pr-[5.5rem]", className)}
      />
      {adornment}

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="ZIP code suggestions"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.zip}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(s)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  i === active ? "bg-primary/10 text-foreground" : "text-foreground/80",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="font-semibold">{s.zip}</span>
                <span className="min-w-0 truncate text-muted-foreground/80">
                  {s.city}
                  {s.state ? `, ${s.state}` : ""}
                </span>
                {s.zip === baseZip(value) && (
                  <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
