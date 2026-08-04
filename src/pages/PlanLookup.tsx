import { useState } from "react";
import { Loader2, AlertCircle, FileText, ExternalLink, Star, MapPin } from "lucide-react";
import ToolPageShell from "@/components/ToolPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPlanDetail,
  getPlanCrosswalk,
  resolvePlace,
  formatCurrency,
  healthcareGovEnrollUrl,
  type CmsPlan,
  type Place,
} from "@/lib/cms";

const DOC_LINKS: Array<{ key: keyof CmsPlan; label: string }> = [
  { key: "benefits_url", label: "Summary of benefits" },
  { key: "brochure_url", label: "Plan brochure" },
  { key: "formulary_url", label: "Drug formulary" },
  { key: "network_url", label: "Provider directory" },
];

const PlanLookup = () => {
  const [planId, setPlanId] = useState("");
  const [zip, setZip] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<CmsPlan | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [crosswalk, setCrosswalk] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const id = planId.trim().toUpperCase();
    if (id.length < 10) {
      setError("Enter the full 14 character plan ID printed on your card or renewal notice.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlan(null);
    setCrosswalk(null);
    try {
      const detail = await getPlanDetail(id);
      if (!detail?.plan) throw new Error("We could not find a plan with that ID for this plan year.");
      setPlan(detail.plan);

      if (/^\d{5}$/.test(zip)) {
        const resolved = await resolvePlace(zip);
        setPlace(resolved);
        if (resolved) {
          const result = await getPlanCrosswalk(id, resolved).catch(() => null);
          if (result) setCrosswalk(JSON.stringify(result, null, 2));
        }
      } else {
        setPlace(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That lookup failed. Please check the plan ID and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ToolPageShell
      eyebrow="Plan lookup"
      title="Look up any Marketplace plan by ID"
      description="Already have a plan ID from your card, renewal letter, or a quote you were sent? Pull the official benefit detail, cost sharing, plan documents, and next year's replacement plan straight from the source."
    >
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6">
        <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_auto] sm:items-end">
          <label className="block">
            <span className="block text-[11px] font-semibold text-foreground mb-1.5">Plan ID</span>
            <Input
              value={planId}
              onChange={(e) => setPlanId(e.target.value.toUpperCase())}
              placeholder="16842FL0080001"
              className="h-10 font-mono"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-foreground mb-1.5">ZIP code (optional)</span>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
              <Input
                inputMode="numeric"
                maxLength={5}
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="33101"
                className="h-10 pl-9"
              />
            </div>
          </label>
          <Button type="submit" className="h-10 font-semibold" disabled={isLoading}>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Looking up</> : "Look up plan"}
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground/65 leading-relaxed">
          Adding a ZIP code lets us also show the plan your coverage maps to next year.
        </p>
      </form>

      {error && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" strokeWidth={1.5} />
          <p className="text-[13px] text-rose-800">{error}</p>
        </div>
      )}

      {plan && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold mb-1.5">
                  {plan.issuer?.name}
                </p>
                <h2 className="text-xl font-bold text-foreground leading-snug">{plan.name}</h2>
                <p className="text-[12px] text-muted-foreground/70 mt-1.5">
                  {plan.metal_level} &middot; {plan.type} &middot; Plan ID {plan.id}
                  {plan.hsa_eligible ? " · HSA eligible" : ""}
                </p>
              </div>
              {typeof plan.quality_rating?.global_rating === "number" && (
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" strokeWidth={1.5} />
                  {plan.quality_rating.global_rating} of 5 quality rating
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/55 font-semibold mb-1">Full premium</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(plan.premium ?? 0)}/mo</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/55 font-semibold mb-1">Deductible</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatCurrency(plan.deductibles?.[0]?.amount ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
                <p className="text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground/55 font-semibold mb-1">Out of pocket max</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {formatCurrency(plan.moops?.[0]?.amount ?? 0)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-5">
              {DOC_LINKS.map(({ key, label }) => {
                const href = plan[key];
                if (typeof href !== "string" || !href) return null;
                return (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" strokeWidth={1.5} /> {label}
                  </a>
                );
              })}
              {place && (
                <a
                  href={healthcareGovEnrollUrl(plan.id, place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1.5 text-[11.5px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} /> Open on HealthCare.gov
                </a>
              )}
            </div>
          </div>

          {plan.benefits && plan.benefits.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Covered benefits and cost sharing</h3>
              <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                {plan.benefits.map((benefit, index) => {
                  const row = benefit as { name?: string; covered?: boolean; cost_sharings?: Array<{ display_string?: string; network_tier?: string }> };
                  return (
                    <div key={`${row.name ?? "benefit"}-${index}`} className="py-2.5 flex items-start justify-between gap-4">
                      <p className="text-[12.5px] text-foreground/90 leading-snug">{row.name ?? "Benefit"}</p>
                      <p className="text-[12px] text-muted-foreground/75 text-right shrink-0 max-w-[45%]">
                        {row.covered === false
                          ? "Not covered"
                          : row.cost_sharings?.map((cs) => cs.display_string).filter(Boolean).join(" · ") || "Covered"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {crosswalk && (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-6">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">Next plan year crosswalk</h3>
              <p className="text-[12px] text-muted-foreground/70 mb-3">
                How the Marketplace maps this plan forward if it is discontinued or renamed.
              </p>
              <pre className="text-[11px] leading-relaxed text-muted-foreground bg-background/70 border border-border/50 rounded-xl p-4 overflow-auto max-h-72">
                {crosswalk}
              </pre>
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
};

export default PlanLookup;
