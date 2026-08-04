import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useEnrollmentSession } from "@/hooks/use-enrollment-session";
import { dobToAge } from "@/lib/adapters/applicant-adapter";

import {
  Search, MapPin, Phone, ChevronDown, ChevronRight, X, Loader2,
  Pill, Plus, ShieldCheck, Users, AlertCircle, ArrowRight,
  CheckCircle2, Building2, Star, ExternalLink, RotateCcw,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import { cn } from "@/lib/utils";
import {
  resolvePlace,
  searchPlans,
  searchDrugs,
  checkDrugCoverage,
  coverageLabel,
  formatCurrency,
  healthcareGovEnrollUrl,
  type CmsDrug,
  type CmsPlan,
  type CmsDrugCoverage,
  type Place,
} from "@/lib/cms";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type SavedDrug = {
  rxcui: string;
  name: string;
  strength?: string;
};

type PlanWithCoverage = {
  plan: CmsPlan;
  coverage: Array<{ drug: SavedDrug; status: string }>;
  coveredCount: number;
};

/* ------------------------------------------------------------------ */
/*  REFERENCE DATA                                                     */
/* ------------------------------------------------------------------ */

const METAL_LEVELS = ["Bronze", "Silver", "Gold", "Platinum", "Catastrophic"];

/* ------------------------------------------------------------------ */
/*  DROPDOWN                                                           */
/* ------------------------------------------------------------------ */

function FilterDropdown({ label, options, value, onChange, icon: Icon, counts }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; icon?: React.ElementType;
  counts?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative flex-1 min-w-[150px]">
      <button onClick={() => setOpen(!open)} className={cn(
        "flex items-center gap-2 h-11 px-3.5 rounded-lg border text-[13px] font-medium transition-all duration-200 w-full",
        "bg-white hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/15",
        value ? "border-primary/25 text-foreground" : "border-border/70 text-muted-foreground"
      )}>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />}
        <span className="truncate flex-1 text-left">{value || label}</span>
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground/40 shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border/50 rounded-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1)] z-50 py-1 max-h-72 overflow-y-auto">
          <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-4 py-2 text-[13px] text-muted-foreground hover:bg-muted/40 transition-colors">All</button>
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={cn("w-full text-left px-4 py-2 text-[13px] transition-colors flex items-center justify-between gap-3", value === opt ? "text-primary font-semibold bg-primary/[0.04]" : "text-foreground hover:bg-muted/40")}>
              <span className="truncate">{opt}</span>
              {counts?.[opt] !== undefined && (
                <span className="text-[11px] tabular-nums text-muted-foreground/50 shrink-0">{counts[opt]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  COVERAGE BADGE                                                     */
/* ------------------------------------------------------------------ */

function CoverageBadge({ status }: { status: string }) {
  const { label, tone } = coverageLabel(status);
  const colors = tone === "good"
    ? "text-emerald-700 border-emerald-200/80 bg-emerald-50/60"
    : tone === "warn"
    ? "text-amber-700 border-amber-200/80 bg-amber-50/60"
    : "text-rose-700 border-rose-200/80 bg-rose-50/60";
  return (
    <Badge variant="outline" className={cn("text-[10px] font-semibold border shrink-0 tracking-wide", colors)}>
      {label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/*  PLAN DOCUMENT LINKS                                                */
/* ------------------------------------------------------------------ */

function PlanDocLinks({ plan }: { plan: CmsPlan }) {
  const links = [
    { label: "Benefits summary", url: plan.benefits_url },
    { label: "Brochure", url: plan.brochure_url },
    { label: "Drug formulary", url: plan.formulary_url },
    { label: "Provider directory", url: plan.network_url },
  ].filter((l) => !!l.url);

  if (links.length === 0) return null;

  return (
    <div className="mt-3 pt-2.5 border-t border-border/25 flex flex-wrap gap-x-4 gap-y-1.5">
      {links.map((l) => (
        <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
          className="text-[11px] font-medium text-primary/70 hover:text-primary flex items-center gap-1 underline underline-offset-2">
          {l.label} <ExternalLink className="w-2.5 h-2.5" />
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PLAN RESULT CARD                                                   */
/* ------------------------------------------------------------------ */

function PlanCard({ item, place, onGetHelp }: { item: PlanWithCoverage; place: Place; onGetHelp: () => void }) {
  const { plan, coverage } = item;
  const deductible = plan.deductibles?.find((d) => d.network_tier !== "Out of Network") ?? plan.deductibles?.[0];
  const showStrike = plan.premium > plan.premium_w_credit;

  return (
    <article className="group bg-white border border-border/40 rounded-xl hover:border-primary/15 hover:shadow-[0_6px_32px_-8px_rgba(8,56,112,0.07)] transition-all duration-300">
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="shrink-0 hidden sm:flex w-12 h-12 rounded-xl bg-primary/[0.05] items-center justify-center mt-0.5">
            <ShieldCheck className="w-5 h-5 text-primary/60" strokeWidth={1.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-1.5 lg:gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-foreground leading-snug">{plan.name}</h3>
                  <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider border text-primary/60 border-primary/15 bg-primary/[0.03]">
                    {plan.metal_level}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{plan.issuer.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5">
                  {deductible && (
                    <span className="text-[12px] text-muted-foreground/60">
                      Deductible: {formatCurrency(deductible.amount)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start lg:items-end gap-1 shrink-0">
                <div className="flex items-baseline gap-1.5">
                  {showStrike && (
                    <span className="text-xs text-muted-foreground/40 line-through">{formatCurrency(plan.premium, true)}</span>
                  )}
                  <span className="text-lg font-bold text-primary tabular-nums">{formatCurrency(plan.premium_w_credit, true)}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/50">per month</span>
              </div>
            </div>

            {/* Drug coverage rows */}
            {coverage.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {coverage.map(({ drug, status }) => (
                  <div key={drug.rxcui} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-muted-foreground/80 truncate">{drug.name}{drug.strength ? ` — ${drug.strength}` : ""}</span>
                    <CoverageBadge status={status} />
                  </div>
                ))}
              </div>
            )}

            <PlanDocLinks plan={plan} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 bg-muted/[0.12]">
        <p className="text-[10.5px] text-muted-foreground/50 leading-snug max-w-sm">
          Coverage and pricing based on 2026 CMS Marketplace data. <span className="underline underline-offset-2 cursor-help" title="Formularies change periodically. Confirm before enrolling.">Verify before enrolling.</span>
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-[11px] h-7 font-medium" onClick={onGetHelp}>
            Speak with a specialist
          </Button>
          <Button size="sm" className="text-[11px] h-7 font-semibold bg-primary text-primary-foreground hover:bg-primary/90" asChild>
            <a href={healthcareGovEnrollUrl(plan.id, place)} target="_blank" rel="noreferrer">
              Enroll on HealthCare.gov <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  SKELETON                                                           */
/* ------------------------------------------------------------------ */

function ResultSkeleton() {
  return (
    <div className="bg-white border border-border/30 rounded-xl p-6 animate-pulse">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-muted/50 hidden sm:block" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-muted/50 rounded w-1/3" />
          <div className="h-3 bg-muted/30 rounded w-1/4" />
          <div className="h-3 bg-muted/30 rounded w-2/5" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 bg-muted/30 rounded w-16" />
            <div className="h-5 bg-muted/30 rounded w-20" />
            <div className="h-5 bg-muted/30 rounded w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  STATS                                                              */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "Live", label: "CMS Marketplace Data" },
  { value: "2026", label: "Plan Year" },
  { value: "20", label: "Plans Per Search" },
  { value: "Free", label: "Agent Verification" },
];

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

const FindPrescriptions = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [zip, setZip] = useState("");
  const [age, setAge] = useState("40");
  const [selectedMetal, setSelectedMetal] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState("");
  const [genericOnly, setGenericOnly] = useState(false);

  // Drug list
  const [savedDrugs, setSavedDrugs] = useState<SavedDrug[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [planResults, setPlanResults] = useState<PlanWithCoverage[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<CmsDrug[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const drugs = await searchDrugs(searchQuery);
        setSuggestions(drugs.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addDrug = useCallback((drug: CmsDrug) => {
    setSavedDrugs((prev) => {
      if (prev.some((d) => d.rxcui === drug.rxcui)) return prev;
      return [...prev, { rxcui: drug.rxcui, name: drug.name, strength: drug.strength }];
    });
    setSearchQuery("");
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  }, []);

  const removeDrug = useCallback((rxcui: string) => {
    setSavedDrugs((prev) => prev.filter((d) => d.rxcui !== rxcui));
  }, []);

  const activeFilterCount = [selectedMetal, selectedIssuer, genericOnly ? "y" : ""].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedMetal("");
    setSelectedIssuer("");
    setGenericOnly(false);
  };

  const issuerOptions = useMemo(() => {
    const names = new Set(planResults.map((p) => p.plan.issuer.name));
    return Array.from(names).sort();
  }, [planResults]);

  const metalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    planResults.forEach((p) => { counts[p.plan.metal_level] = (counts[p.plan.metal_level] ?? 0) + 1; });
    return counts;
  }, [planResults]);

  const issuerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    planResults.forEach((p) => { counts[p.plan.issuer.name] = (counts[p.plan.issuer.name] ?? 0) + 1; });
    return counts;
  }, [planResults]);

  const results = useMemo(() => {
    return planResults.filter(({ plan, coverage }) => {
      const matchesMetal = !selectedMetal || plan.metal_level === selectedMetal;
      const matchesIssuer = !selectedIssuer || plan.issuer.name === selectedIssuer;
      const matchesGeneric = !genericOnly || coverage.every((c) => c.status !== "NotCovered");
      return matchesMetal && matchesIssuer && matchesGeneric;
    });
  }, [planResults, selectedMetal, selectedIssuer, genericOnly]);

  const visibleResults = showAllResults ? results : results.slice(0, 8);

  const runSearch = useCallback(async () => {
    setZipError(null);
    setSearchError(null);

    if (!zip.trim()) {
      setZipError("A ZIP code is required to search plans.");
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setShowAllResults(false);

    try {
      const resolvedPlace = await resolvePlace(zip.trim());
      if (!resolvedPlace) {
        setZipError("We couldn't find that ZIP code. Please check it and try again.");
        setPlanResults([]);
        setPlace(null);
        setIsLoading(false);
        return;
      }
      setPlace(resolvedPlace);

      const parsedAge = Number.parseInt(age, 10);
      const searchResult = await searchPlans({
        place: resolvedPlace,
        income: 50000,
        people: [{ age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : 40, aptc_eligible: true, gender: "Female", uses_tobacco: false }],
        limit: 20,
      });

      const plans = searchResult.plans ?? [];
      const rxcuis = savedDrugs.map((d) => d.rxcui);
      let coverageData: CmsDrugCoverage[] = [];
      if (rxcuis.length > 0 && plans.length > 0) {
        coverageData = await checkDrugCoverage(rxcuis, plans.map((p) => p.id));
      }

      const withCoverage: PlanWithCoverage[] = plans.map((plan) => {
        const coverage = savedDrugs.map((drug) => {
          const match = coverageData.find((c) => c.rxcui === drug.rxcui && c.plan_id === plan.id);
          return { drug, status: match?.coverage ?? "DataNotProvided" };
        });
        const coveredCount = coverage.filter((c) => c.status === "Covered" || c.status === "GenericCovered").length;
        return { plan, coverage, coveredCount };
      });

      withCoverage.sort((a, b) => b.coveredCount - a.coveredCount);
      setPlanResults(withCoverage);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Something went wrong while searching plans.");
      setPlanResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [zip, age, savedDrugs]);

  const handleQuickMed = async (name: string) => {
    try {
      const drugs = await searchDrugs(name);
      if (drugs[0]) addDrug(drugs[0]);
    } catch {
      // ignore — user can retry via search field
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ===================== HERO ===================== */}
      <section className="pt-32 sm:pt-36 pb-12 sm:pb-16 bg-gradient-to-b from-primary/[0.04] via-primary/[0.015] to-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="section-container relative">
          <ScrollFadeIn>
            <div className="max-w-2xl mx-auto text-center space-y-5">
              <div className="inline-flex items-center gap-2 bg-primary/[0.06] rounded-full px-4 py-1.5 mx-auto">
                <Pill className="w-3.5 h-3.5 text-primary/60" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary/70">Prescription Coverage Search</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-foreground leading-[1.08]">
                Find My Prescriptions
              </h1>
              <p className="text-sm sm:text-[15px] text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Check whether your medications may be covered, compare real marketplace plans, and find coverage that aligns with your prescription needs.
              </p>
            </div>
          </ScrollFadeIn>

          <ScrollFadeIn>
            <div className="max-w-2xl mx-auto mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/40">
              {stats.map((s, i) => (
                <div key={i} className="bg-white px-4 py-3.5 text-center">
                  <p className="text-lg sm:text-xl font-bold text-primary tabular-nums">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ===================== SEARCH MODULE ===================== */}
      <section className="relative z-20 -mt-2">
        <div className="section-container">
          <ScrollFadeIn>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white border border-border/40 rounded-2xl shadow-[0_12px_48px_-12px_rgba(8,56,112,0.09)] overflow-hidden">
                <div className="p-5 sm:p-7 space-y-4">
                  {/* Main search */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1" ref={suggestionsRef}>
                      <Pill className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                      <Input
                        ref={searchInputRef}
                        placeholder="Enter a medication name (e.g. Lisinopril, Metformin)"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => { if (e.key === "Enter" && suggestions.length > 0) addDrug(suggestions[0]); }}
                        className="pl-10 h-12 text-sm border-border/50 bg-background/40 focus-visible:ring-primary/15 rounded-lg placeholder:text-muted-foreground/40"
                      />
                      {/* Autocomplete */}
                      {showSuggestions && (searchQuery.length >= 2) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border/50 rounded-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] z-50 py-1 max-h-72 overflow-y-auto">
                          {suggestLoading && (
                            <div className="px-4 py-2.5 text-[12px] text-muted-foreground/60 flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                            </div>
                          )}
                          {!suggestLoading && suggestions.length === 0 && (
                            <div className="px-4 py-2.5 text-[12px] text-muted-foreground/60">No matches found</div>
                          )}
                          {!suggestLoading && suggestions.map((drug) => (
                            <button
                              key={drug.rxcui}
                              onClick={() => addDrug(drug)}
                              className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">{drug.name}</p>
                                {drug.strength && <p className="text-[11px] text-muted-foreground/60">{drug.strength}{drug.route ? ` · ${drug.route}` : ""}</p>}
                              </div>
                              <Plus className="w-3.5 h-3.5 text-primary/40 shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative sm:w-36">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                      <Input
                        placeholder="ZIP code"
                        value={zip}
                        onChange={(e) => { setZip(e.target.value); setZipError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && runSearch()}
                        className={cn(
                          "pl-10 h-12 text-sm border-border/50 bg-background/40 focus-visible:ring-primary/15 rounded-lg placeholder:text-muted-foreground/40",
                          zipError && "border-destructive/60"
                        )}
                      />
                    </div>
                    <div className="relative sm:w-28">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                      <Input
                        type="number"
                        min={0}
                        max={120}
                        placeholder="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runSearch()}
                        className="pl-10 h-12 text-sm border-border/50 bg-background/40 focus-visible:ring-primary/15 rounded-lg placeholder:text-muted-foreground/40"
                      />
                    </div>
                    <Button onClick={runSearch} disabled={isLoading} className="h-12 px-7 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold text-sm shrink-0">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin sm:mr-2" /> : <Search className="w-4 h-4 sm:mr-2" />}
                      <span className="hidden sm:inline">Search</span>
                    </Button>
                  </div>

                  {zipError && (
                    <p className="text-[12px] text-destructive flex items-center gap-1.5 -mt-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {zipError}
                    </p>
                  )}

                  {/* Saved drug pills */}
                  {savedDrugs.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">
                          My Medications ({savedDrugs.length})
                        </p>
                        <button onClick={() => setSavedDrugs([])} className="text-[11px] text-muted-foreground/50 hover:text-foreground underline underline-offset-2 transition-colors">
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {savedDrugs.map((drug) => (
                          <div key={drug.rxcui} className="flex items-center gap-2 bg-primary/[0.05] border border-primary/10 rounded-full pl-3 pr-1.5 py-1.5">
                            <Pill className="w-3 h-3 text-primary/50" strokeWidth={1.5} />
                            <span className="text-[12px] font-medium text-foreground">{drug.name}</span>
                            {drug.strength && <span className="text-[10px] text-muted-foreground/50">{drug.strength}</span>}
                            <button onClick={() => removeDrug(drug.rxcui)} className="w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                              <X className="w-2.5 h-2.5 text-primary/60" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => searchInputRef.current?.focus()}
                          className="flex items-center gap-1 text-[12px] font-medium text-primary/60 border border-dashed border-primary/20 rounded-full px-3 py-1.5 hover:bg-primary/[0.03] transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add another
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <FilterDropdown label="Metal Level" options={METAL_LEVELS} value={selectedMetal} onChange={setSelectedMetal} icon={ShieldCheck} counts={metalCounts} />
                    <FilterDropdown label="Issuer" options={issuerOptions} value={selectedIssuer} onChange={setSelectedIssuer} icon={Building2} counts={issuerCounts} />
                  </div>

                  {/* Toggle + chips */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setGenericOnly(!genericOnly)} className={cn(
                      "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200",
                      genericOnly ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-border/50 text-muted-foreground hover:border-primary/20"
                    )}>
                      <CheckCircle2 className="w-3 h-3" /> Hide plans with uncovered drugs
                    </button>

                    {activeFilterCount > 0 && (
                      <>
                        <span className="h-4 w-px bg-border/40" />
                        {selectedMetal && <button onClick={() => setSelectedMetal("")} className="flex items-center gap-1 text-[11px] font-medium bg-primary/[0.05] text-primary rounded-full px-2.5 py-1 hover:bg-primary/10 transition-colors">{selectedMetal} <X className="w-2.5 h-2.5" /></button>}
                        {selectedIssuer && <button onClick={() => setSelectedIssuer("")} className="flex items-center gap-1 text-[11px] font-medium bg-primary/[0.05] text-primary rounded-full px-2.5 py-1 hover:bg-primary/10 transition-colors">{selectedIssuer} <X className="w-2.5 h-2.5" /></button>}
                        <button onClick={clearAllFilters} className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors underline underline-offset-2">Clear all</button>
                      </>
                    )}
                  </div>
                </div>

                {/* Common medications — pre-search */}
                {!hasSearched && savedDrugs.length === 0 && (
                  <div className="border-t border-border/30 px-5 sm:px-7 py-4 bg-muted/[0.12]">
                    <p className="text-[10px] text-muted-foreground/45 uppercase tracking-[0.2em] font-semibold mb-2.5">Commonly Searched Medications</p>
                    <div className="flex flex-wrap gap-2">
                      {["Lisinopril", "Metformin", "Atorvastatin", "Levothyroxine", "Sertraline", "Omeprazole", "Albuterol", "Amoxicillin"].map((name) => (
                        <button key={name} onClick={() => handleQuickMed(name)}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/70 bg-white border border-border/40 rounded-full px-3 py-1.5 hover:border-primary/20 hover:text-primary transition-all duration-200">
                          <Pill className="w-3 h-3" strokeWidth={1.5} /> {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* ===================== RESULTS ===================== */}
      <section ref={resultsRef} className="py-10 sm:py-14 scroll-mt-24">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">

            {/* Pre-search */}
            {!hasSearched && !isLoading && (
              <ScrollFadeIn>
                <div className="mt-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { icon: Pill, title: "Add Your Medications", desc: "Look up any prescription by name to check coverage across real marketplace plans." },
                      { icon: Star, title: "Enter Your ZIP", desc: "We use your ZIP and household details to pull real premiums and subsidy estimates." },
                      { icon: Users, title: "Agent Verification", desc: "Not sure about coverage? Our licensed agents can confirm formulary details at no cost." },
                    ].map((item, i) => (
                      <div key={i} className="bg-white border border-border/35 rounded-xl p-5 space-y-3 hover:border-primary/15 transition-colors duration-300">
                        <div className="w-10 h-10 rounded-lg bg-primary/[0.05] flex items-center justify-center">
                          <item.icon className="w-5 h-5 text-primary/55" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-start gap-3 bg-primary/[0.02] border border-primary/[0.06] rounded-xl p-4">
                    <AlertCircle className="w-4 h-4 text-primary/40 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-xs text-muted-foreground/70 leading-relaxed">
                      Plan and drug coverage data is pulled live from the CMS Health Insurance Marketplace API. Prior authorization, step therapy, or quantity limits may apply. Speak with a licensed agent for plan-specific confirmation.
                    </p>
                  </div>
                </div>
              </ScrollFadeIn>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary/50" /> Searching marketplace plans…
                </div>
                {[1, 2, 3].map(i => <ResultSkeleton key={i} />)}
              </div>
            )}

            {/* Error */}
            {!isLoading && searchError && (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6 text-destructive/60" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Something Went Wrong</h3>
                <p className="text-sm text-muted-foreground/70 max-w-md mx-auto leading-relaxed">{searchError}</p>
                <Button variant="outline" size="sm" onClick={runSearch} className="text-xs">
                  <RotateCcw className="w-3 h-3 mr-1.5" /> Retry Search
                </Button>
              </div>
            )}

            {/* Results */}
            {!isLoading && !searchError && hasSearched && place && (
              <>
                {results.length > 0 ? (
                  <>
                    <p className="text-[13px] text-muted-foreground mb-4">
                      Showing <span className="font-semibold text-foreground tabular-nums">{visibleResults.length}</span> of <span className="font-semibold text-foreground tabular-nums">{results.length}</span> plan{results.length !== 1 && "s"} in {place.state} {place.zipcode}
                    </p>
                    <div className="space-y-3">
                      {visibleResults.map(item => (
                        <PlanCard key={item.plan.id} item={item} place={place} onGetHelp={() => setQuoteOpen(true)} />
                      ))}
                    </div>

                    {!showAllResults && results.length > 8 && (
                      <div className="text-center mt-6">
                        <Button variant="outline" onClick={() => setShowAllResults(true)} className="text-sm font-medium">
                          Show All {results.length} Results <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </div>
                    )}

                    <div className="mt-8 bg-primary/[0.025] border border-primary/[0.08] rounded-xl p-5 flex gap-3">
                      <ShieldCheck className="w-4 h-4 text-primary/35 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div className="text-xs text-muted-foreground/70 leading-relaxed space-y-1">
                        <p className="font-semibold text-foreground/70">About These Results</p>
                        <p>Premiums, deductibles, and drug coverage are pulled live from CMS Marketplace data for plan year 2026 and may change. For plan-specific coverage confirmation, speak with a licensed agent or contact the carrier directly before enrollment.</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
                      <Pill className="w-6 h-6 text-muted-foreground/30" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">No Matching Plans Found</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-md mx-auto leading-relaxed">
                      Try adjusting your filters, or speak with a licensed agent who can check formulary coverage across all available plans.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <Button variant="outline" size="sm" onClick={() => { clearAllFilters(); setSavedDrugs([]); setSearchQuery(""); setHasSearched(false); }} className="text-xs">Reset Search</Button>
                      <Button size="sm" className="bg-primary text-primary-foreground text-xs" asChild>
                        <a href="tel:+18007581590"><Phone className="w-3 h-3 mr-1" /> Call an Agent</a>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===================== HELP STRIP ===================== */}
      <ScrollFadeIn>
        <section className="py-10 sm:py-12 border-y border-border/30 bg-muted/[0.12]">
          <div className="section-container">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">Need help checking prescription coverage?</h3>
                <p className="text-sm text-muted-foreground/70 leading-relaxed">
                  Our licensed agents can review your full medication list, check formulary coverage across carriers, and help you choose the right plan — at no cost.
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

      {/* ===================== FAQ ===================== */}
      <ScrollFadeIn>
        <section className="py-14 sm:py-18">
          <div className="section-container max-w-3xl">
            <div className="text-center mb-8 space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground/60">About prescription coverage and marketplace plans</p>
            </div>
            <div className="space-y-3">
              {[
                { q: "How do I search for my prescriptions?", a: "Enter your medication name in the search field. As you type, live suggestions from the RxNorm drug database will appear. Click a suggestion to add it to your medication list. You can add multiple medications to compare coverage across plans." },
                { q: "Why do I need to enter a ZIP code?", a: "Plan availability, premiums, and subsidy amounts vary by county. We use your ZIP code to pull real marketplace plans and pricing available in your area." },
                { q: "Can I add multiple medications?", a: "Yes. You can build a list of all your current prescriptions. The tool will check coverage for each one against every plan returned and show you the results side by side." },
                { q: "Does coverage vary by plan?", a: "Yes. Drug coverage, tiers, copays, and restrictions vary by carrier, specific plan, and formulary year. A medication covered under one plan may not be covered — or may be treated differently — under another plan from the same carrier." },
                { q: "What does 'Generic covered' mean?", a: "It means the plan's formulary covers a generic equivalent of the medication you searched, even if the specific brand-name drug is not covered." },
                { q: "Are these results guaranteed?", a: "No. Results reflect the most recent CMS Marketplace data available. Formularies and pricing can change, and we recommend confirming coverage with a licensed agent or carrier before enrolling." },
                { q: "What if I can't find my medication?", a: "Try searching for the generic or brand-name version. Our licensed agents can also verify coverage directly with carriers — always free and no obligation." },
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

      {/* ===================== BOTTOM CTA ===================== */}
      <ScrollFadeIn>
        <section className="pb-16 sm:pb-20">
          <div className="section-container">
            <div className="max-w-3xl mx-auto band-ink rounded-2xl p-8 sm:p-10 text-center space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="relative">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Compare Plans by Prescription Coverage</h2>
                <p className="text-sm text-white/60 max-w-lg mx-auto leading-relaxed mt-2">
                  Our licensed agents can review your medications, compare formulary coverage, and help you choose the plan that best fits your needs — at no extra cost.
                </p>
                <div className="flex flex-wrap justify-center gap-3 pt-5">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-lg" onClick={() => setQuoteOpen(true)}>
                    Compare Coverage Options <ChevronRight className="w-4 h-4 ml-1" />
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
    </div>
  );
};

export default FindPrescriptions;
