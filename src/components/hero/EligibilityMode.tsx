import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Minus, Plus, ArrowRight, DollarSign, Cigarette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveWizardPrefill, type WizardCategory } from "@/lib/wizard-prefill";
import {
  ModeChips,
  ModeDescription,
  ModeError,
  ModeRow,
  ModeTrust,
  type ModeChipOption,
} from "@/components/hero/ModeParts";

const CATEGORIES: ReadonlyArray<ModeChipOption<WizardCategory>> = [
  { value: "Individual & Family", label: "Family" },
  { value: "Medicare", label: "Medicare" },
  { value: "Dental & Vision", label: "Dental" },
];

/** ZIP, household and age — the minimum the Marketplace API needs to price. */
export const EligibilityMode = () => {
  const navigate = useNavigate();
  const [zip, setZip] = useState("");
  const [category, setCategory] = useState<WizardCategory>("Individual & Family");
  const [household, setHousehold] = useState(1);
  const [age, setAge] = useState(35);
  const [income, setIncome] = useState("");
  const [tobacco, setTobacco] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5 digit ZIP code so we can pull plans for your county.");
      return;
    }
    setError(null);
    const ages = Array.from({ length: household }, (_, index) => (index === 0 ? age : 30));
    saveWizardPrefill({
      zip,
      category,
      ages,
      income: Number(income.replace(/\D/g, "")) || 50000,
      tobacco: ages.map(() => tobacco),
    });
    navigate("/wizard");
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModeDescription>
        See what you qualify for before you share a single contact detail.
      </ModeDescription>

      <ModeChips<WizardCategory>
        label="Coverage type"
        options={CATEGORIES}
        value={category}
        onChange={setCategory}
      />

      <ModeRow>
        <div className="relative min-w-0 flex-1">
          <MapPin
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="ZIP"
            aria-label="ZIP code"
            data-hero-focus
            className="h-9 pl-8 text-sm"
          />
        </div>

        <div className="flex h-9 shrink-0 items-center rounded-md border border-input bg-background px-1">
          <button
            type="button"
            aria-label="Remove a household member"
            onClick={() => setHousehold((n) => Math.max(1, n - 1))}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <Minus className="h-3 w-3" strokeWidth={2} />
          </button>
          <span className="flex items-center gap-1 px-1 text-xs font-semibold tabular-nums text-foreground">
            <Users className="h-3 w-3 text-muted-foreground" strokeWidth={1.5} />
            {household}
          </span>
          <button
            type="button"
            aria-label="Add a household member"
            onClick={() => setHousehold((n) => Math.min(8, n + 1))}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <Plus className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        <Input
          type="number"
          min={0}
          max={120}
          value={age}
          onChange={(event) => setAge(Math.min(120, Math.max(0, Number(event.target.value) || 0)))}
          aria-label="Your age"
          placeholder="Age"
          className="h-9 w-14 shrink-0 px-2 text-sm"
        />
      </ModeRow>

      <ModeRow className="mt-2">
        <div className="relative min-w-0 flex-1">
          <DollarSign
            className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            inputMode="numeric"
            value={income}
            onChange={(event) => setIncome(event.target.value.replace(/\D/g, "").slice(0, 7))}
            placeholder="Household income (optional)"
            aria-label="Household income before taxes"
            className="h-9 pl-7 text-sm"
          />
        </div>

        <button
          type="button"
          aria-pressed={tobacco}
          onClick={() => setTobacco((value) => !value)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
            tobacco
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:text-foreground",
          )}
        >
          <Cigarette className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          Tobacco
        </button>

        <Button
          type="submit"
          className="group h-9 shrink-0 bg-accent px-3 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
        >
          Go
          <ArrowRight
            className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Button>
      </ModeRow>

      <ModeError>{error}</ModeError>

      <ModeTrust>Live 2026 CMS pricing. No account required.</ModeTrust>
    </form>
  );
};
