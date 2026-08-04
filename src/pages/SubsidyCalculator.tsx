import { useState, useEffect, useRef } from "react";
import { useEnrollmentSession } from "@/hooks/use-enrollment-session";
import { ageToDob, dobToAge } from "@/lib/adapters/applicant-adapter";

import { Link } from "react-router-dom";
import {
  Loader2, MapPin, Minus, Plus, DollarSign, AlertCircle, CheckCircle2,
  ShieldCheck, ArrowRight, Cigarette, HeartHandshake,
} from "lucide-react";
import ToolPageShell from "@/components/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  resolvePlace,
  estimateEligibility,
  formatCurrency,
  type CmsEligibilityEstimate,
  type CmsPerson,
  type Place,
} from "@/lib/cms";

type Member = { age: number; tobacco: boolean };

type Estimate = CmsEligibilityEstimate["estimates"][number];

const SubsidyCalculator = () => {
  const [zip, setZip] = useState("");
  const [incomeText, setIncomeText] = useState("50000");
  const income = Number(incomeText) || 0;
  const [married, setMarried] = useState(false);
  const [members, setMembers] = useState<Member[]>([{ age: 35, tobacco: false }]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  /* Shared enrollment session: reuse what the consumer already answered. */
  const { session: enrollment, ready: sessionReady, canEdit: sessionEditable, patch: patchSession } =
    useEnrollmentSession();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!sessionReady || !enrollment || hydratedRef.current) return;
    hydratedRef.current = true;
    if (enrollment.zipCode) setZip(enrollment.zipCode);
    if (typeof enrollment.annualIncome === "number") setIncomeText(String(enrollment.annualIncome));
    if (enrollment.members.length > 0) {
      setMembers(enrollment.members.map(m => ({ age: dobToAge(m.dob), tobacco: Boolean(m.tobacco) })));
      setMarried(enrollment.members.some(m => m.relationship === "spouse"));
    }
  }, [sessionReady, enrollment]);

  const updateMember = (index: number, patch: Partial<Member>) =>
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{5}$/.test(zip)) {
      setError("Enter a 5 digit ZIP code.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setEstimate(null);
    try {
      const resolved = await resolvePlace(zip);
      if (!resolved) throw new Error("We could not match that ZIP code to a county. Please double check it.");
      setPlace(resolved);
      const people: CmsPerson[] = members.map((m) => ({
        age: m.age,
        uses_tobacco: m.tobacco,
        aptc_eligible: true,
      }));
      const result = await estimateEligibility({
        place: resolved,
        income,
        people,
        hasMarriedCouple: married,
      });
      const first = result.estimates?.[0] ?? null;
      if (!first) throw new Error("The Marketplace did not return an estimate for that household.");
      setEstimate(first);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not calculate your estimate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ToolPageShell
      eyebrow="Savings estimator"
      title="See your premium tax credit before you shop"
      description="We run your household against live Centers for Medicare and Medicaid Services eligibility data to estimate your monthly subsidy, cost sharing reductions, and whether your state offers you a lower cost path."
    >
      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {/* Form */}
        <form onSubmit={handleSubmit} className="h-full rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6 space-y-5 flex flex-col">
          <label className="block">
            <span className="block text-[11px] font-semibold text-foreground mb-1.5">ZIP code</span>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
              <Input
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="33101"
                className="pl-9"
              />
            </div>
          </label>

          <label className="block">
            <span className="block text-[11px] font-semibold text-foreground mb-1.5">
              Expected household income for 2026
            </span>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
              <Input
                inputMode="numeric"
                value={incomeText}
                onChange={(e) => setIncomeText(e.target.value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, ""))}
                onBlur={() => setIncomeText((v) => (v === "" ? "0" : v))}
                aria-label="Expected household income for 2026"
                className="pl-9"
              />
            </div>
            <span className="block text-[11px] text-muted-foreground/70 mt-1.5">
              Use the total you expect to report on your tax return, before deductions.
            </span>
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-foreground">Who needs coverage</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Remove a person"
                  onClick={() => setMembers((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
                  className="p-1.5 rounded border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  aria-label="Add a person"
                  onClick={() => setMembers((prev) => (prev.length < 8 ? [...prev, { age: 30, tobacco: false }] : prev))}
                  className="p-1.5 rounded border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {members.map((member, index) => (
                <div key={index} className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={member.age}
                    aria-label={`Age of person ${index + 1}`}
                    onChange={(e) => updateMember(index, { age: Math.min(120, Math.max(0, Number(e.target.value) || 0)) })}
                    className="h-10 w-full text-center"
                  />
                  <button
                    type="button"
                    onClick={() => updateMember(index, { tobacco: !member.tobacco })}
                    aria-pressed={member.tobacco}
                    className={cn(
                      "w-full h-10 rounded-md border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors",
                      member.tobacco
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-border/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Cigarette className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {member.tobacco ? "Uses tobacco" : "No tobacco"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMarried((v) => !v)}
            aria-pressed={married}
            className={cn(
              "w-full h-10 rounded-md border text-[12px] font-medium flex items-center justify-center gap-2 transition-colors",
              married ? "border-primary/40 bg-primary/[0.06] text-foreground" : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <HeartHandshake className="w-4 h-4" strokeWidth={1.5} />
            {married ? "Filing as a married couple" : "Not a married couple"}
          </button>

          <div className="mt-auto space-y-3 pt-1">
            <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking eligibility
                </>
              ) : (
                "Estimate my savings"
              )}
            </Button>

            <p className="text-[10.5px] text-muted-foreground/60 leading-relaxed">
              Estimates come straight from the Marketplace eligibility service and are not a final determination.
              Your actual credit is confirmed when you enroll.
            </p>
          </div>
        </form>

        {/* Results */}
        <div className="h-full flex flex-col gap-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <p className="text-[13px] text-rose-800">{error}</p>
            </div>
          )}

          {!estimate && !error && !isLoading && (
            <div className="flex-1 min-h-[20rem] rounded-2xl border border-dashed border-border/60 bg-card/30 px-6 py-10 text-center flex flex-col items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary/40 mb-3" strokeWidth={1.25} />
              <h2 className="text-sm font-semibold text-foreground mb-1.5">Your estimate appears here</h2>
              <p className="text-[13px] text-muted-foreground/75 max-w-sm leading-relaxed">
                Most households qualify for something. Nine in ten Marketplace shoppers receive a premium tax credit.
              </p>
            </div>
          )}

          {estimate && (
            <>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-6 py-6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-700/80 font-semibold mb-1.5">
                  Estimated monthly premium tax credit
                </p>
                <p className="text-4xl font-bold text-emerald-900 tabular-nums">
                  {formatCurrency(estimate.aptc ?? 0, true)}
                </p>
                <p className="text-[12.5px] text-emerald-800/80 mt-2 leading-relaxed">
                  That is roughly {formatCurrency((estimate.aptc ?? 0) * 12)} a year applied directly to your premium.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {estimate.csr && !/^(none|not eligible)$/i.test(estimate.csr) && (
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-3.5">
                    <p className="text-[12px] font-semibold text-foreground mb-1">Extra cost sharing savings</p>
                    <p className="text-[12px] text-muted-foreground/75 leading-relaxed">
                      You may qualify for {estimate.csr}, which lowers deductibles and copays on Silver plans.
                    </p>
                  </div>
                )}
                {estimate.is_medicaid_chip && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <p className="text-[12px] font-semibold text-amber-900 mb-1">Medicaid or CHIP may fit better</p>
                    <p className="text-[12px] text-amber-800/80 leading-relaxed">
                      Your income suggests free or low cost state coverage. Speak with a specialist before enrolling.
                    </p>
                  </div>
                )}
                {estimate.in_coverage_gap && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <p className="text-[12px] font-semibold text-amber-900 mb-1">Possible coverage gap</p>
                    <p className="text-[12px] text-amber-800/80 leading-relaxed">
                      Your state has not expanded Medicaid, so a subsidy may not be available. A specialist can help.
                    </p>
                  </div>
                )}
                {estimate.hardship_exemption && (
                  <div className="rounded-xl border border-primary/15 bg-primary/[0.03] px-4 py-3.5">
                    <p className="text-[12px] font-semibold text-foreground mb-1">Catastrophic plans unlocked</p>
                    <p className="text-[12px] text-muted-foreground/75 leading-relaxed">
                      You may qualify for a hardship exemption and lower premium catastrophic coverage.
                    </p>
                  </div>
                )}
                <div className="rounded-xl border border-border/60 bg-card/50 px-4 py-3.5">
                  <p className="text-[12px] font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary/70" strokeWidth={1.75} /> Rating area confirmed
                  </p>
                  <p className="text-[12px] text-muted-foreground/75 leading-relaxed">
                    Pricing is set for ZIP {place?.zipcode} in county {place?.countyfips}, {place?.state}.
                  </p>
                </div>
              </div>

              <Button asChild className="font-semibold">
                <Link to="/wizard">
                  Apply this to real plans <ArrowRight className="ml-1.5 w-4 h-4" strokeWidth={2} />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
};

export default SubsidyCalculator;
