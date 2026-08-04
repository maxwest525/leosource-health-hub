import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, Minus, Plus, ArrowRight, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveWizardPrefill } from "@/lib/wizard-prefill";
import { ModeDescription, ModeError, ModeRow, ModeTrust } from "@/components/hero/ModeParts";

const TRUST = "Real-time CMS pricing. Enroll online, no agent required.";

/** Self enroll only supports individual & family; Medicare and dental/vision were removed. */
const SELF_ENROLL_CATEGORY = "Individual & Family" as const;
const SELF_ENROLL_ROUTE = "/wizard?mode=self-enroll&category=individual-family";

/** Self-serve path for individual and family coverage, always two rows of inputs. */
export const SelfEnrollMode = () => {
  const navigate = useNavigate();
  const [zip, setZip] = useState("");
  const [household, setHousehold] = useState(1);
  const [income, setIncome] = useState("");
  const [age, setAge] = useState(35);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5 digit ZIP code to see plans you can enroll in.");
      return;
    }
    setError(null);

    const ages = Array.from({ length: household }, (_, index) => (index === 0 ? age : 30));
    saveWizardPrefill({
      zip,
      category: SELF_ENROLL_CATEGORY,
      ages,
      income: Number(income.replace(/\D/g, "")) || 50000,
      tobacco: ages.map(() => false),
    });
    navigate(SELF_ENROLL_ROUTE);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModeDescription>Find your plan and self enroll, start to finish.</ModeDescription>

      {/* No sub-category chips here, so the reserved chip height is spread across
          the rows instead of leaving one dead gap under the description. */}
      <div aria-hidden className="h-[13px]" />

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

      <ModeRow className="mt-4">
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

        <Button
          type="submit"
          className="group h-9 shrink-0 bg-accent px-3 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
        >
          Enroll
          <ArrowRight
            className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            strokeWidth={2}
          />
        </Button>
      </ModeRow>

      <ModeError>{error}</ModeError>

      <ModeTrust className="mt-[18px]">{TRUST}</ModeTrust>
    </form>
  );
};
