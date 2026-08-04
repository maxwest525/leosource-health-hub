import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Search, MapPin, Phone, ChevronDown, ChevronRight, X, Loader2,
  ShieldCheck, Users, AlertCircle, ArrowRight, ArrowLeft, ArrowDown,
  CheckCircle2, Heart, DollarSign, Building2, Stethoscope,
  Pill, Star, BarChart3, Plus, Check, Scale, ExternalLink, Cigarette, Printer,
  HelpCircle, LocateFixed, CalendarDays,

} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DobPicker } from "@/components/ui/dob-picker";


import { ScrollFadeIn } from "@/hooks/use-scroll-animation";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import { cn } from "@/lib/utils";
import { useEnrollmentSession } from "@/hooks/use-enrollment-session";
import type { EnrollmentMember } from "@/lib/enrollment-session";

import {
  searchDrugs,
  checkDrugCoverage,
  searchProviders,
  checkProviderCoverage,
  getPlanDetail,
  healthcareGovEnrollUrl,
  formatCurrency,
  providerDisplayName,
  type CmsPlan,
  type Place,
  type CmsProvider,
  type CmsDrug,
  type CmsProviderCoverage,
  type CmsDrugCoverage,
} from "@/lib/cms";

import {
  defaultEffectiveDate,
  upcomingEffectiveDates,
  lookupHsCounties,
  quoteHsPlans,
  HealthSherpaError,
  type HsCounty,
  type HsPlan,
  type HsRelationship,

} from "@/lib/healthsherpa";
import { hsPlanToCmsPlan, hsSubsidy } from "@/lib/healthsherpa-adapter";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { ZipAutocomplete } from "@/components/ZipAutocomplete";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

import { baseZip, lookupZipPlace, type ZipPlace } from "@/lib/zip-lookup";
import { CarrierLogo } from "@/components/plan/CarrierLogo";
import { QuestionCard } from "@/components/wizard/QuestionCard";
import { ChoiceTiles } from "@/components/wizard/ChoiceTiles";
import { WizardSummary } from "@/components/wizard/WizardSummary";
import { SecureStartGate } from "@/components/wizard/SecureStartGate";
import { SaveProgressDialog } from "@/components/wizard/SaveProgressDialog";
import { VoiceGuide, type VoiceFields } from "@/components/wizard/VoiceGuide";
import { useEnrollmentLock } from "@/hooks/use-enrollment-lock";
import { toast } from "sonner";





/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type NetworkType = string;

type SavedDoctor = { npi: string; name: string };
type SavedDrug = { rxcui: string; name: string };

type EnrichedPlan = {
  plan: CmsPlan;
  fitScore: number;
  deductible: number | null;
  oopMax: number | null;
  doctorsTotal: number;
  doctorsCovered: number;
  drugsTotal: number;
  drugsCovered: number;
};

/* ------------------------------------------------------------------ */
/*  REFERENCE DATA                                                     */
/* ------------------------------------------------------------------ */

const METAL_TIERS = ["Bronze", "Expanded Bronze", "Silver", "Gold", "Platinum", "Catastrophic"];
const PLAN_TYPES = ["HMO", "PPO", "EPO", "POS", "Indemnity"];

