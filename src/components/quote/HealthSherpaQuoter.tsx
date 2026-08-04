import { useMemo, useState } from "react";
import { AlertCircle, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HealthSherpaPlanCard } from "@/components/quote/HealthSherpaPlanCard";
import { HealthSherpaPlanModal } from "@/components/quote/HealthSherpaPlanModal";
import { cn } from "@/lib/utils";
import {
  defaultEffectiveDate,
  upcomingEffectiveDates,
  
  lookupHsCounties,
  planYearFromEffectiveDate,
  quoteHsPlans,
  HealthSherpaError,
  type HsCounty,
  type HsPlan,
  type HsRelationship,
} from "@/lib/healthsherpa";

/** Every field the HealthSherpa quote contract requires for an applicant. */
type QuoteMember = {
  age: number;
  relationship: HsRelationship;
  gender: "male" | "female";
  uses_tobacco: boolean;
  pregnant: boolean;
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 block">
    {children}
  </label>
);

const Skeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-28 rounded-2xl border border-border/30 bg-muted/25 animate-pulse" />
    ))}
  </div>
);

/**
 * Agent-facing ACA quoting flow: ZIP, county resolution, household details,
 * then live HealthSherpa quote results. The API key never leaves the backend.
 */
export const HealthSherpaQuoter = () => {
  const [zip, setZip] = useState("");
  const [counties, setCounties] = useState<HsCounty[]>([]);
  const [countyFips, setCountyFips] = useState("");
  const [countyLoading, setCountyLoading] = useState(false);

  const [householdSize, setHouseholdSize] = useState(1);
  const [income, setIncome] = useState(52000);
  const [members, setMembers] = useState<QuoteMember[]>([
    { age: 40, relationship: "primary", gender: "female", uses_tobacco: false, pregnant: false },
  ]);
  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate());
  const startDateOptions = useMemo(() => upcomingEffectiveDates(4), []);

  const [quoting, setQuoting] = useState(false);
  const [plans, setPlans] = useState<HsPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detailPlan, setDetailPlan] = useState<HsPlan | null>(null);

  const updateMember = (index: number, patch: Partial<QuoteMember>) =>
    setMembers((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const addMember = () =>
    setMembers((current) => {
      const next: QuoteMember[] = [
        ...current,
        {
          age: 40,
          relationship: current.some((m) => m.relationship === "spouse") ? "dependent" : "spouse",
          gender: "male",
          uses_tobacco: false,
          pregnant: false,
        },
      ];
      setHouseholdSize((size) => Math.max(size, next.length));
      return next;
    });

  const removeMember = (index: number) =>
    setMembers((current) => current.filter((_, i) => i !== index));

  const county = useMemo(
    () => counties.find((item) => item.fips_code === countyFips) ?? null,
    [counties, countyFips],
  );

  const handleZipLookup = async () => {
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a valid five-digit ZIP code.");
      return;
    }
    setError(null);
    setCountyLoading(true);
    setCounties([]);
    setCountyFips("");
    setPlans(null);
    try {
      const found = await lookupHsCounties(zip);
      if (found.length === 0) {
        setError("No county matched that ZIP code. Double-check it and try again.");
        return;
      }
      setCounties(found);
      if (found.length === 1) setCountyFips(found[0].fips_code);
    } catch (err) {
      setError(
        err instanceof HealthSherpaError ? err.message : "County lookup failed. Please try again.",
      );
    } finally {
      setCountyLoading(false);
    }
  };

  const handleQuote = async () => {
    if (!county) {
      setError("Select a county before running the quote.");
      return;
    }
    setError(null);
    setQuoting(true);
    setPlans(null);
    try {
      const result = await quoteHsPlans({
        zipCode: zip,
        county,
        householdSize: Math.max(householdSize, members.length),
        annualIncome: income,
        effectiveDate,
        applicants: members.map((member, index) => ({
          member_id: `applicant-${index + 1}`,
          age: member.age,
          relationship: index === 0 ? ("primary" as const) : member.relationship,
          gender: member.gender,
          uses_tobacco: member.uses_tobacco,
          ...(member.gender === "female" ? { pregnant: member.pregnant } : {}),
        })),
      });
      setPlans(result.plans ?? []);
    } catch (err) {
      setError(
        err instanceof HealthSherpaError ? err.message : "The quote request failed. Please try again.",
      );
      setPlans([]);
    } finally {
      setQuoting(false);
    }
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="section-container">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="text-[11px] uppercase tracking-[0.18em]">
              HealthQuote Pro
            </Badge>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              Live ACA quoting for licensed agents
            </h2>
            <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-xl mx-auto">
              Resolve the client's county, enter a few household details, and pull real on-exchange
              pricing with subsidy applied.
            </p>
          </div>

          {/* Step 1: ZIP + county */}
          <div className="bg-white border border-border/40 rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <FieldLabel>Client ZIP code</FieldLabel>
              <div className="flex gap-2">
                <div className="relative flex-1 max-w-[220px]">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
                  <Input
                    inputMode="numeric"
                    value={zip}
                    onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="33145"
                    aria-label="Client ZIP code"
                    className="pl-9 h-11 text-sm"
                  />
                </div>
                <Button variant="outline" onClick={handleZipLookup} disabled={countyLoading} className="h-11">
                  {countyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" strokeWidth={1.75} />
                  )}
                  <span className="ml-1.5 text-sm">Find county</span>
                </Button>
              </div>
            </div>

            {counties.length > 0 && (
              <div>
                <FieldLabel>County</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {counties.map((item) => (
                    <button
                      key={item.fips_code}
                      type="button"
                      onClick={() => setCountyFips(item.fips_code)}
                      className={cn(
                        "px-3.5 py-2 rounded-lg border text-sm transition-colors",
                        countyFips === item.fips_code
                          ? "border-primary/40 bg-primary/[0.06] text-foreground font-medium"
                          : "border-border/50 text-muted-foreground hover:border-primary/20",
                      )}
                    >
                      {item.name}, {item.state}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: household */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel>Tax household size</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={householdSize}
                  onChange={(event) => setHouseholdSize(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
                  className="h-11 text-sm"
                />
              </div>
              <div>
                <FieldLabel>Annual income</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={income}
                  onChange={(event) => setIncome(Math.max(0, Number(event.target.value) || 0))}
                  className="h-11 text-sm"
                />
              </div>
              <div>
                <FieldLabel>Effective date</FieldLabel>
                <select
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {startDateOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  Plan year {planYearFromEffectiveDate(effectiveDate)}
                </p>
              </div>
            </div>

            {/* Step 3: applicants — every field HealthSherpa requires per person */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>Applicants on the policy</FieldLabel>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={addMember}
                  disabled={members.length >= 12}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" strokeWidth={2} />
                  Add member
                </Button>
              </div>

              {members.map((member, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-2 rounded-xl border border-border/40 p-3"
                >
                  <div className="w-[112px] shrink-0">
                    <FieldLabel>Relationship</FieldLabel>
                    <select
                      value={index === 0 ? "primary" : member.relationship}
                      disabled={index === 0}
                      onChange={(event) =>
                        updateMember(index, { relationship: event.target.value as HsRelationship })
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm disabled:opacity-70"
                      aria-label={`Relationship for member ${index + 1}`}
                    >
                      <option value="primary">Primary</option>
                      <option value="spouse">Spouse</option>
                      <option value="dependent">Dependent</option>
                    </select>
                  </div>

                  <div className="w-[84px] shrink-0">
                    <FieldLabel>Age</FieldLabel>
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={member.age}
                      onChange={(event) =>
                        updateMember(index, {
                          age: Math.min(120, Math.max(0, Number(event.target.value) || 0)),
                        })
                      }
                      className="h-10 text-sm"
                      aria-label={`Age for member ${index + 1}`}
                    />
                  </div>

                  <div className="shrink-0">
                    <FieldLabel>Gender</FieldLabel>
                    <div className="inline-flex h-10 rounded-md border border-border/50 p-0.5">
                      {(["female", "male"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={member.gender === value}
                          onClick={() => updateMember(index, { gender: value })}
                          className={cn(
                            "px-3 rounded text-sm capitalize transition-colors",
                            member.gender === value
                              ? "bg-primary/[0.08] text-foreground font-medium"
                              : "text-muted-foreground",
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-pressed={member.uses_tobacco}
                    onClick={() => updateMember(index, { uses_tobacco: !member.uses_tobacco })}
                    className={cn(
                      "h-10 px-3 rounded-lg border text-sm transition-colors",
                      member.uses_tobacco
                        ? "border-primary/40 bg-primary/[0.06] text-foreground font-medium"
                        : "border-border/50 text-muted-foreground hover:border-primary/20",
                    )}
                  >
                    Tobacco
                  </button>

                  {member.gender === "female" && (
                    <button
                      type="button"
                      aria-pressed={member.pregnant}
                      onClick={() => updateMember(index, { pregnant: !member.pregnant })}
                      className={cn(
                        "h-10 px-3 rounded-lg border text-sm transition-colors",
                        member.pregnant
                          ? "border-primary/40 bg-primary/[0.06] text-foreground font-medium"
                          : "border-border/50 text-muted-foreground hover:border-primary/20",
                      )}
                    >
                      Pregnant
                    </button>
                  )}

                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeMember(index)}
                      aria-label={`Remove member ${index + 1}`}
                      className="h-10 w-10 grid place-items-center rounded-lg border border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
                    >
                      <X className="w-4 h-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ))}
            </div>


            {error && (
              <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.75} />
                {error}
              </p>
            )}

            <Button
              variant="outline"
              className="w-full h-11 font-semibold"
              onClick={handleQuote}
              disabled={quoting || !county}
            >
              {quoting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {county ? "Run live quote" : "Resolve a county first"}
            </Button>
          </div>

          {/* Results */}
          {quoting && <Skeleton />}

          {!quoting && plans !== null && plans.length === 0 && !error && (
            <p className="text-sm text-muted-foreground/80 text-center py-6">
              No plans came back for that household. Adjust the county, income, or effective date and try
              again.
            </p>
          )}

          {!quoting && plans && plans.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
                {plans.length} plans priced by HealthSherpa
              </p>
              {plans.map((plan) => (
                <HealthSherpaPlanCard key={plan.plan_id} plan={plan} onViewDetails={setDetailPlan} />
              ))}
            </div>
          )}
        </div>
      </div>

      <HealthSherpaPlanModal
        plan={detailPlan}
        open={detailPlan !== null}
        onOpenChange={(open) => !open && setDetailPlan(null)}
      />
    </section>
  );
};