/** Age as of the coverage effective date, or NaN when the date of birth is unusable. */
const ageFromDob = (dob: string, asOf: string): number => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return NaN;
  const birth = new Date(`${dob}T00:00:00`);
  const ref = new Date(`${asOf}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime()) || birth > ref) return NaN;
  let age = ref.getFullYear() - birth.getFullYear();
  const before =
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate());
  if (before) age -= 1;
  return age;
};

/** Approximate date of birth used when we only have an age (hero prefill). */
const dobFromAge = (age: number): string => {
  const year = new Date().getFullYear() - (Number.isFinite(age) ? age : 30);
  return `${year}-01-01`;
};

const BUDGET_RANGES = [
  { label: "Under $200/mo", max: 200 },
  { label: "$200–$400/mo", max: 400 },
  { label: "$400–$600/mo", max: 600 },
  { label: "$600–$800/mo", max: 800 },
  { label: "$800+/mo", max: Infinity },
];
const PRIORITIES = ["Low monthly premium", "Low deductible", "Low out-of-pocket max", "Broad network (PPO)", "Doctor compatibility", "Prescription coverage", "Dental & vision included"];

const SORT_OPTIONS = [
  { key: "fit", label: "Best Match" },
  { key: "value", label: "Best Value" },
  { key: "premium-low", label: "Lowest Premium" },
  { key: "deductible-low", label: "Lowest Deductible" },
  { key: "rating", label: "Highest Rated" },
  { key: "doctor", label: "Best Doctor Match" },
  { key: "rx", label: "Best Rx Match" },
];





/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

const findDeductible = (plan: CmsPlan): number | null => {
  const match = plan.deductibles?.find(d => /medical/i.test(d.type)) ?? plan.deductibles?.[0];
  return match ? match.amount : null;
};

const findOopMax = (plan: CmsPlan): number | null => {
  const match = plan.moops?.find(m => /medical/i.test(m.type)) ?? plan.moops?.[0];
  return match ? match.amount : null;
};

const findBenefitCost = (plan: CmsPlan, keywords: RegExp): string | null => {
  const benefit = plan.benefits?.find(b => keywords.test(b.name));
  const display = benefit?.cost_sharings?.[0]?.display_string;
  return display ?? null;
};

const hasBenefit = (plan: CmsPlan, keywords: RegExp): boolean =>
  !!plan.benefits?.find(b => keywords.test(b.name) && b.covered);

const budgetMax = (label: string): number =>
  BUDGET_RANGES.find(b => b.label === label)?.max ?? Infinity;

const metalScore = (metal: string): number => {
  switch (metal) {
    case "Platinum": return 20;
    case "Gold": return 15;
    case "Silver": return 10;
    case "Bronze": return 5;
    default: return 0;
  }
};

function computeFitScore(
  plan: CmsPlan,
  budgetLabel: string,
  priorities: string[],
  doctorPct: number | null,
  drugPct: number | null
): number {
  let score = 40;
  const premium = plan.premium_w_credit ?? plan.premium;
  const maxBudget = budgetLabel ? budgetMax(budgetLabel) : Infinity;
  if (premium <= maxBudget) score += 15;
  else score -= Math.min(20, (premium - maxBudget) / 20);

  score += metalScore(plan.metal_level) * 0.5;

  const deductible = findDeductible(plan);
  if (deductible !== null) score += Math.max(0, 12 - deductible / 800);

  if (plan.quality_rating?.global_rating) score += plan.quality_rating.global_rating * 2;

  if (doctorPct !== null) {
    const weight = priorities.includes("Doctor compatibility") ? 0.3 : 0.15;
    score += doctorPct * weight;
  }
  if (drugPct !== null) {
    const weight = priorities.includes("Prescription coverage") ? 0.3 : 0.15;
    score += drugPct * weight;
  }
  if (priorities.includes("Low monthly premium") && premium <= maxBudget) score += 5;
  if (priorities.includes("Low deductible") && deductible !== null && deductible < 2000) score += 5;
  if (priorities.includes("Broad network (PPO)") && plan.type === "PPO") score += 5;
  if (priorities.includes("Dental & vision included") && (hasBenefit(plan, /dental/i) || hasBenefit(plan, /vision/i))) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ------------------------------------------------------------------ */
/*  STEP INDICATOR                                                     */
/* ------------------------------------------------------------------ */

const STEPS = [
  { num: 1, label: "Location & Coverage" },
  { num: 4, label: "Results" },
  { num: 5, label: "Confirmation" },
];

function StepIndicator({ current }: { current: number }) {
  const total = STEPS.length;
  const idx = STEPS.findIndex(s => s.num === current);
  const clamped = idx >= 0 ? idx + 1 : 1;
  const active = STEPS[clamped - 1];
  const remaining = Math.max(total - clamped, 0);
  const pct = total > 1 ? ((clamped - 1) / (total - 1)) * 100 : 100;

  return (
    <div className="max-w-md mx-auto space-y-2">
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={clamped}
        aria-label={`Step ${clamped} of ${total}`}
        className="relative px-1"
      >
        {/* sliding track behind the numbered nodes */}
        <div className="absolute left-1 right-1 top-4 h-1 -translate-y-1/2 rounded-full bg-border/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="relative flex items-start justify-between">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex flex-col items-center gap-1.5">
              <div
                aria-current={current === step.num ? "step" : undefined}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 bg-white",
                  current > step.num && "bg-primary text-primary-foreground border-primary",
                  current === step.num && "bg-primary text-primary-foreground border-primary ring-4 ring-primary/15 scale-105",
                  current < step.num && "text-muted-foreground/50 border-border/50"
                )}
              >
                {current > step.num ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={cn(
                "text-[11px] font-medium hidden sm:inline transition-colors",
                current >= step.num ? "text-foreground" : "text-muted-foreground/40"
              )}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>

  );
}




/* ------------------------------------------------------------------ */
/*  REVIEW SUMMARY                                                     */
/* ------------------------------------------------------------------ */

type ReviewRow = {
  key: string;
  label: string;
  hint: string;
  value: string;
  icon: typeof MapPin;
  step: number;
};

function ReviewSummary({ rows, onEdit }: { rows: ReviewRow[]; onEdit: (step: number) => void }) {
  const filled = rows.filter(r => r.value).length;

  return (
    <section
      aria-label="Review your details"
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/60 px-4 py-4 shadow-[0_18px_40px_-28px_hsl(var(--primary)/0.55)] backdrop-blur-xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <header className="mb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Review your details
          </h2>
          <span className="text-[11px] tabular-nums text-muted-foreground">{filled}/{rows.length}</span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Everything we will send to HealthQuote Pro. Edit any section before we price your plans.
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary/70 transition-all duration-500"
            style={{ width: `${(filled / rows.length) * 100}%` }}
          />
        </div>
      </header>

      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(row => {
          const Icon = row.icon;
          const done = Boolean(row.value);
          return (
            <div
              key={row.key}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                done ? "border-primary/20 bg-primary/[0.04]" : "border-border/40 bg-background/40"
              )}
            >
              <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", done ? "text-primary" : "text-muted-foreground/40")} />
              <div className="min-w-0 flex-1">
                <dt className="text-[11px] font-medium text-muted-foreground">
                  {row.label} <span className="text-muted-foreground/50">· {row.hint}</span>
                </dt>
                <dd className={cn("text-[13px] font-semibold break-words", done ? "text-foreground" : "text-muted-foreground/40")}>
                  {row.value || "Not provided"}
                </dd>
              </div>
              <button
                type="button"
                onClick={() => onEdit(row.step)}
                className="text-[11px] font-semibold text-primary hover:underline shrink-0"
              >
                Edit
              </button>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PRINTABLE RECAP (screen-hidden, print-only)                        */
/* ------------------------------------------------------------------ */

function PrintableRecap({
  rows,
  plans,
  location,
  aptc,
}: {
  rows: ReviewRow[];
  plans: EnrichedPlan[];
  location: string;
  aptc: number | null;
}) {
  const printedOn = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div id="print-recap" aria-hidden className="hidden">
      <header className="print-head">
        <h1>TruEnroll</h1>
        <p>Plan comparison recap {location ? `· ${location}` : ""}</p>
        <p className="print-meta">Generated {printedOn}</p>
      </header>

      <h2>Your details</h2>
      <table className="print-table">
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              <td>{row.value || "Not provided"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {plans.length > 0 && (
        <>
          <h2>Selected plans{aptc !== null ? ` · subsidy applied ${formatCurrency(aptc)}/mo` : ""}</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col">Carrier</th>
                <th scope="col">Tier / network</th>
                <th scope="col">Premium</th>
                <th scope="col">Deductible</th>
                <th scope="col">Out-of-pocket max</th>
                <th scope="col">Fit</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(({ plan, deductible, oopMax, fitScore }) => (
                <tr key={plan.id}>
                  <td>{plan.name}</td>
                  <td>{plan.issuer?.name ?? "—"}</td>
                  <td>{[plan.metal_level, plan.type].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{formatCurrency(plan.premium_w_credit)}/mo</td>
                  <td>{deductible !== null ? formatCurrency(deductible) : "—"}</td>
                  <td>{oopMax !== null ? formatCurrency(oopMax) : "—"}</td>
                  <td>{fitScore}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="print-note">
        Premiums reflect live Marketplace pricing and any estimated subsidy. Final premium and eligibility are
        confirmed during enrollment. Questions? Speak with a licensed agent at 800.758.1590.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MATCH BAR                                                          */
/* ------------------------------------------------------------------ */

function MatchBar({ value, label }: { value: number; label: string }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/60 font-medium">{label}</span>
        <span className="text-[11px] font-semibold text-foreground tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PLAN DETAIL PANEL                                                  */
/* ------------------------------------------------------------------ */

function PlanDetailPanel({ plan, detail, loading }: { plan: CmsPlan; detail: CmsPlan | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-border/30 space-y-2 animate-pulse">
        <div className="h-3 bg-muted/30 rounded w-1/3" />
        <div className="h-3 bg-muted/20 rounded w-1/2" />
        <div className="h-3 bg-muted/20 rounded w-2/5" />
      </div>
    );
  }

  const docSource = detail ?? plan;
  const links: Array<{ label: string; url?: string }> = [
    { label: "Benefits Summary", url: docSource.benefits_url },
    { label: "Brochure", url: docSource.brochure_url },
    { label: "Formulary", url: docSource.formulary_url },
    { label: "Network Directory", url: docSource.network_url },
  ].filter(l => !!l.url);

  return (
    <div className="mt-3 pt-3 border-t border-border/30 space-y-3 text-[13px]">
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
        <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Primary Care Copay</span><span className="font-medium text-foreground text-right">{findBenefitCost(plan, /primary care/i) ?? "See plan details"}</span></div>
        <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Specialist Copay</span><span className="font-medium text-foreground text-right">{findBenefitCost(plan, /specialist/i) ?? "See plan details"}</span></div>
        <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Emergency Room</span><span className="font-medium text-foreground text-right">{findBenefitCost(plan, /emergency/i) ?? "See plan details"}</span></div>
        <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Network Type</span><span className="font-medium text-foreground">{plan.type}</span></div>
        {plan.network_name && (
          <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Network</span><span className="font-medium text-foreground text-right">{plan.network_name}</span></div>
        )}
        <div className="flex justify-between py-1 sm:col-span-2"><span className="text-muted-foreground/60">Generic Drugs</span><span className="font-medium text-foreground text-right">{findBenefitCost(plan, /generic/i) ?? "See formulary"}</span></div>
        <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Dental</span><span className="font-medium text-foreground">{hasBenefit(plan, /dental/i) ? "Included" : "Not included"}</span></div>
        <div className="flex justify-between py-1"><span className="text-muted-foreground/60">Vision</span><span className="font-medium text-foreground">{hasBenefit(plan, /vision/i) ? "Included" : "Not included"}</span></div>
      </div>
      {detail?.benefits && detail.benefits.length > 0 && (
        <div className="pt-2 border-t border-border/20">
          <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-1.5">Cost Sharing</p>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {detail.benefits.slice(0, 12).map((b, i) => (
              <div key={i} className="flex justify-between text-[12px] py-0.5">
                <span className="text-muted-foreground/60 pr-3">{b.name}</span>
                <span className="font-medium text-foreground text-right shrink-0">{b.cost_sharings?.[0]?.display_string ?? (b.covered ? "Covered" : "Not covered")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border/20">
          {links.map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-primary/70 hover:text-primary flex items-center gap-1 underline underline-offset-2">
              {l.label} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PLAN CARD                                                          */
/* ------------------------------------------------------------------ */

function PlanCard({
  enriched, isComparing, onToggleCompare, onGetHelp, expanded, onToggleExpand,
  detail, detailLoading, place, isTopFit,
}: {
  enriched: EnrichedPlan; isComparing: boolean; onToggleCompare: () => void;
  onGetHelp: () => void;
  expanded: boolean; onToggleExpand: () => void;
  detail: CmsPlan | null; detailLoading: boolean;
  place: Place; isTopFit: boolean;
}) {
  const { plan, fitScore, deductible, oopMax, doctorsTotal, doctorsCovered, drugsTotal, drugsCovered } = enriched;
  const doctorPct = doctorsTotal > 0 ? Math.round((doctorsCovered / doctorsTotal) * 100) : null;
  const drugPct = drugsTotal > 0 ? Math.round((drugsCovered / drugsTotal) * 100) : null;

  return (
    <article className={cn(
      "bg-white border rounded-xl transition-all duration-300 overflow-hidden",
      isComparing ? "border-primary/30 shadow-[0_4px_20px_-4px_rgba(8,56,112,0.1)]" : "border-border/40 hover:border-primary/15 hover:shadow-[0_6px_32px_-8px_rgba(8,56,112,0.07)]"
    )}>
      {isTopFit && (
        <div className="bg-primary/[0.04] border-b border-primary/[0.08] px-5 py-1.5 flex items-center gap-1.5">
          <Star className="w-3 h-3 text-accent" fill="hsl(var(--accent))" />
          <span className="text-[11px] font-semibold text-primary/80">Best Overall Match</span>
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3">
              <CarrierLogo name={plan.issuer?.name} />

              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground/50 font-medium uppercase tracking-wider">{plan.issuer?.name}</p>
                <h3 className="text-[15px] font-semibold text-foreground leading-snug mt-0.5">{plan.name}</h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {plan.metal_level && (
                    <Badge variant="outline" className={cn("text-[9px] font-semibold uppercase tracking-wider border",
                      plan.metal_level === "Platinum" ? "text-violet-700 border-violet-200 bg-violet-50/60"
                      : plan.metal_level === "Gold" ? "text-amber-700 border-amber-200 bg-amber-50/60"
                      : plan.metal_level === "Silver" ? "text-slate-600 border-slate-200 bg-slate-50/60"
                      : "text-orange-700 border-orange-200 bg-orange-50/60"
                    )}>{plan.metal_level}</Badge>
                  )}
                  <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider border-primary/15 text-primary/60 bg-primary/[0.03]">{plan.type}</Badge>
                  {hasBenefit(plan, /dental/i) && <Badge variant="outline" className="text-[9px] font-medium border-border/40 text-muted-foreground/60">Dental</Badge>}
                  {hasBenefit(plan, /vision/i) && <Badge variant="outline" className="text-[9px] font-medium border-border/40 text-muted-foreground/60">Vision</Badge>}
                  {plan.quality_rating?.global_rating && (
                    <Badge variant="outline" className="text-[9px] font-medium border-border/40 text-muted-foreground/60 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" fill="currentColor" /> {plan.quality_rating.global_rating}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-3 mt-4 bg-muted/[0.15] rounded-lg p-3">
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Premium</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(plan.premium_w_credit)}<span className="text-xs font-normal text-muted-foreground/50">/mo</span></p>
                {plan.premium_w_credit !== plan.premium && (
                  <p className="text-[10px] text-muted-foreground/40">
                    <span className="line-through">{formatCurrency(plan.premium)}</span>
                    {typeof plan.subsidy_applied === "number" && plan.subsidy_applied > 0 && (
                      <span className="ml-1 font-medium text-primary/70">
                        −{formatCurrency(plan.subsidy_applied)} credit
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Deductible</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{deductible !== null ? formatCurrency(deductible) : "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium">Max OOP</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{oopMax !== null ? formatCurrency(oopMax) : "—"}</p>
              </div>
            </div>

            {(doctorPct !== null || drugPct !== null) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {doctorPct !== null && (
                  <span className={cn("text-[11px] font-medium rounded-full px-2.5 py-1 border",
                    doctorPct >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : doctorPct >= 40 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-rose-50 border-rose-200 text-rose-700"
                  )}>{doctorsCovered} of {doctorsTotal} doctors in network</span>
                )}
                {drugPct !== null && (
                  <span className={cn("text-[11px] font-medium rounded-full px-2.5 py-1 border",
                    drugPct >= 80 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : drugPct >= 40 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-rose-50 border-rose-200 text-rose-700"
                  )}>{drugsCovered} of {drugsTotal} drugs covered</span>
                )}
              </div>
            )}
          </div>

          {/* Right: Match + Actions */}
          <div className="lg:w-52 shrink-0 space-y-3">
            <MatchBar value={fitScore} label="Fit Score" />
            <div className="pt-1 space-y-2">
              <Button size="sm" className="w-full text-[11px] h-8 font-semibold bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                <a href={plan.payment_url ?? healthcareGovEnrollUrl(plan.id, place)} target="_blank" rel="noreferrer">
                  {plan.payment_url ? "Continue to enroll" : "Enroll on HealthCare.gov"}
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>
              </Button>
              <Button size="sm" variant="outline" className="w-full text-[11px] h-8 font-semibold" onClick={onGetHelp}>
                Talk to a Specialist <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
              <button
                onClick={onToggleCompare}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-medium border transition-all duration-200",
                  isComparing
                    ? "bg-primary/[0.06] border-primary/20 text-primary"
                    : "bg-background border-input text-muted-foreground hover:border-primary/20"
                )}
              >
                {isComparing ? <Check className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                {isComparing ? "Added to Compare" : "Add to Compare"}
              </button>
            </div>
          </div>
        </div>

        {/* Expandable details */}
        <button onClick={onToggleExpand} className="flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-foreground font-medium mt-3 transition-colors">
          <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", expanded && "rotate-180")} />
          {expanded ? "Hide details" : "Show more details"}
        </button>

        {expanded && <PlanDetailPanel plan={detail ?? plan} detail={detail} loading={detailLoading} />}
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  COMPARE DRAWER                                                     */
/* ------------------------------------------------------------------ */

function CompareDrawer({ plans, onRemove, onClear, place }: { plans: EnrichedPlan[]; onRemove: (id: string) => void; onClear: () => void; place: Place | null }) {
  const [open, setOpen] = useState(false);
  const tableScrollRef = useDragScroll<HTMLDivElement>();


  if (plans.length === 0) return null;

  const rows: { label: string; getValue: (p: EnrichedPlan) => string }[] = [
    { label: "Carrier", getValue: p => p.plan.issuer?.name ?? "—" },
    { label: "Metal Tier", getValue: p => p.plan.metal_level || "—" },
    { label: "Network", getValue: p => p.plan.type },
    { label: "Monthly Premium", getValue: p => formatCurrency(p.plan.premium_w_credit) },
    { label: "Deductible", getValue: p => p.deductible !== null ? formatCurrency(p.deductible) : "—" },
    { label: "Max Out-of-Pocket", getValue: p => p.oopMax !== null ? formatCurrency(p.oopMax) : "—" },
    { label: "Quality Rating", getValue: p => p.plan.quality_rating?.global_rating ? `${p.plan.quality_rating.global_rating}/5` : "—" },
    { label: "Fit Score", getValue: p => `${p.fitScore}%` },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/50 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Scale className="w-4 h-4 text-primary/60 shrink-0" />
            <span className="text-[13px] sm:text-sm font-semibold text-foreground whitespace-nowrap">{plans.length} selected</span>
            <div className="hidden sm:flex gap-1.5">
              {plans.map(p => (
                <span key={p.plan.id} className="text-[10px] font-medium bg-primary/[0.05] text-primary rounded-full px-2 py-0.5 flex items-center gap-1">
                  {(p.plan.issuer?.name ?? "Plan").split(" ")[0]} <button onClick={() => onRemove(p.plan.id)} aria-label={`Remove ${p.plan.issuer?.name ?? "plan"}`}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="text-xs" onClick={onClear}>Clear</Button>
            <Button size="sm" className="text-xs bg-primary text-primary-foreground font-semibold" onClick={() => setOpen(!open)} disabled={plans.length < 2}>
              Compare<span className="hidden sm:inline"> Side by Side</span> <BarChart3 className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div
            className="bg-white w-full max-w-4xl h-[92dvh] sm:h-auto sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="shrink-0 bg-white border-b border-border/30 px-4 sm:px-6 py-3.5 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-foreground truncate">Side-by-Side Comparison</h3>
                <p className="text-[11px] text-muted-foreground/60">Swipe or drag sideways to see each plan</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close comparison" className="p-2 -mr-1 rounded-lg hover:bg-muted/50 transition-colors shrink-0"><X className="w-4 h-4" /></button>
            </div>

            <div
              ref={tableScrollRef}
              tabIndex={0}
              role="region"
              aria-label="Plan comparison table, scrollable horizontally"
              className="flex-1 min-h-0 overflow-auto overscroll-contain cursor-grab touch-pan-x touch-pan-y [scrollbar-width:thin] [-webkit-overflow-scrolling:touch] snap-x snap-proximity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 bg-white border-b border-border/30 text-left px-3 sm:px-5 py-3 text-[10px] sm:text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider w-[104px] sm:w-40">
                      Plan
                    </th>
                    {plans.map(p => (
                      <th key={p.plan.id} className="sticky top-0 z-20 snap-start bg-white border-b border-border/30 px-3 sm:px-4 py-3 text-center align-top min-w-[150px] sm:min-w-[180px]">
                        <CarrierLogo name={p.plan.issuer?.name} className="mx-auto mb-1 h-8 w-8 rounded-lg" />
                        <p className="text-[10px] text-muted-foreground/50 font-medium truncate">{p.plan.issuer?.name}</p>


                        <p className="text-[12px] sm:text-[13px] font-semibold text-foreground mt-0.5 leading-snug line-clamp-2">{p.plan.name}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.label}>
                      <th
                        scope="row"
                        className={cn(
                          "sticky left-0 z-10 text-left px-3 sm:px-5 py-2.5 text-[11px] sm:text-[12px] font-medium text-muted-foreground/80 border-b border-border/20 align-top",
                          i % 2 === 0 ? "bg-muted/[0.08]" : "bg-white"
                        )}
                      >
                        {row.label}
                      </th>
                      {plans.map(p => (
                        <td
                          key={p.plan.id}
                          className={cn(
                            "px-3 sm:px-4 py-2.5 text-center text-[12px] sm:text-[13px] text-foreground border-b border-border/20 align-top break-words",
                            i % 2 === 0 ? "bg-muted/[0.06]" : "bg-white"
                          )}
                        >
                          {row.getValue(p)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 bg-white border-t border-border/30 px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-between sm:items-center">
              <p className="text-[10px] sm:text-[11px] text-muted-foreground/50 leading-snug">Plan details and pricing come from the CMS Marketplace API. Verify before enrolling.</p>
              <Button size="sm" className="w-full sm:w-auto bg-primary text-primary-foreground text-xs font-semibold shrink-0" asChild>
                <a href="tel:+18007581590"><Phone className="w-3 h-3 mr-1" /> Speak to an Agent</a>
              </Button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SKELETON                                                           */
/* ------------------------------------------------------------------ */

const fieldLabelClass =
  "block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className={cn(fieldLabelClass, "mb-1.5")}>{children}</label>;
}

/** Fixed-height label row so columns in a grid keep their inputs aligned. */
function FieldLabelRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex h-6 items-center justify-between gap-3">{children}</div>
  );
}

/** Yearly / Monthly segmented toggle, shown inline beside income sliders. */
function IncomePeriodToggle({
  value,
  onChange,
  className,
}: {
  value: "year" | "month";
  onChange: (v: "year" | "month") => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Income period"
      className={cn("shrink-0 flex rounded-lg border border-border/60 p-0.5", className)}
    >
      {(["year", "month"] as const).map(period => (
        <button
          key={period}
          type="button"
          aria-pressed={value === period}
          onClick={() => onChange(period)}
          className={cn(
            "px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors",
            value === period
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground/70 hover:text-foreground",
          )}
        >
          {period === "year" ? "Yearly" : "Monthly"}
        </button>
      ))}
    </div>
  );
}




function ResultSkeleton() {
  return (
    <div className="bg-white border border-border/30 rounded-xl p-6 animate-pulse">
      <div className="flex gap-4">
        <div className="w-11 h-11 rounded-xl bg-muted/50 hidden sm:block" />
        <div className="flex-1 space-y-3">
          <div className="h-3 bg-muted/40 rounded w-24" />
          <div className="h-4 bg-muted/50 rounded w-2/5" />
          <div className="flex gap-2"><div className="h-5 bg-muted/30 rounded w-14" /><div className="h-5 bg-muted/30 rounded w-12" /></div>
          <div className="grid grid-cols-3 gap-3 mt-2"><div className="h-16 bg-muted/20 rounded" /><div className="h-16 bg-muted/20 rounded" /><div className="h-16 bg-muted/20 rounded" /></div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RESULT FILTER CONTROLS                                             */
/* ------------------------------------------------------------------ */

type FilterOption = { value: string; label: string };

/** Shared trigger chrome so every filter control on the results page looks identical. */
const filterTriggerClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-medium transition-colors",
    active
      ? "border-primary/40 bg-primary/[0.06] text-primary"
      : "border-border/50 bg-white text-muted-foreground hover:border-primary/30 hover:text-foreground",
  );

/** Multi-select filter shown as a matching pill trigger with a checkbox list. */
function FilterMenu({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  if (options.length === 0) return null;
  const active = selected.length > 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={filterTriggerClass(active)} aria-label={`Filter by ${label.toLowerCase()}`}>
          {label}
          {active && (
            <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map(o => {
            const checked = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onToggle(o.value)}
                aria-pressed={checked}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-foreground transition-colors hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-primary bg-primary/10 text-primary" : "border-border",
                  )}
                >
                  {checked && <Check className="h-3 w-3" aria-hidden />}
                </span>
                <span className="min-w-0 truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="mt-1 w-full rounded-md px-2 py-1.5 text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Clear {label.toLowerCase()}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Single-select range filter (premium / deductible) using the same trigger chrome. */
function RangeFilterMenu({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const active = value !== "";
  const current = options.find(o => o.value === value);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={filterTriggerClass(active)} aria-label={`Filter by ${label.toLowerCase()}`}>
          {active ? current?.label ?? label : label}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-2">
        <div className="space-y-0.5">
          {[{ value: "", label: `Any ${label.toLowerCase()}` }, ...options].map(o => (
            <button
              key={o.value || "any"}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-muted/60",
                o.value === value ? "font-semibold text-primary" : "text-foreground",
              )}
            >
              {o.label}
              {o.value === value && <Check className="h-3 w-3" aria-hidden />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */




/** Short section name shown next to the step counter in the wizard header. */
const stepLabelFor = (id: string): string => {
  if (id === "location") return "Location";
  if (id === "start") return "Coverage start";
  if (id === "people" || id === "who-else") return "Household";
  if (id.startsWith("member")) return "About each person";
  if (id === "income" || id === "household") return "Income";
  if (id === "doctors") return "Doctors";
  if (id === "rx" || id === "prescriptions") return "Prescriptions";
  return "Details";
};

const ComparePlans = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);

  // Step flow
  const [step, setStep] = useState(1);
  // Safety notice + optional device lock shown before the first question.
  const [intakeStarted, setIntakeStarted] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("lsia.intake-consent") === "1",
  );

  const [qIndex, setQIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const isMobile = useIsMobile();
  // one-tap auto-advance: single-choice screens move on by themselves on touch devices
  const [advanceToken, setAdvanceToken] = useState(0);
  const requestAutoAdvance = useCallback(() => setAdvanceToken(t => t + 1), []);

  // Mobile: lock the page so the wizard card snaps to the viewport instead of scrolling.
  useEffect(() => {
    if (!isMobile || step !== 1) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, step]);
  const [qError, setQError] = useState<string | null>(null);

  // Step 1: Location, category, household
  const [zip, setZip] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const [income, setIncome] = useState(50000);
  const [incomePeriod, setIncomePeriod] = useState<"year" | "month">("year");
  const displayIncome = incomePeriod === "year" ? income : Math.round(income / 12);
  const incomeMax = incomePeriod === "year" ? 200000 : 16600;




  const [dobs, setDobs] = useState<string[]>([dobFromAge(30)]);
  const [tobacco, setTobacco] = useState<boolean[]>([false]);
  const [genders, setGenders] = useState<Array<"Male" | "Female">>(["Male"]);
  const [relationships, setRelationships] = useState<Array<HsRelationship>>(["primary"]);
  const [disabledFlags, setDisabledFlags] = useState<boolean[]>([false]);
  const [tribalFlags, setTribalFlags] = useState<boolean[]>([false]);
  const [pregnantFlags, setPregnantFlags] = useState<boolean[]>([false]);
  /** Guided flow: does anyone besides the applicant need coverage, and who? */
  const [coversOthers, setCoversOthers] = useState(false);
  const [mix, setMix] = useState({ spouse: false, children: 0, others: 0 });



  const [householdSize, setHouseholdSize] = useState(1);
  const [splitIncome] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [memberIncomes, setMemberIncomes] = useState<number[]>([50000]);

  // Keep the per-person income list aligned with the household member list
  useEffect(() => {
    setMemberIncomes(prev => {
      if (prev.length === dobs.length) return prev;
      const next = dobs.map((_, i) => prev[i] ?? 0);
      return next;
    });
  }, [dobs.length]);

  const memberIncomeTotal = useMemo(
    () => memberIncomes.slice(0, dobs.length).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0),

    [memberIncomes, dobs.length],
  );

  useEffect(() => {
    if (splitIncome) setIncome(memberIncomeTotal);
  }, [splitIncome, memberIncomeTotal]);

  const setMemberIncome = useCallback((index: number, value: number) => {
    setMemberIncomes(prev => prev.map((v, i) => (i === index ? value : v)));
  }, []);



  // Step 2: Preferences
  const [budget, setBudget] = useState("");
  const [preferredCarrier, setPreferredCarrier] = useState("");
  const [preferredNetwork, setPreferredNetwork] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [savedDoctors, setSavedDoctors] = useState<SavedDoctor[]>([]);
  const [savedRx, setSavedRx] = useState<SavedDrug[]>([]);
  const [checkDoctors, setCheckDoctors] = useState(false);
  const [checkRx, setCheckRx] = useState(false);
  const [doctorInput, setDoctorInput] = useState("");
  const [rxInput, setRxInput] = useState("");
  const [doctorResults, setDoctorResults] = useState<CmsProvider[]>([]);
  const [rxResults, setRxResults] = useState<CmsDrug[]>([]);
  const [doctorSearching, setDoctorSearching] = useState(false);
  const [rxSearching, setRxSearching] = useState(false);

  // Step 1 county resolution (HealthQuote Pro)
  const [counties, setCounties] = useState<HsCounty[]>([]);
  const [countyFips, setCountyFips] = useState("");
  const [countyLoading, setCountyLoading] = useState(false);
  const [zipPlace, setZipPlace] = useState<ZipPlace | null>(null);
  const [zipInstant, setZipInstant] = useState(false);
  const [address, setAddress] = useState("");


  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate());
  const startDateOptions = useMemo(() => upcomingEffectiveDates(4), []);

  /** Ages are always derived from each member's date of birth, as of the effective date. */
  const ages = useMemo(() => dobs.map(d => ageFromDob(d, effectiveDate)), [dobs, effectiveDate]);

  // Save progress — only offered behind the device lock (Face ID / PIN).
  const { lock } = useEnrollmentLock();
  const [lockPromptOpen, setLockPromptOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /** Writes the in-progress intake to this device, behind the lock the member set. */
  const writeSnapshot = useCallback(() => {
    setSaving(true);
    try {
      window.localStorage.setItem(
        "lsia.intake-progress",
        JSON.stringify({
          savedAt: new Date().toISOString(),
          qIndex,
          zip,
          address,
          countyFips,
          effectiveDate,
          income,
          incomePeriod,
          householdSize,
          memberIncomes,
          dobs,
          genders,
          relationships,
          tobacco,
          disabledFlags,
          tribalFlags,
          pregnantFlags,
          savedDoctors,
          savedRx,
        }),
      );
      setSaved(true);
      toast.success("Progress saved to this device");
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }, [
    qIndex,
    zip,
    address,
    countyFips,
    effectiveDate,
    income,
    incomePeriod,
    householdSize,
    memberIncomes,
    dobs,
    genders,
    relationships,
    tobacco,
    disabledFlags,
    tribalFlags,
    pregnantFlags,
    savedDoctors,
    savedRx,
  ]);

  /** No lock yet? Send them through Face ID / PIN setup first, then save. */
  const handleSave = useCallback(() => {
    if (lock) writeSnapshot();
    else setLockPromptOpen(true);
  }, [lock, writeSnapshot]);




  // Step 3: Results
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [aptc, setAptc] = useState<number | null>(null);
  const [plans, setPlans] = useState<CmsPlan[]>([]);
  const [providerCoverage, setProviderCoverage] = useState<CmsProviderCoverage[]>([]);
  const [drugCoverage, setDrugCoverage] = useState<CmsDrugCoverage[]>([]);
  const [sortBy, setSortBy] = useState("fit");
  const [filterCarriers, setFilterCarriers] = useState<string[]>([]);
  const [filterTiers, setFilterTiers] = useState<string[]>([]);
  const [filterNetworks, setFilterNetworks] = useState<string[]>([]);
  const [maxPremium, setMaxPremium] = useState("");
  const [maxDeductible, setMaxDeductible] = useState("");
  const [hsaOnly, setHsaOnly] = useState(false);
  const [standardizedOnly, setStandardizedOnly] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [resultPage, setResultPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [quoteWarnings, setQuoteWarnings] = useState<string[]>([]);


  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [confirmationRef, setConfirmationRef] = useState("");
  const [planDetails, setPlanDetails] = useState<Record<string, CmsPlan>>({});
  const [planDetailLoading, setPlanDetailLoading] = useState<Record<string, boolean>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  const togglePriority = (p: string) => {
    setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const addAge = () => {
    setDobs(prev => [...prev, ""]);
    setTobacco(prev => [...prev, false]);
    setGenders(prev => [...prev, "Male"]);
    setDisabledFlags(prev => [...prev, false]);
    setTribalFlags(prev => [...prev, false]);
    setPregnantFlags(prev => [...prev, false]);
    setRelationships(prev => [...prev, prev.includes("spouse") ? "dependent" : "spouse"]);
    setHouseholdSize(prev => Math.max(prev, dobs.length + 1));
  };
  const removeAge = (i: number) => {
    const drop = <T,>(arr: T[]) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr);
    setDobs(drop);
    setTobacco(drop);
    setGenders(drop);
    setDisabledFlags(drop);
    setTribalFlags(drop);
    setPregnantFlags(drop);
    setRelationships(drop);
  };
  const setGender = (i: number, value: "Male" | "Female") => {
    setGenders(prev => prev.map((g, idx) => idx === i ? value : g));
    if (value === "Male") setPregnantFlags(prev => prev.map((p, idx) => idx === i ? false : p));
  };
  const setRelationship = (i: number, value: HsRelationship) =>
    setRelationships(prev =>
      prev.map((r, idx) => {
        if (idx === i) return value;
        // Only one spouse is allowed on a household.
        if (value === "spouse" && r === "spouse") return "dependent";
        return r;
      }),
    );
  const updateDob = (i: number, value: string) => setDobs(prev => prev.map((d, idx) => idx === i ? value : d));
  const toggleTobacco = (i: number) => setTobacco(prev => prev.map((t, idx) => idx === i ? !t : t));
  const toggleDisabled = (i: number) => setDisabledFlags(prev => prev.map((d, idx) => idx === i ? !d : d));
  const toggleTribal = (i: number) => setTribalFlags(prev => prev.map((t, idx) => idx === i ? !t : t));
  const togglePregnant = (i: number) => setPregnantFlags(prev => prev.map((t, idx) => idx === i ? !t : t));

  // Household size can never be smaller than the number of applicants listed.
  useEffect(() => {
    setHouseholdSize(prev => (prev < dobs.length ? dobs.length : prev));
  }, [dobs.length]);

  // Prefill from the homepage hero finder
  useEffect(() => {
    const prefill = readWizardPrefill();
    if (!prefill) return;
    setZip(prefill.zip);
    setDobs(prefill.ages.map(a => dobFromAge(a)));
    setTobacco(prefill.tobacco.length === prefill.ages.length ? prefill.tobacco : prefill.ages.map(() => false));
    setGenders(prefill.ages.map(() => "Male"));
    setDisabledFlags(prefill.ages.map(() => false));
    setTribalFlags(prefill.ages.map(() => false));
    setPregnantFlags(prefill.ages.map(() => false));
    setRelationships(prefill.ages.map((_, i) => (i === 0 ? "primary" : i === 1 ? "spouse" : "dependent")));
    setHouseholdSize(Math.max(1, prefill.ages.length));

    if (!readSavedIncome()) setIncome(prefill.income);

  }, []);


  // Doctor autocomplete
  useEffect(() => {
    if (doctorInput.trim().length < 2 || zip.length < 5) { setDoctorResults([]); return; }
    setDoctorSearching(true);
    const handle = setTimeout(() => {
      searchProviders({ query: doctorInput.trim(), zipcode: zip })
        .then(res => setDoctorResults(res.slice(0, 6)))
        .catch(() => setDoctorResults([]))
        .finally(() => setDoctorSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [doctorInput, zip]);

  // Drug autocomplete
  useEffect(() => {
    if (rxInput.trim().length < 2) { setRxResults([]); return; }
    setRxSearching(true);
    const handle = setTimeout(() => {
      searchDrugs(rxInput.trim())
        .then(res => setRxResults(res.slice(0, 6)))
        .catch(() => setRxResults([]))
        .finally(() => setRxSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [rxInput]);

  const addDoctor = (provider: CmsProvider) => {
    const name = providerDisplayName(provider);
    setSavedDoctors(prev => prev.some(d => d.npi === provider.npi) ? prev : [...prev, { npi: provider.npi, name }]);
    setDoctorInput("");
    setDoctorResults([]);
  };

  const addRx = (drug: CmsDrug) => {
    setSavedRx(prev => prev.some(d => d.rxcui === drug.rxcui) ? prev : [...prev, { rxcui: drug.rxcui, name: drug.full_name ?? drug.name }]);
    setRxInput("");
    setRxResults([]);
  };

  const county = useMemo(
    () => counties.find(c => c.fips_code === countyFips) ?? null,
    [counties, countyFips],
  );

  // Resolve the actual city for the ZIP even when it was typed instead of picked.
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) return;
    if (zipPlace?.zip === zip) return;
    const controller = new AbortController();
    let active = true;
    void lookupZipPlace(zip, controller.signal).then(place => {
      if (active && place) setZipPlace(place);
    });
    return () => { active = false; controller.abort(); };
  }, [zip, zipPlace]);


  // Auto-resolve the county as soon as a full ZIP is typed (instantly when picked from suggestions)
  useEffect(() => {
    if (!/^\d{5}$/.test(zip)) {
      setCounties([]);
      setCountyFips("");
      setCountyLoading(false);
      return;
    }
    let active = true;
    setError(null);
    setCountyLoading(true);
    const handle = setTimeout(async () => {
      try {
        const found = await lookupHsCounties(zip);
        if (!active) return;
        if (found.length === 0) {
          setCounties([]);
          setCountyFips("");
          setError("No county matched that ZIP code. Double-check it and try again.");
          return;
        }
        setCounties(found);
        // Auto-select the first match so the county never blocks the user.
        setCountyFips(found[0].fips_code);

      } catch (err) {
        if (!active) return;
        setCounties([]);
        setCountyFips("");
        setError(err instanceof HealthSherpaError ? err.message : "County lookup failed. Please try again.");
      } finally {
        if (active) setCountyLoading(false);
      }
    }, zipInstant ? 0 : 400);
    return () => { active = false; clearTimeout(handle); };
  }, [zip, zipInstant]);


  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Location isn't available in this browser. Enter your ZIP code instead.");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
          );
          const data = (await res.json()) as { postcode?: string };
          const found = (data.postcode ?? "").replace(/\D/g, "").slice(0, 5);
          if (found.length === 5) {
            setZip(found);
            setError(null);
          } else {
            setError("We couldn't match your location to a ZIP code. Enter it manually.");
          }
        } catch {
          setError("We couldn't match your location to a ZIP code. Enter it manually.");
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setError("Location access was blocked. Enter your ZIP code instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);


  const reviewRows = useMemo<ReviewRow[]>(() => {
    const memberSummary = ages.map((age, i) =>
      `${i === 0 ? "You" : (relationships[i] ?? "dependent") === "spouse" ? "Spouse" : "Dependent"} ${dobs[i] ? new Date(`${dobs[i]}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}${Number.isFinite(age) ? ` (${age})` : ""} ${(genders[i] ?? "Male") === "Male" ? "M" : "F"}${tobacco[i] ? " · tobacco" : ""}${disabledFlags[i] ? " · disabled or blind" : ""}${tribalFlags[i] ? " · tribal member" : ""}`
    ).join(", ");


    return [
      { key: "location", label: "Location", hint: "Rating area", icon: MapPin, step: 1,
        value: zip
          ? [zip, zipPlace?.city ? `${zipPlace.city}, ${zipPlace.state}` : null, county ? `${county.name.replace(/\s+County$/i, "")} County` : null]
              .filter(Boolean)
              .join(" · ")
          : "" },
      { key: "household", label: "Household", hint: "Tax household", icon: Users, step: 1,
        value: `${Math.max(householdSize, ages.length)} ${Math.max(householdSize, ages.length) === 1 ? "person" : "people"}` },
      { key: "members", label: "Members", hint: "Date of birth · gender", icon: Heart, step: 1, value: memberSummary },
      { key: "income", label: "Income", hint: "Subsidy basis", icon: DollarSign, step: 1,
        value: `${formatCurrency(income)}/yr` },
      { key: "effective", label: "Coverage starts", hint: "Effective date", icon: ShieldCheck, step: 1,
        value: effectiveDate
          ? new Date(`${effectiveDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
          : "" },
    ];
  }, [zip, county, zipPlace, householdSize, ages, dobs, disabledFlags, tribalFlags, relationships, genders, tobacco, income, effectiveDate, budget, priorities, savedDoctors, savedRx]);

  const PAGE_SIZE = 30;

  /** One place to assemble the HealthQuote Pro quote request. */
  const buildQuoteParams = useCallback(
    (page: number, standardized: boolean, sortKey: string) => ({
      zipCode: zip,
      county: county!,
      householdSize: Math.max(householdSize, ages.length),
      annualIncome: income,
      effectiveDate,
      applicants: ages.map((age, i) => ({
        member_id: `applicant-${i + 1}`,
        age: Number.isFinite(age) ? age : 30,
        date_of_birth: dobs[i] || undefined,
        relationship: i === 0 ? ("primary" as const) : (relationships[i] ?? "dependent"),
        gender: (genders[i] ?? "Male") === "Male" ? ("male" as const) : ("female" as const),
        uses_tobacco: tobacco[i] ?? false,
        ...(pregnantFlags[i] ? { pregnant: true } : {}),
        ...(disabledFlags[i] ? { blind_or_disabled: true } : {}),
        ...(tribalFlags[i] ? { american_indian_alaska_native: true } : {}),
      })),
      ...(standardized ? { filters: { medical: { standardized_only: true } } } : {}),
      sortField: sortKey === "deductible-low" ? ("deductible" as const) : ("premium" as const),
      sortDirection: "asc" as const,
      page,
      size: PAGE_SIZE,
    }),
    [zip, county, householdSize, ages, income, effectiveDate, dobs, relationships, genders, tobacco, pregnantFlags, disabledFlags, tribalFlags],
  );

  const runSearch = useCallback(async (overrides?: { standardized?: boolean; sort?: string }) => {
    const standardized = overrides?.standardized ?? standardizedOnly;
    const sortKey = overrides?.sort ?? sortBy;
    if (!county) {
      setError("Look up your ZIP code and select a county first.");
      return;
    }
    setStep(4);
    setIsLoading(true);
    setError(null);
    setResultPage(1);
    try {
      const resolved: Place = { zipcode: zip, state: county.state, countyfips: county.fips_code };
      setPlace(resolved);

      const result = await quoteHsPlans(buildQuoteParams(1, standardized, sortKey));

      const hsPlans: HsPlan[] = result.plans ?? [];
      const subsidies = hsPlans.map(hsSubsidy).filter((v): v is number => typeof v === "number" && v > 0);
      setAptc(subsidies.length ? Math.round(subsidies[0]) : null);
      const totalCount = result.meta?.result_count ?? hsPlans.length;
      setResultCount(totalCount);
      setQuoteWarnings(result.meta?.warnings ?? []);

      // Pull every remaining page so the results list is complete, not just the first page.
      const collected: CmsPlan[] = hsPlans.map(hsPlanToCmsPlan);
      const seenIds = new Set(collected.map(p => p.id));
      let page = 1;
      const MAX_PAGES = 12;
      while (collected.length < totalCount && page < MAX_PAGES) {
        page += 1;
        const more = await quoteHsPlans(buildQuoteParams(page, standardized, sortKey)).catch(() => null);
        const morePlans: HsPlan[] = more?.plans ?? [];
        if (!morePlans.length) break;
        for (const p of morePlans.map(hsPlanToCmsPlan)) {
          if (!seenIds.has(p.id)) {
            seenIds.add(p.id);
            collected.push(p);
          }
        }
      }
      setResultPage(page);

      const foundPlans = collected;
      setPlans(foundPlans);
      setResultCount(Math.max(totalCount, foundPlans.length));


      const planIds = foundPlans.map(p => p.id);
      const [pCoverage, dCoverage] = await Promise.all([
        savedDoctors.length && planIds.length
          ? checkProviderCoverage(savedDoctors.map(d => d.npi), planIds).catch(() => [])
          : Promise.resolve([]),
        savedRx.length && planIds.length
          ? checkDrugCoverage(savedRx.map(d => d.rxcui), planIds).catch(() => [])
          : Promise.resolve([]),
      ]);
      setProviderCoverage(pCoverage);
      setDrugCoverage(dCoverage);
    } catch (e) {
      setError(
        e instanceof HealthSherpaError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Something went wrong while searching for plans. Please try again.",
      );
      setPlans([]);
      setResultCount(null);
      setQuoteWarnings([]);
    } finally {
      setIsLoading(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [county, zip, buildQuoteParams, standardizedOnly, sortBy, savedDoctors, savedRx]);

  const loadMorePlans = useCallback(async () => {
    if (!county || loadingMore) return;
    const nextPage = resultPage + 1;
    setLoadingMore(true);
    try {
      const result = await quoteHsPlans(buildQuoteParams(nextPage, standardizedOnly, sortBy));
      const hsPlans: HsPlan[] = result.plans ?? [];
      if (!hsPlans.length) {
        setResultCount(plans.length);
        return;
      }
      const mapped = hsPlans.map(hsPlanToCmsPlan);
      setPlans(prev => {
        const seen = new Set(prev.map(p => p.id));
        return [...prev, ...mapped.filter(p => !seen.has(p.id))];
      });
      setResultPage(nextPage);
      const newIds = mapped.map(p => p.id);
      const [pCoverage, dCoverage] = await Promise.all([
        savedDoctors.length ? checkProviderCoverage(savedDoctors.map(d => d.npi), newIds).catch(() => []) : Promise.resolve([]),
        savedRx.length ? checkDrugCoverage(savedRx.map(d => d.rxcui), newIds).catch(() => []) : Promise.resolve([]),
      ]);
      if (pCoverage.length) setProviderCoverage(prev => [...prev, ...pCoverage]);
      if (dCoverage.length) setDrugCoverage(prev => [...prev, ...dCoverage]);
    } catch {
      // Keep the plans already on screen; the load-more button stays available.
    } finally {
      setLoadingMore(false);
    }
  }, [county, loadingMore, resultPage, buildQuoteParams, standardizedOnly, sortBy, plans.length, savedDoctors, savedRx]);

  // Step 1 validation
  const step1Errors = useMemo(() => {

    const e: Record<string, string> = {};
    if (!/^\d{5}$/.test(zip)) e.zip = "Required";
    if (!county) e.county = "Required";
    if (!Number.isFinite(income) || income < 0) e.income = "Required";
    if (!effectiveDate) e.effectiveDate = "Required";
    if (householdSize < ages.length) e.householdSize = "Household size can't be smaller than the people listed.";
    if (householdSize > 12) e.householdSize = "Household size can't be more than 12.";
    if (dobs.some(d => !d)) e.ages = "Required";
    else if (ages.some(a => !Number.isFinite(a) || a < 0 || a > 120)) e.ages = "Check the dates of birth — each must be a real past date.";

    return e;
  }, [zip, county, income, effectiveDate, householdSize, ages, dobs]);

  const step1Valid = Object.keys(step1Errors).length === 0;
  const [triedSubmit, setTriedSubmit] = useState(false);
  const shownErrors: Record<string, string> = triedSubmit ? step1Errors : {};




  const enrichedPlans: EnrichedPlan[] = useMemo(() => {
    return plans.map(plan => {
      const doctorRows = providerCoverage.filter(c => c.plan_id === plan.id);
      const drugRows = drugCoverage.filter(c => c.plan_id === plan.id);
      const doctorsCovered = doctorRows.filter(c => c.coverage === "Covered").length;
      const drugsCovered = drugRows.filter(c => c.coverage === "Covered" || c.coverage === "GenericCovered").length;
      const doctorsTotal = savedDoctors.length;
      const drugsTotal = savedRx.length;
      const doctorPct = doctorsTotal > 0 ? Math.round((doctorsCovered / doctorsTotal) * 100) : null;
      const drugPct = drugsTotal > 0 ? Math.round((drugsCovered / drugsTotal) * 100) : null;
      return {
        plan,
        fitScore: computeFitScore(plan, budget, priorities, doctorPct, drugPct),
        deductible: findDeductible(plan),
        oopMax: findOopMax(plan),
        doctorsTotal,
        doctorsCovered,
        drugsTotal,
        drugsCovered,
      };
    });
  }, [plans, providerCoverage, drugCoverage, savedDoctors.length, savedRx.length, budget, priorities]);

  const carrierOptions = useMemo(() => Array.from(new Set(plans.map(p => p.issuer?.name).filter(Boolean))) as string[], [plans]);
  const networkOptions = useMemo(() => Array.from(new Set(plans.map(p => p.type).filter(Boolean))) as string[], [plans]);

  const results = useMemo(() => {
    let list = [...enrichedPlans];
    if (filterCarriers.length) list = list.filter(p => filterCarriers.includes(p.plan.issuer?.name ?? ""));
    if (filterTiers.length) list = list.filter(p => filterTiers.includes(p.plan.metal_level ?? ""));
    if (filterNetworks.length) list = list.filter(p => filterNetworks.includes(p.plan.type ?? ""));
    if (hsaOnly) list = list.filter(p => p.plan.hsa_eligible === true);
    if (maxPremium) list = list.filter(p => (p.plan.premium_w_credit ?? Infinity) <= Number(maxPremium));
    if (maxDeductible) list = list.filter(p => (p.deductible ?? Infinity) <= Number(maxDeductible));


    // Best value = estimated yearly cost (premium + half the deductible risk),
    // discounted by how well the plan fits the household.
    const valueScore = (p: EnrichedPlan) => {
      const yearly = (p.plan.premium_w_credit ?? 0) * 12 + (p.deductible ?? 0) * 0.5;
      return yearly / Math.max(0.35, p.fitScore / 100);
    };

    const sortFn = (a: EnrichedPlan, b: EnrichedPlan) => {
      switch (sortBy) {
        case "premium-low": return a.plan.premium_w_credit - b.plan.premium_w_credit;
        case "deductible-low": return (a.deductible ?? Infinity) - (b.deductible ?? Infinity);
        case "value": return valueScore(a) - valueScore(b);
        case "rating": return (b.plan.quality_rating?.global_rating ?? 0) - (a.plan.quality_rating?.global_rating ?? 0);
        case "doctor": return b.doctorsCovered - a.doctorsCovered;
        case "rx": return b.drugsCovered - a.drugsCovered;
        default: return b.fitScore - a.fitScore;
      }
    };

    return list.sort(sortFn);
  }, [enrichedPlans, filterCarriers, filterTiers, filterNetworks, hsaOnly, maxPremium, maxDeductible, sortBy]);

  const activeFilterCount =
    filterCarriers.length + filterTiers.length + filterNetworks.length +
    (hsaOnly ? 1 : 0) + (maxPremium ? 1 : 0) + (maxDeductible ? 1 : 0);

  const clearFilters = () => {
    setFilterCarriers([]); setFilterTiers([]); setFilterNetworks([]);
    setHsaOnly(false); setMaxPremium(""); setMaxDeductible("");
  };

  const toggleInList = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => setter(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));



  const topFitId = useMemo(() => {
    if (enrichedPlans.length === 0) return null;
    return [...enrichedPlans].sort((a, b) => b.fitScore - a.fitScore)[0]?.plan.id ?? null;
  }, [enrichedPlans]);

  const comparePlans = useMemo(() => enrichedPlans.filter(p => compareIds.includes(p.plan.id)), [enrichedPlans, compareIds]);

  const confirmedPlans = useMemo(
    () => enrichedPlans.filter(p => confirmedIds.includes(p.plan.id)),
    [enrichedPlans, confirmedIds]
  );

  const printPlans = useMemo(() => {
    if (step === 5) return confirmedPlans;
    return comparePlans.length > 0 ? comparePlans : results.slice(0, 5);
  }, [step, confirmedPlans, comparePlans, results]);

  const printLocation = useMemo(
    () => [county?.name, place?.state, zip].filter(Boolean).join(", "),
    [county?.name, place?.state, zip]
  );

  const handlePrintRecap = useCallback(() => {
    window.print();
  }, []);

  const handleConfirmSelection = useCallback(() => {
    const ids = compareIds.length > 0 ? compareIds : results.slice(0, 1).map(r => r.plan.id);
    if (ids.length === 0) return;
    setConfirmedIds(ids);
    setConfirmationRef(`LS-${Date.now().toString(36).toUpperCase().slice(-6)}`);
    setStep(5);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [compareIds, results]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  };

  const toggleExpand = (planId: string) => {
    const next = expandedId === planId ? null : planId;
    setExpandedId(next);
    if (next && !planDetails[next] && !planDetailLoading[next]) {
      setPlanDetailLoading(prev => ({ ...prev, [next]: true }));
      getPlanDetail(next)
        .then(res => {
          if (res.plan) setPlanDetails(prev => ({ ...prev, [next]: res.plan as CmsPlan }));
        })
        .catch(() => undefined)
        .finally(() => setPlanDetailLoading(prev => ({ ...prev, [next]: false })));
    }
  };

  /* ---------------------------------------------------------------- */
  /*  GUIDED QUESTION FLOW                                             */
  /* ---------------------------------------------------------------- */

  const memberLabel = useCallback(
    (i: number) => {
      if (i === 0) return "you";
      let idx = i;
      if (mix.spouse) {
        if (idx === 1) return "your spouse";
        idx -= 1;
      }
      if (idx <= mix.children) return mix.children > 1 ? `child ${idx}` : "your child";
      const otherIdx = idx - mix.children;
      return mix.others > 1 ? `other member ${otherIdx}` : "your other member";
    },
    [mix],
  );







  const setMemberCount = useCallback((raw: number) => {
    const size = Math.max(1, Math.min(8, raw));
    const fit = <T,>(arr: T[], fill: T): T[] =>
      arr.length === size
        ? arr
        : arr.length > size
          ? arr.slice(0, size)
          : [...arr, ...Array.from({ length: size - arr.length }, () => fill)];

    setDobs(prev => fit(prev, ""));
    setTobacco(prev => fit(prev, false));
    setGenders(prev => fit(prev, "Male" as const));
    setDisabledFlags(prev => fit(prev, false));
    setTribalFlags(prev => fit(prev, false));
    setPregnantFlags(prev => fit(prev, false));
    setRelationships(prev => {
      const next = fit(prev, "dependent" as HsRelationship);
      return next.map((r, i) => (i === 0 ? ("primary" as HsRelationship) : r === "primary" ? ("dependent" as HsRelationship) : r));
    });
    setHouseholdSize(prev => Math.max(prev, size));
  }, []);

  /** Applies the "who else needs coverage" mix to the member roster. */
  const applyMix = useCallback(
    (next: { spouse: boolean; children: number; others: number }) => {
      const safe = {
        spouse: next.spouse,
        children: Math.max(0, Math.min(6, next.children)),
        others: Math.max(0, Math.min(6, next.others)),
      };
      setMix(safe);
      const size = Math.min(8, 1 + (safe.spouse ? 1 : 0) + safe.children + safe.others);
      setMemberCount(size);
      setRelationships(() =>
        Array.from({ length: size }, (_, i) =>
          i === 0
            ? ("primary" as HsRelationship)
            : safe.spouse && i === 1
              ? ("spouse" as HsRelationship)
              : ("dependent" as HsRelationship),
        ),
      );
    },
    [setMemberCount],
  );



  const memberFlagButton = (
    i: number,
    label: string,
    active: boolean,
    onClick: () => void,
    title: string,
  ) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-md border px-1 text-[11.5px] font-medium leading-none transition-colors sm:text-[12px]",
        active
          ? "border-primary/40 bg-primary/[0.07] text-primary"
          : "border-input bg-background text-muted-foreground hover:border-primary/30",
      )}
    >
      {label}
    </button>
  );

  type WizardQuestion = {
    id: string;
    title: string;
    subtitle?: string;
    valid: boolean;
    optional?: boolean;
    invalidMsg?: string;
    body: React.ReactNode;
  };

  const questions = useMemo<WizardQuestion[]>(() => {
    const list: WizardQuestion[] = [];

    /* 1 — location */
    list.push({
      id: "location",
      title: "Where do you live?",
      subtitle: "Your county sets the rating area, so pricing is live and local.",
      valid: /^\d{5}$/.test(zip) && !!county,
      invalidMsg: !/^\d{5}$/.test(zip) ? "Enter a 5-digit ZIP code." : "We're still confirming your county.",
      body: (
        <div className="space-y-3" data-no-enter>
          <AddressAutocomplete
            value={address}
            onChange={next => {
              setAddress(next);
              const digits = next.replace(/\D/g, "");
              if (digits.length === 5 && /(^|\D)\d{5}(\D|$)/.test(next)) {
                setZipInstant(true);
                setZip(digits);
              }
            }}
            status={countyLoading ? "loading" : county ? "done" : "idle"}
            invalid={!!qError && !/^\d{5}$/.test(zip)}
            onResolved={place => {
              setZipPlace({ zip: place.zip, city: place.city, state: place.state });
              setZipInstant(true);
              setZip(baseZip(place.zip));
            }}
          />

          {counties.length > 1 ? (
            <div>
              <FieldLabel>Which county?</FieldLabel>
              <ChoiceTiles
                ariaLabel="County"
                columns={2}
                value={countyFips}
                onChange={v => { setCountyFips(v); requestAutoAdvance(); }}
                options={counties.map(c => ({ value: c.fips_code, label: `${c.name.replace(/\s+County$/i, "")} County`, hint: c.state }))}
              />
            </div>
          ) : (
            <div className="min-h-[6.5rem] rounded-xl border border-border/50 bg-muted/[0.18] p-3">
              {countyLoading ? (
                <div className="flex h-full min-h-[5rem] items-center gap-2 text-[13px]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/60" />
                  <span className="text-muted-foreground/70">Confirming your rating area…</span>
                </div>
              ) : counties.length === 1 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                      Address verified
                    </span>
                  </div>
                  <p className="text-[13.5px] font-semibold leading-snug text-foreground">
                    {address || `${zipPlace?.city ?? ""} ${zip}`.trim()}
                  </p>
                  <dl className="grid grid-cols-3 gap-2 border-t border-border/40 pt-2">
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">City</dt>
                      <dd className="truncate text-[12.5px] font-medium text-foreground">
                        {zipPlace?.zip === zip && zipPlace.city ? zipPlace.city : "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">County</dt>
                      <dd className="truncate text-[12.5px] font-medium text-foreground">
                        {counties[0].name.replace(/\s+County$/i, "")}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">State / ZIP</dt>
                      <dd className="truncate text-[12.5px] font-medium text-foreground">
                        {counties[0].state} {zip}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="flex h-full min-h-[5rem] items-center text-[13px] text-muted-foreground/60">
                  Start typing your address, or tap Locate to fill it in automatically.
                </div>
              )}
            </div>
          )}

        </div>
      ),

    });

    /* 2 — effective date */
    list.push({
      id: "start",
      title: "When should coverage start?",
      subtitle: "Marketplace coverage always begins on the first of a month.",
      valid: !!effectiveDate,
      body: (
        <ChoiceTiles
          ariaLabel="Coverage start date"
          columns={2}
          value={effectiveDate}
          onChange={v => { setEffectiveDate(v); requestAutoAdvance(); }}
          options={startDateOptions.map(({ value }) => {
            const parsed = new Date(`${value}T00:00:00`);
            return {
              value,
              label: parsed.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
              hint: parsed.toLocaleDateString("en-US", { year: "numeric" }),
            };
          })}
        />
      ),
    });

    /* 3 — who needs coverage (single combined screen) */
    {
      const counterRow = (
        label: string,
        hint: string,
        value: number,
        onSet: (n: number) => void,
        max: number,
      ) => (
        <div
          key={label}
          className={cn(
            "flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-colors",
            value > 0 ? "border-primary/40 bg-primary/[0.06]" : "border-border/50 bg-muted/[0.15]",
          )}
        >
          <span className="min-w-0">
            <span className={cn("block text-[13.5px] font-semibold", value > 0 ? "text-primary" : "text-foreground")}>
              {label}
            </span>
            <span className="block text-[11.5px] leading-snug text-muted-foreground/70">{hint}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSet(Math.max(0, value - 1))}
              disabled={value === 0}
              className="h-9 w-9 rounded-md border border-input text-[16px] leading-none text-muted-foreground transition-colors hover:border-primary/30 disabled:opacity-40"
              aria-label={`Remove one ${label}`}
            >−</button>
            <span className="min-w-[1.5rem] text-center text-[15px] font-bold tabular-nums text-foreground">{value}</span>
            <button
              type="button"
              onClick={() => onSet(Math.min(max, value + 1))}
              disabled={value >= max}
              className="h-9 w-9 rounded-md border border-input text-[16px] leading-none text-muted-foreground transition-colors hover:border-primary/30 disabled:opacity-40"
              aria-label={`Add one ${label}`}
            >+</button>
          </span>
        </div>
      );

      list.push({
        id: "people",
        title: "Who needs coverage?",
        subtitle: "You are always included. Add anyone else applying with you.",
        valid: true,
        body: (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/50 bg-primary/[0.08] px-4 py-3.5">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-primary">You</span>
                <span className="block text-[11.5px] leading-snug text-muted-foreground/70">
                  Primary applicant, always covered
                </span>
              </span>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            </div>

            {counterRow(
              "Spouse or partner",
              "Filing jointly on your return",
              mix.spouse ? 1 : 0,
              n => { setCoversOthers(n > 0 || mix.children > 0 || mix.others > 0); applyMix({ ...mix, spouse: n > 0 }); },
              1,
            )}

            {counterRow("Children", "Dependents under 26", mix.children,
              n => { setCoversOthers(n > 0 || mix.spouse || mix.others > 0); applyMix({ ...mix, children: n }); }, 6)}
            {counterRow("Other members", "Anyone else on your tax return", mix.others,
              n => { setCoversOthers(n > 0 || mix.spouse || mix.children > 0); applyMix({ ...mix, others: n }); }, 6)}

            <p className="pt-0.5 text-[11.5px] text-muted-foreground/70">
              {dobs.length} {dobs.length === 1 ? "person" : "people"} applying
            </p>
          </div>
        ),
      });
    }



    /* 4 — one screen per person */
    dobs.forEach((dob, i) => {
      const age = ages[i];
      list.push({
        id: `member-${i}`,
        title: i === 0 ? "Tell us about you" : `Tell us about ${memberLabel(i)}`,
        subtitle: "Date of birth and gender set the rate.",
        valid: !!dob && Number.isFinite(age) && age >= 0 && age <= 120,
        invalidMsg: "Add a date of birth to continue.",
        body: (
          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 sm:items-start" data-no-enter>
            <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">


              <div>
                <FieldLabel>Date of birth</FieldLabel>
                <DobPicker
                  value={dob}
                  maxDate={effectiveDate}
                  className="w-full px-2 text-center"
                  ariaLabel={`Date of birth for ${memberLabel(i)}`}
                  invalid={!!qError && !dob}
                  onChange={v => updateDob(i, v)}
                />
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <div className="flex h-10 items-center rounded-md border border-input p-0.5" role="group">
                  {(["Female", "Male"] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(i, g)}
                      aria-pressed={(genders[i] ?? "Male") === g}
                      className={cn(
                        "h-full flex-1 rounded-[4px] text-[12.5px] font-semibold transition-colors",
                        (genders[i] ?? "Male") === g
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground/70 hover:text-foreground",
                      )}
                    >{g}</button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>Anything else that applies?</FieldLabel>
              <div
                className={cn(
                  "grid gap-2 grid-cols-3 sm:grid-cols-2",
                  (genders[i] ?? "Male") === "Female" && "grid-cols-4 sm:grid-cols-2",
                )}
              >

                {memberFlagButton(i, "Tobacco", !!tobacco[i], () => toggleTobacco(i), "Uses tobacco")}
                {memberFlagButton(i, "Disabled", !!disabledFlags[i], () => toggleDisabled(i), "Disabled or blind")}
                {memberFlagButton(i, "Native", !!tribalFlags[i], () => toggleTribal(i), "American Indian or Alaska Native")}
                {(genders[i] ?? "Male") === "Female" &&
                  memberFlagButton(i, "Pregnant", !!pregnantFlags[i], () => togglePregnant(i), "Pregnant")}
              </div>
            </div>
            </div>

            <div>

              <span className={fieldLabelClass}>
                {i === 0 ? "Your income" : `Income for ${memberLabel(i)}`}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                  <Input
                    value={(incomePeriod === "year"
                      ? (memberIncomes[i] ?? 0)
                      : Math.round((memberIncomes[i] ?? 0) / 12)
                    ).toLocaleString("en-US")}
                    inputMode="numeric"
                    aria-label={`Income for ${memberLabel(i)}`}
                    onChange={e => {
                      const raw = Number(e.target.value.replace(/\D/g, "")) || 0;
                      setMemberIncome(i, Math.min(400000, incomePeriod === "year" ? raw : raw * 12));
                    }}
                    className="pl-9 pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground/50">
                    {incomePeriod === "year" ? "/yr" : "/mo"}
                  </span>
                </div>
                <IncomePeriodToggle value={incomePeriod} onChange={setIncomePeriod} />
              </div>
              <Slider
                className="mt-3"
                value={[Math.min(
                  incomePeriod === "year" ? (memberIncomes[i] ?? 0) : Math.round((memberIncomes[i] ?? 0) / 12),
                  incomeMax,
                )]}
                max={incomeMax}
                step={incomePeriod === "year" ? 1000 : 100}
                aria-label={`Income slider for ${memberLabel(i)}`}
                onValueChange={([v]) =>
                  setMemberIncome(i, incomePeriod === "year" ? v : v * 12)
                }
              />
            </div>



          </div>
        ),
      });
    });

    /* 5 — income recap + tax household size */
    list.push({
      id: "income",
      title: "Confirm your household income",
      subtitle: "This sets your premium tax credit. An estimate is fine — you can update it later.",
      valid: Number.isFinite(income) && income >= 0 && householdSize >= ages.length && householdSize <= 12,
      invalidMsg: "Check the income and tax household size.",
      body: (
        <div className="space-y-4" data-no-enter>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold tabular-nums text-foreground">
                  {incomePeriod === "year" ? `${formatCurrency(income)}/yr` : `${formatCurrency(Math.round(income / 12))}/mo`}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">Total household income</p>
              </div>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="How income affects your results" className="text-muted-foreground/60 transition-colors hover:text-foreground">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                    Lower income usually means a larger premium tax credit and a lower monthly cost. Monthly amounts are converted to a yearly total.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {ages.length > 1 && (
            <div className="space-y-1.5">
              {dobs.map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-[12px]">
                  <span className="truncate text-muted-foreground/80">{memberLabel(i)}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {incomePeriod === "year"
                      ? `${formatCurrency(memberIncomes[i] ?? 0)}/yr`
                      : `${formatCurrency(Math.round((memberIncomes[i] ?? 0) / 12))}/mo`}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div>
            <FieldLabel>Tax household size</FieldLabel>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHouseholdSize(prev => Math.max(ages.length, prev - 1))}
                className="h-10 w-10 rounded-md border border-input text-muted-foreground transition-colors hover:border-primary/30"
                aria-label="Decrease tax household size"
              >−</button>
              <span className="min-w-[3rem] text-center text-lg font-bold tabular-nums text-foreground">
                {householdSize}
              </span>
              <button
                type="button"
                onClick={() => setHouseholdSize(prev => Math.min(12, prev + 1))}
                className="h-10 w-10 rounded-md border border-input text-muted-foreground transition-colors hover:border-primary/30"
                aria-label="Increase tax household size"
              >+</button>
              <p className="ml-1 text-[11.5px] leading-tight text-muted-foreground/70">
                Everyone on your tax return, even if they are not applying.
              </p>
            </div>
          </div>
        </div>
      ),
    });


    /* 6 — optional doctors */
    list.push({
      id: "doctors",
      title: "Want us to check your doctors?",
      subtitle: "Optional — we'll flag which plans keep them in network.",
      valid: true,
      optional: true,
      body: (
        <div className="space-y-3" data-no-enter>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setCheckDoctors(true)}
              aria-pressed={checkDoctors}
              className={cn(
                "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[12.5px] font-medium transition-colors",
                checkDoctors
                  ? "border-primary/40 bg-primary/[0.07] text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/30",
              )}
            >
              {checkDoctors ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Stethoscope className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">Yes, check them</span>
            </button>
            <button
              type="button"
              onClick={() => setCheckDoctors(false)}
              aria-pressed={!checkDoctors}
              className={cn(
                "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[12.5px] font-medium transition-colors",
                !checkDoctors
                  ? "border-primary/40 bg-primary/[0.07] text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/30",
              )}
            >
              <span className="truncate">Skip</span>
            </button>
          </div>

          {checkDoctors && (
            <div>
              <FieldLabel>Your doctors</FieldLabel>

              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <Input value={doctorInput} onChange={e => setDoctorInput(e.target.value)} placeholder="Search by doctor name" className="pl-9" />
                {doctorSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground/40" />}
                {doctorResults.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-border/50 bg-white shadow-lg">
                    {doctorResults.map(p => (
                      <button key={p.npi} type="button" onClick={() => addDoctor(p)} className="w-full px-3 py-2 text-left text-[13px] hover:bg-muted/40">
                        <span className="font-medium text-foreground">{providerDisplayName(p)}</span>
                        <span className="ml-2 text-[11px] text-muted-foreground/60">{p.specialities?.[0] ?? p.taxonomy ?? ""}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {savedDoctors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {savedDoctors.map(d => (
                    <span key={d.npi} className="flex items-center gap-1.5 rounded-full bg-primary/[0.05] px-2.5 py-1 text-[11px] font-medium text-primary">
                      {d.name}
                      <button type="button" onClick={() => setSavedDoctors(prev => prev.filter(x => x.npi !== d.npi))} aria-label={`Remove ${d.name}`}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    });

    /* 7 — optional prescriptions */
    list.push({
      id: "prescriptions",
      title: "Any prescriptions to check?",
      subtitle: "Optional — we'll flag which plans cover them.",
      valid: true,
      optional: true,
      body: (
        <div className="space-y-3" data-no-enter>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setCheckRx(true)}
              aria-pressed={checkRx}
              className={cn(
                "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[12.5px] font-medium transition-colors",
                checkRx
                  ? "border-primary/40 bg-primary/[0.07] text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/30",
              )}
            >
              {checkRx ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Pill className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">Yes, check them</span>
            </button>
            <button
              type="button"
              onClick={() => setCheckRx(false)}
              aria-pressed={!checkRx}
              className={cn(
                "inline-flex h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[12.5px] font-medium transition-colors",
                !checkRx
                  ? "border-primary/40 bg-primary/[0.07] text-primary"
                  : "border-input bg-background text-muted-foreground hover:border-primary/30",
              )}
            >
              <span className="truncate">Skip</span>
            </button>
          </div>

          {checkRx && (
            <div>
              <FieldLabel>Your prescriptions</FieldLabel>

              <div className="relative">
                <Pill className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
                <Input value={rxInput} onChange={e => setRxInput(e.target.value)} placeholder="Search by medication name" className="pl-9" />
                {rxSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground/40" />}
                {rxResults.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-lg border border-border/50 bg-white shadow-lg">
                    {rxResults.map(d => (
                      <button key={d.rxcui} type="button" onClick={() => addRx(d)} className="w-full px-3 py-2 text-left text-[13px] text-foreground hover:bg-muted/40">
                        {d.full_name ?? d.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {savedRx.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {savedRx.map(d => (
                    <span key={d.rxcui} className="flex items-center gap-1.5 rounded-full bg-primary/[0.05] px-2.5 py-1 text-[11px] font-medium text-primary">
                      {d.name}
                      <button type="button" onClick={() => setSavedRx(prev => prev.filter(x => x.rxcui !== d.rxcui))} aria-label={`Remove ${d.name}`}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    zip, county, counties, countyFips, countyLoading, geoLoading, zipPlace, address,
    effectiveDate, startDateOptions, dobs, ages, genders, relationships,
    tobacco, disabledFlags, tribalFlags, pregnantFlags, income, displayIncome,
    incomeMax, incomePeriod, memberIncomes, householdSize, checkDoctors, checkRx,
    doctorInput, doctorResults, doctorSearching, rxInput, rxResults, rxSearching,
    savedDoctors, savedRx, qError, coversOthers, mix, applyMix, memberLabel,
  ]);

  const activeQuestion = questions[Math.min(qIndex, questions.length - 1)];

  useEffect(() => {
    if (qIndex > questions.length - 1) setQIndex(Math.max(0, questions.length - 1));
  }, [qIndex, questions.length]);

  const goNext = useCallback(() => {
    const q = questions[qIndex];
    if (!q) return;
    if (!q.valid && !q.optional) {
      setTriedSubmit(true);
      setQError(q.invalidMsg ?? "Required");
      return;
    }
    setQError(null);
    if (qIndex >= questions.length - 1) {
      setTriedSubmit(true);
      if (!step1Valid) {
        setQError("A few details are still missing — check the summary.");
        return;
      }
      setError(null);
      runSearch();
      return;
    }
    setDir(1);
    setQIndex(i => i + 1);
  }, [questions, qIndex, step1Valid, runSearch]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;

  /* ---------------------------------------------------------------- */
  /*  VOICE ASSISTANT — fills the intake on the consumer's behalf      */
  /* ---------------------------------------------------------------- */

  const voiceContext = useMemo(
    () => ({
      stepId: activeQuestion?.id ?? "location",
      stepTitle: activeQuestion?.title ?? "",
      stepNumber: qIndex + 1,
      totalSteps: questions.length,
      answers: {
        address,
        zip,
        county,
        effectiveDate,
        offeredStartDates: startDateOptions.map(o => o.value),
        coversOthers,
        mix,
        members: dobs.map((dob, i) => ({
          index: i,
          label: memberLabel(i),
          age: ages[i] ?? null,
          gender: genders[i] ?? null,
          tobacco: tobacco[i] ?? false,
        })),
        income,
        incomePeriod,
        householdSize,
      },
    }),
    [
      activeQuestion, qIndex, questions.length, address, zip, county, effectiveDate,
      startDateOptions, coversOthers, mix, dobs, ages, genders, tobacco, income,
      incomePeriod, householdSize, memberLabel,
    ],
  );

  const applyVoiceFields = useCallback(
    (fields: VoiceFields) => {
      if (typeof fields.address === "string" && fields.address.trim()) setAddress(fields.address.trim());
      if (typeof fields.zip === "string" && /^\d{5}$/.test(fields.zip.trim())) {
        setZipInstant(true);
        setZip(fields.zip.trim());
      }
      if (typeof fields.effectiveDate === "string" && startDateOptions.some(o => o.value === fields.effectiveDate)) {
        setEffectiveDate(fields.effectiveDate);
      }

      const wantsSpouse = typeof fields.spouse === "boolean" ? fields.spouse : undefined;
      const wantsChildren = Number.isFinite(fields.children) ? Number(fields.children) : undefined;
      const wantsOthers = Number.isFinite(fields.others) ? Number(fields.others) : undefined;
      if (wantsSpouse !== undefined || wantsChildren !== undefined || wantsOthers !== undefined) {
        const next = {
          spouse: wantsSpouse ?? mix.spouse,
          children: wantsChildren ?? mix.children,
          others: wantsOthers ?? mix.others,
        };
        setCoversOthers(next.spouse || next.children > 0 || next.others > 0);
        applyMix(next);
      }

      if (Array.isArray(fields.members)) {
        for (const member of fields.members) {
          const i = Number.isFinite(member?.index) ? Number(member.index) : -1;
          if (i < 0 || i > 7) continue;
          if (Number.isFinite(member.age)) {
            const age = Math.max(0, Math.min(120, Number(member.age)));
            setDobs(prev => prev.map((d, idx) => (idx === i ? dobFromAge(age) : d)));
          }
          if (member.gender === "Male" || member.gender === "Female") {
            setGenders(prev => prev.map((g, idx) => (idx === i ? member.gender! : g)));
          }
          if (typeof member.tobacco === "boolean") {
            setTobacco(prev => prev.map((t, idx) => (idx === i ? member.tobacco! : t)));
          }
        }
      }

      if (fields.incomePeriod === "year" || fields.incomePeriod === "month") setIncomePeriod(fields.incomePeriod);
      if (Number.isFinite(fields.income)) setIncome(Math.max(0, Math.round(Number(fields.income))));
      if (Number.isFinite(fields.householdSize)) {
        setHouseholdSize(Math.max(1, Math.min(12, Math.round(Number(fields.householdSize)))));
      }
    },
    [applyMix, mix, startDateOptions],
  );


  /* one-tap auto-advance on touch devices after a single choice lands */
  useEffect(() => {
    if (!advanceToken || !isMobile) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => goNextRef.current(), reduced ? 0 : 260);
    return () => window.clearTimeout(t);
  }, [advanceToken, isMobile]);

  const goBack = useCallback(() => {
    setQError(null);
    setDir(-1);
    setQIndex(i => Math.max(0, i - 1));
  }, []);

  /** Ledger rail entries: every question plus the answer captured so far. */
  const ledgerSteps = useMemo(() => {
    const rowValue = (key: string) => reviewRows.find(r => r.key === key)?.value ?? "";
    const memberValues = rowValue("members").split(", ");
    return questions.map(q => {
      let value = "";
      if (q.id === "location") value = rowValue("location");
      else if (q.id === "start") value = rowValue("effective");
      else if (q.id === "people" || q.id === "who-else") value = rowValue("household");
      else if (q.id === "income" || q.id === "household") value = rowValue("income");
      else if (q.id.startsWith("member-")) {
        const i = Number(q.id.split("-")[1]);
        value = memberValues[i] ?? "";
      } else if (q.id === "doctors") {
        value = savedDoctors.length ? `${savedDoctors.length} added` : "";
      } else if (q.id === "rx" || q.id === "prescriptions") {
        value = savedRx.length ? `${savedRx.length} added` : "";
      }
      return { id: q.id, label: stepLabelFor(q.id), value };
    });
  }, [questions, reviewRows, savedDoctors, savedRx]);

  const jumpToQuestionId = useCallback((id: string) => {
    const idx = questions.findIndex(q => q.id === id);
    if (idx < 0) return;
    setQError(null);
    setDir(idx > qIndex ? 1 : -1);
    setQIndex(idx);
  }, [questions, qIndex]);

  const jumpToKey = useCallback((key: string) => {
    const target =
      key === "location" ? "location"
      : key === "effective" ? "start"
      : key === "members" ? "member-0"
      : key === "household" || key === "income" ? "income"
      : "extras";
    const idx = questions.findIndex(q => q.id === target);
    if (idx < 0) return;
    setStep(1);
    setQError(null);
    setDir(idx > qIndex ? 1 : -1);
    setQIndex(idx);
  }, [questions, qIndex]);


  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO */}
      <section className={cn("relative pt-28 pb-12 md:pt-36 md:pb-16 overflow-hidden", step === 1 && "hidden sm:block")}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-[600px] h-[400px] rounded-full bg-primary/[0.06] blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
          <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        </div>
        <div className="section-container relative z-10">
          <ScrollFadeIn>
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-[11px] uppercase tracking-[0.3em] text-primary font-semibold mb-3">INDIVIDUAL & FAMILY</p>
              <div className="flex items-center justify-center gap-2 mb-5">
                <span className="h-px w-8 bg-primary/40" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                <span className="h-px w-8 bg-primary/40" />
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-5 leading-[1.1]">
                Health Plans for Individuals & Families
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-base md:text-lg font-light leading-relaxed mb-8">
                Answer a few quick questions and see live Marketplace plans side by side, with licensed agents ready whenever you need them.
              </p>
            </div>
          </ScrollFadeIn>
        </div>
      </section>


      {/* WIZARD */}
      <section
        className={cn(
          "py-8 sm:py-12",
          step === 1 &&
            "h-[100dvh] overflow-hidden pt-[6.25rem] pb-2 flex flex-col sm:h-auto sm:overflow-visible sm:pt-12 sm:pb-12 sm:block",
        )}
        ref={resultsRef}
      >
        <div className={cn("section-container", step === 1 && "flex w-full min-h-0 flex-1 flex-col sm:block")}>
          {step !== 1 && (
            <div className="max-w-3xl mx-auto shrink-0">
              <StepIndicator current={step} />
            </div>
          )}

          {/* STEP 1 — GUIDED QUESTIONS */}
          {step === 1 && (
            <div className="relative mx-auto mt-3 grid w-full min-h-0 flex-1 max-w-[43rem] grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-3 sm:mt-8 sm:flex-none sm:grid-rows-none sm:gap-5 lg:max-w-[62rem] lg:grid-cols-[minmax(0,1fr)]">
              <div
                className="relative flex min-h-0 flex-col"
                onKeyDown={e => {
                  if (e.key === "Enter" && !(e.target as HTMLElement).closest("[data-no-enter]")) {
                    e.preventDefault();
                    goNext();
                  }
                }}
              >
                {!intakeStarted ? (
                  <div className="flex min-h-0 flex-1 items-start overflow-y-auto py-1">
                    <SecureStartGate onStart={() => setIntakeStarted(true)} />
                  </div>
                ) : (
                  activeQuestion && (
                    <QuestionCard
                      questionId={activeQuestion.id}
                      index={qIndex}
                      total={questions.length}
                      stepLabel={stepLabelFor(activeQuestion.id)}
                      ledger={ledgerSteps}
                      onJumpStep={jumpToQuestionId}
                      direction={dir}
                      title={activeQuestion.title}
                      subtitle={activeQuestion.subtitle}
                      canNext={activeQuestion.valid || !!activeQuestion.optional}
                      nextLabel={qIndex === questions.length - 1 ? "See my plans" : "Continue"}
                      busy={isLoading}
                      error={qError ?? error}
                      onBack={qIndex > 0 ? goBack : undefined}
                      onNext={goNext}
                      onSkip={activeQuestion.optional && qIndex < questions.length - 1 ? () => { setQError(null); setDir(1); setQIndex(i => i + 1); } : undefined}
                      onSave={handleSave}
                      saving={saving}
                      saved={saved}
                    >
                      {activeQuestion.body}
                    </QuestionCard>
                  )
                )}

                {intakeStarted && (
                  <VoiceGuide
                    context={voiceContext}
                    onFields={applyVoiceFields}
                    onAdvance={() => goNextRef.current()}
                  />
                )}

                <SaveProgressDialog
                  open={lockPromptOpen}
                  onOpenChange={setLockPromptOpen}
                  onLocked={writeSnapshot}
                />


              </div>


            </div>
          )}


          {/* STEP 4 */}
          {step === 4 && (
            <div className="max-w-5xl mx-auto mt-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {isLoading
                      ? "Pulling live pricing…"
                      : resultCount !== null && resultCount > plans.length
                        ? `Showing ${results.length} of ${resultCount} plans for ${zip}`
                        : `${results.length} plan${results.length !== 1 ? "s" : ""} for ${zip}`}
                  </h2>
                  {place && !isLoading && (
                    <p className="text-[12px] text-muted-foreground/70 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                      <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {county?.name}, {place.state}</span>
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3" /> Coverage starts{" "}
                        {startDateOptions.find(o => o.value === effectiveDate)?.label ?? effectiveDate}
                      </span>
                      {aptc !== null && <span className="text-primary/80 font-medium">· Subsidy applied: {formatCurrency(aptc)}/mo</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isLoading && results.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handlePrintRecap}>
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      {comparePlans.length > 0 ? `Save ${comparePlans.length} as PDF` : "Save as PDF"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Edit answers
                  </Button>
                </div>
              </div>

              {!isLoading && quoteWarnings.length > 0 && (
                <div role="status" className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
                  <ul className="space-y-1 text-[12px] text-amber-800">
                    {quoteWarnings.map(w => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-white">
                <button
                  type="button"
                  onClick={() => setSummaryOpen(o => !o)}
                  aria-expanded={summaryOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-foreground">Your details</span>
                    <span className="block truncate text-[11px] text-muted-foreground/70">
                      {zip}{county ? ` · ${county.name}` : ""} · {dobs.length} member{dobs.length === 1 ? "" : "s"} · {formatCurrency(income)}/yr
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform", summaryOpen && "rotate-180")} />
                </button>
                {summaryOpen && (
                  <div className="px-3 pb-3">
                    <WizardSummary rows={reviewRows} inline onJump={jumpToKey} />
                  </div>
                )}
              </div>


              {error && (
                <div className="bg-destructive/[0.06] border border-destructive/20 rounded-xl p-4 text-[13px] text-destructive flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
                </div>
              )}

              {!isLoading && plans.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-white p-3 space-y-2">
                  <div
                    role="group"
                    aria-label="Filter plans"
                    className="-mx-1 flex snap-x flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide px-1 sm:mx-0 sm:flex-wrap sm:px-0"
                  >
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Filter
                    </span>
                    <FilterMenu
                      label="Metal level"
                      options={METAL_TIERS.map(t => ({ value: t, label: t }))}
                      selected={filterTiers}
                      onToggle={v => toggleInList(setFilterTiers, v)}
                      onClear={() => setFilterTiers([])}
                    />
                    <FilterMenu
                      label="Plan type"
                      options={networkOptions.map(n => ({ value: n, label: n }))}
                      selected={filterNetworks}
                      onToggle={v => toggleInList(setFilterNetworks, v)}
                      onClear={() => setFilterNetworks([])}
                    />
                    <FilterMenu
                      label="Carrier"
                      options={carrierOptions.map(c => ({ value: c, label: c }))}
                      selected={filterCarriers}
                      onToggle={v => toggleInList(setFilterCarriers, v)}
                      onClear={() => setFilterCarriers([])}
                    />
                    <RangeFilterMenu
                      label="Monthly premium"
                      value={maxPremium}
                      onChange={setMaxPremium}
                      options={[0, 100, 200, 300, 500, 750].map(v => ({
                        value: String(v),
                        label: v === 0 ? "$0 premium only" : `Under $${v}/mo`,
                      }))}
                    />
                    <RangeFilterMenu
                      label="Deductible"
                      value={maxDeductible}
                      onChange={setMaxDeductible}
                      options={[0, 1000, 2500, 5000, 7500].map(v => ({
                        value: String(v),
                        label: v === 0 ? "$0 deductible" : `Under $${v.toLocaleString()}`,
                      }))}
                    />
                    <button
                      type="button"
                      onClick={() => setHsaOnly(v => !v)}
                      aria-pressed={hsaOnly}
                      className={filterTriggerClass(hsaOnly)}
                    >
                      HSA eligible
                      {hsaOnly && <Check className="h-3.5 w-3.5" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !standardizedOnly;
                        setStandardizedOnly(next);
                        void runSearch({ standardized: next });
                      }}
                      aria-pressed={standardizedOnly}
                      title="Standardized (Easy Pricing) plans have identical benefit designs across carriers"
                      className={filterTriggerClass(standardizedOnly)}
                    >
                      Standardized plans
                      {standardizedOnly && <Check className="h-3.5 w-3.5" aria-hidden />}
                    </button>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Clear all ({activeFilterCount})
                      </button>
                    )}
                  </div>

                  <div className="h-px bg-border/30" />

                  <div
                    role="group"
                    aria-label="Sort plans"
                    className="-mx-1 flex snap-x flex-nowrap items-center gap-1.5 overflow-x-auto scrollbar-hide px-1 sm:mx-0 sm:flex-wrap sm:px-0"
                  >
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Sort by
                    </span>
                    {SORT_OPTIONS.map(o => {
                      const active = sortBy === o.key;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setSortBy(o.key);
                            // Server-side sort keeps ordering accurate beyond the loaded page.
                            if (resultCount !== null && plans.length < resultCount) {
                              void runSearch({ sort: o.key });
                            }
                          }}
                          className={filterTriggerClass(active)}
                        >
                          {o.label}
                          {active && <ArrowDown className="h-3 w-3" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}


              {isLoading && (
                <div className="space-y-3">
                  <ResultSkeleton /><ResultSkeleton /><ResultSkeleton />
                </div>
              )}

              {!isLoading && !error && plans.length === 0 && (
                <div className="bg-white border border-border/40 rounded-xl p-8 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-primary/40 mx-auto" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-foreground">No plans came back for those details</p>
                  <p className="text-xs text-muted-foreground/70">Check the county and household details, or speak with a licensed specialist.</p>
                </div>
              )}

              {!isLoading && place && results.length > 0 && (
                <div className="space-y-3 pb-24">
                  {results.map(enriched => (
                    <PlanCard
                      key={enriched.plan.id}
                      enriched={enriched}
                      isComparing={compareIds.includes(enriched.plan.id)}
                      onToggleCompare={() => toggleCompare(enriched.plan.id)}
                      onGetHelp={() => setQuoteOpen(true)}
                      expanded={expandedId === enriched.plan.id}
                      onToggleExpand={() => toggleExpand(enriched.plan.id)}
                      detail={planDetails[enriched.plan.id] ?? null}
                      detailLoading={!!planDetailLoading[enriched.plan.id]}
                      place={place}
                      isTopFit={enriched.plan.id === topFitId}
                    />
                  ))}
                </div>
              )}

              {!isLoading && resultCount !== null && plans.length < resultCount && (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => void loadMorePlans()} disabled={loadingMore}>
                    {loadingMore ? "Loading more plans…" : `Load more plans (${resultCount - plans.length} left)`}
                  </Button>
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Ready to move forward?</h3>
                    <p className="text-xs text-muted-foreground/75 leading-relaxed">
                      {compareIds.length > 0
                        ? `Submit ${compareIds.length} selected plan${compareIds.length === 1 ? "" : "s"} and a licensed agent will confirm pricing, network, and eligibility with you.`
                        : "Select the plans you like with the compare checkbox, then submit them for a licensed agent review."}
                    </p>
                  </div>
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold w-full sm:w-auto shrink-0"
                    disabled={compareIds.length === 0}
                    onClick={handleConfirmSelection}
                  >
                    Submit selection <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              )}

              <CompareDrawer
                plans={comparePlans}
                onRemove={id => setCompareIds(prev => prev.filter(x => x !== id))}
                onClear={() => setCompareIds([])}
                place={place}
              />
            </div>
          )}

          {/* STEP 5 — CONFIRMATION */}
          {step === 5 && (
            <div className="max-w-3xl mx-auto mt-8 space-y-5">
              <div className="rounded-2xl border border-primary/20 bg-white p-6 sm:p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/[0.07] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6 text-primary" strokeWidth={1.75} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your selection is confirmed</h2>
                <p className="text-sm text-muted-foreground/75 max-w-md mx-auto leading-relaxed">
                  A licensed TruEnroll agent will review your household details and the coverage you picked, then walk
                  you through enrollment. There is never a cost for this help.
                </p>
                {confirmationRef && (
                  <p className="text-[11px] uppercase tracking-[0.18em] text-primary/70 font-semibold">
                    Reference {confirmationRef}
                  </p>
                )}
              </div>

              <section className="rounded-2xl border border-border/40 bg-white p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Coverage you selected</h3>
                  {aptc !== null && (
                    <span className="text-[11px] text-primary/80 font-medium">Subsidy applied: {formatCurrency(aptc)}/mo</span>
                  )}
                </div>
                <ul className="space-y-3">
                  {confirmedPlans.map(({ plan, deductible, oopMax, fitScore }) => (
                    <li key={plan.id} className="rounded-xl border border-border/40 p-4 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <CarrierLogo name={plan.issuer?.name} className="h-9 w-9 rounded-lg" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground break-words">{plan.name}</p>
                            <p className="text-[12px] text-muted-foreground/70">
                              {[plan.issuer?.name, plan.metal_level, plan.type].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {formatCurrency(plan.premium_w_credit)}<span className="text-[11px] font-medium text-muted-foreground/70">/mo</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div><span className="text-muted-foreground/60">Deductible</span><br /><span className="font-semibold text-foreground">{deductible !== null ? formatCurrency(deductible) : "—"}</span></div>
                        <div><span className="text-muted-foreground/60">Out-of-pocket max</span><br /><span className="font-semibold text-foreground">{oopMax !== null ? formatCurrency(oopMax) : "—"}</span></div>
                        <div><span className="text-muted-foreground/60">Fit score</span><br /><span className="font-semibold text-foreground">{fitScore}%</span></div>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  Coverage starts {effectiveDate}{printLocation ? ` · ${printLocation}` : ""}. Premiums reflect live Marketplace
                  pricing and any estimated subsidy; final amounts are confirmed at enrollment.
                </p>
              </section>

              <ReviewSummary rows={reviewRows} onEdit={setStep} />

              <section className="rounded-2xl border border-border/40 bg-white p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">What happens next</h3>
                <ol className="space-y-3">
                  {[
                    { title: "A licensed agent reviews your details", desc: "We verify household size, income, and subsidy eligibility against Marketplace rules." },
                    { title: "We confirm doctors, prescriptions, and network", desc: "Your saved providers and medications are checked against each plan you selected." },
                    { title: "You complete enrollment with guidance", desc: "Once you pick a final plan, we submit the application with you and send written confirmation." },
                  ].map((s, i) => (
                    <li key={s.title} className="flex gap-3">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-primary/[0.07] text-primary text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                      <div className="space-y-0.5">
                        <p className="text-[13px] font-semibold text-foreground">{s.title}</p>
                        <p className="text-[12px] text-muted-foreground/70 leading-relaxed">{s.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold w-full sm:w-auto" onClick={() => setQuoteOpen(true)}>
                  Speak with a licensed agent <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" asChild>
                  <a href="tel:+18007581590"><Phone className="w-3.5 h-3.5 mr-1.5" /> 800.758.1590</a>
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={handlePrintRecap}>
                  <Printer className="w-4 h-4 mr-1.5" /> Save as PDF
                </Button>
                <Button variant="ghost" className="w-full sm:w-auto sm:ml-auto" onClick={() => setStep(4)}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to plans
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>



      {/* Supporting content */}
      {(
        <section className="py-8 sm:py-14">
          <div className="section-container">
            <ScrollFadeIn>
              <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                {[
                  { icon: Scale, title: "Smart Comparison", desc: "Compare plans side by side on premium, deductible, copays, network, and benefits." },
                  { icon: Heart, title: "Doctor & Rx Matching", desc: "Add your doctors and prescriptions to see which plans may best fit your needs." },
                  { icon: Users, title: "Licensed Agent Support", desc: "Get free help from a licensed agent to verify coverage, compare options, and enroll." },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-white border border-border/35 rounded-xl p-3.5 sm:p-5 flex items-start gap-3 sm:block sm:space-y-3 hover:border-primary/15 transition-colors duration-300"
                  >
                    <item.icon className="w-5 h-5 text-primary/55 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <div className="min-w-0 space-y-1 sm:space-y-0">
                      <h3 className="text-sm font-semibold text-foreground sm:mt-3">{item.title}</h3>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed sm:mt-2">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollFadeIn>
          </div>
        </section>

      )}

      {/* HELP STRIP */}
      <ScrollFadeIn>
        <section className="py-10 sm:py-12 border-y border-border/30 bg-muted/[0.12]">
          <div className="section-container">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">Not sure which plan is right?</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  Our licensed agents can review your preferences, compare plans, verify provider and prescription coverage, and guide you through enrollment — always free.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm" onClick={() => setQuoteOpen(true)}>
                  Get Help <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="outline" className="text-sm font-medium" asChild>
                  <a href="tel:+18007581590"><Phone className="w-3.5 h-3.5 mr-1.5" /> 800.758.1590</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* FAQ */}
      <ScrollFadeIn>
        <section className="py-14 sm:py-18">
          <div className="section-container max-w-3xl">
            <div className="text-center mb-8 space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground/60">About comparing health plans</p>
            </div>
            <div className="space-y-3">
              {[
                { q: "How do I compare plans?", a: "Enter your ZIP code, choose a coverage category, and provide your household income and members. The tool will look up real Marketplace plans and subsidies, and let you filter, sort, and compare them side by side." },
                { q: "Can I compare plans based on my doctor?", a: "Yes. Add your doctors in Step 2 and each result will show how many of your saved doctors are in that plan's network, based on live CMS provider directory data." },
                { q: "Can I compare plans based on my prescriptions?", a: "Yes. Add your medications in Step 2 and each plan result will display how many of your saved drugs are covered by that plan's formulary." },
                { q: "Are the prices shown final?", a: "Premiums reflect live Marketplace pricing for your household and any estimated subsidy (APTC). Your final premium and eligibility are confirmed during enrollment; a licensed agent can help verify the details." },
                { q: "What does the 'Best Overall Match' label mean?", a: "The fit score combines premium versus your stated budget, deductible, metal tier, quality rating, and how well the plan matches your saved doctors and prescriptions." },
                { q: "Does provider participation vary by plan?", a: "Yes. A doctor may be in-network for one carrier's plan but not another. Coverage badges reflect live network and formulary data from CMS. Confirm with a licensed agent before enrolling." },
                { q: "What if I'm not sure which plan is right?", a: "That's what our licensed agents are here for. They can walk you through your options, verify coverage details, and help you choose — always free and no obligation." },
              ].map((item, i) => (
                <details key={i} className="group bg-white border border-border/35 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-[14px] font-semibold text-foreground hover:bg-muted/20 transition-colors list-none">
                    <span className="pr-4">{item.q}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground/35 shrink-0 group-open:rotate-180 transition-transform duration-200" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-muted-foreground/80 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* BOTTOM CTA */}
      <ScrollFadeIn>
        <section className="pb-16 sm:pb-20">
          <div className="section-container">
            <div className="max-w-3xl mx-auto band-ink rounded-2xl p-8 sm:p-10 text-center space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="relative">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Ready to Choose a Plan?</h2>
                <p className="text-sm text-white/60 max-w-lg mx-auto leading-relaxed mt-2">
                  Our licensed agents can finalize your comparison, verify all coverage details, and guide you through enrollment — at no extra cost.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-5">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg" onClick={() => setQuoteOpen(true)}>
                    Get Personalized Help <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button variant="outline" className="bg-transparent border-ink-foreground/30 text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground font-medium" asChild>
                    <a href="tel:+18007581590"><Phone className="w-4 h-4 mr-1.5" /> 800.758.1590</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      <Footer />
      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
      <PrintableRecap rows={reviewRows} plans={printPlans} location={printLocation} aptc={aptc} />
    </div>
  );
};

export default ComparePlans;
