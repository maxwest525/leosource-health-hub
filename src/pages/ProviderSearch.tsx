import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useEnrollmentSession } from "@/hooks/use-enrollment-session";
import { dobToAge } from "@/lib/adapters/applicant-adapter";

import {
  Search, MapPin, ChevronDown, X, Loader2, Plus, Users,
  ShieldCheck, AlertCircle, ArrowRight, CheckCircle2, Building2,
  Stethoscope, ExternalLink, RotateCcw, Star,
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
  searchProviders,
  checkProviderCoverage,
  providerDisplayName,
  coverageLabel,
  formatCurrency,
  healthcareGovEnrollUrl,
  type CmsProvider,
  type CmsProviderCoverage,
  type CmsPlan,
  type Place,
} from "@/lib/cms";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type SavedProvider = {
  npi: string;
  name: string;
  specialty?: string;
  city?: string;
  state?: string;
  type: "Individual" | "Facility";
};

type PlanWithCoverage = {
  plan: CmsPlan;
  coverage: Array<{ provider: SavedProvider; status: string }>;
  inNetworkCount: number;
};

const METAL_LEVELS = ["Bronze", "Silver", "Gold", "Platinum", "Catastrophic"];

const COMMON_SPECIALTIES = [
  "Primary Care", "Cardiology", "Pediatrics", "OB/GYN",
  "Dermatology", "Orthopedics", "Neurology", "Psychiatry",
];

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
/*  NETWORK BADGE                                                      */
/* ------------------------------------------------------------------ */

function NetworkBadge({ status }: { status: string }) {
  const { tone } = coverageLabel(status);
  const label = status === "Covered" ? "In network" : status === "NotCovered" ? "Out of network" : "Not reported";
  const colors = status === "Covered"
    ? "text-emerald-700 border-emerald-200/80 bg-emerald-50/60"
    : status === "NotCovered"
    ? "text-rose-700 border-rose-200/80 bg-rose-50/60"
    : "text-amber-700 border-amber-200/80 bg-amber-50/60";
  void tone;
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
/*  PLAN CARD                                                          */
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
                  {plan.type && (
                    <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider border text-muted-foreground/60 border-border/50">
                      {plan.type}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/60 mt-0.5">{plan.issuer.name}</p>
                {deductible && (
                  <span className="text-[12px] text-muted-foreground/60">Deductible: {formatCurrency(deductible.amount)}</span>
                )}
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

            {coverage.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {coverage.map(({ provider, status }) => (
                  <div key={provider.npi} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="text-muted-foreground/80 truncate">
                      {provider.name}{provider.specialty ? ` — ${provider.specialty}` : ""}
                    </span>
                    <NetworkBadge status={status} />
                  </div>
                ))}
              </div>
            )}

            <PlanDocLinks plan={plan} />
          </div>
        </div>
      </div>

      <div className="border-t border-border/30 px-5 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 bg-muted/[0.12]">
        <p className="text-[10.5px] text-muted-foreground/50 leading-snug max-w-sm">
          Network data from the 2026 CMS Marketplace API. Networks change — confirm with the carrier before enrolling.
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
        </div>
      </div>
    </div>
  );
}

const stats = [
  { value: "Live", label: "CMS Network Data" },
  { value: "2026", label: "Plan Year" },
  { value: "20", label: "Plans Per Search" },
  { value: "Free", label: "Agent Verification" },
];

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

const ProviderSearch = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [zip, setZip] = useState("");
  const [age, setAge] = useState("40");
  const [providerType, setProviderType] = useState<"Individual" | "Facility">("Individual");
  const [selectedMetal, setSelectedMetal] = useState("");
  const [selectedIssuer, setSelectedIssuer] = useState("");
  const [inNetworkOnly, setInNetworkOnly] = useState(false);

  const [savedProviders, setSavedProviders] = useState<SavedProvider[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [planResults, setPlanResults] = useState<PlanWithCoverage[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [suggestions, setSuggestions] = useState<CmsProvider[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* Shared enrollment session: read the household context, write the doctors. */
  const { session: enrollment, ready: sessionReady, canEdit: sessionEditable, patch: patchSession } =
    useEnrollmentSession();
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!sessionReady || !enrollment || hydratedRef.current) return;
    hydratedRef.current = true;
    if (enrollment.zipCode) setZip(enrollment.zipCode);
    const primary = enrollment.members[0];
    if (primary?.dob) setAge(String(dobToAge(primary.dob)));
    if (enrollment.savedDoctors.length > 0) {
      setSavedProviders(
        enrollment.savedDoctors.map(d => ({
          npi: d.id,
          name: d.name,
          specialty: d.specialty ?? "",
          type: "Individual" as const,
        })),
      );
    }
  }, [sessionReady, enrollment]);

  useEffect(() => {
    if (!hydratedRef.current || !sessionEditable) return;
    const handle = window.setTimeout(() => {
      void patchSession({
        saved_doctors: savedProviders.map(p => ({ id: p.npi, name: p.name, specialty: p.specialty })),

      });
    }, 600);
    return () => window.clearTimeout(handle);
  }, [savedProviders, sessionEditable, patchSession]);


  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3 || zip.trim().length < 5) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const providers = await searchProviders({ query: searchQuery, zipcode: zip.trim(), type: providerType });
        setSuggestions(providers.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, zip, providerType]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addProvider = useCallback((provider: CmsProvider) => {
    const addr = provider.address ?? provider.addresses?.[0];
    setSavedProviders((prev) => {
      if (prev.some((p) => p.npi === provider.npi)) return prev;
      return [...prev, {
        npi: provider.npi,
        name: providerDisplayName(provider),
        specialty: provider.specialities?.[0] ?? provider.taxonomy,
        city: addr?.city,
        state: addr?.state,
        type: provider.type === "Facility" ? "Facility" : "Individual",
      }];
    });
    setSearchQuery("");
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  }, []);

  const removeProvider = useCallback((npi: string) => {
    setSavedProviders((prev) => prev.filter((p) => p.npi !== npi));
  }, []);

  const activeFilterCount = [selectedMetal, selectedIssuer, inNetworkOnly ? "y" : ""].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedMetal("");
    setSelectedIssuer("");
    setInNetworkOnly(false);
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
      const matchesNetwork = !inNetworkOnly || (coverage.length > 0 && coverage.every((c) => c.status === "Covered"));
      return matchesMetal && matchesIssuer && matchesNetwork;
    });
  }, [planResults, selectedMetal, selectedIssuer, inNetworkOnly]);

  const visibleResults = showAllResults ? results : results.slice(0, 8);

  const runSearch = useCallback(async () => {
    setZipError(null);
    setSearchError(null);

    if (!zip.trim()) {
      setZipError("A ZIP code is required to check provider networks.");
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
      const npis = savedProviders.map((p) => p.npi);
      let coverageData: CmsProviderCoverage[] = [];
      if (npis.length > 0 && plans.length > 0) {
        coverageData = await checkProviderCoverage(npis, plans.map((p) => p.id));
      }

      const withCoverage: PlanWithCoverage[] = plans.map((plan) => {
        const coverage = savedProviders.map((provider) => {
          const match = coverageData.find((c) => c.npi === provider.npi && c.plan_id === plan.id);
          return { provider, status: match?.coverage ?? "DataNotProvided" };
        });
        const inNetworkCount = coverage.filter((c) => c.status === "Covered").length;
        return { plan, coverage, inNetworkCount };
      });

      withCoverage.sort((a, b) => b.inNetworkCount - a.inNetworkCount);
      setPlanResults(withCoverage);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Something went wrong while checking networks.");
      setPlanResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [zip, age, savedProviders]);

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
                <Stethoscope className="w-3.5 h-3.5 text-primary/60" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary/70">Provider Network Search</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-foreground leading-[1.08]">
                Find My Doctor
              </h1>
              <p className="text-sm sm:text-[15px] text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Look up your doctor, specialist, hospital, or facility and see which real marketplace plans include them in network.
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
                  {/* Provider type toggle */}
                  <div className="flex gap-2">
                    {(["Individual", "Facility"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => { setProviderType(t); setSuggestions([]); }}
                        className={cn(
                          "text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-all duration-200",
                          providerType === t
                            ? "bg-primary/[0.06] border-primary/25 text-primary"
                            : "bg-white border-border/50 text-muted-foreground hover:border-primary/20"
                        )}
                      >
                        {t === "Individual" ? "Doctors & specialists" : "Hospitals & facilities"}
                      </button>
                    ))}
                  </div>

                  {/* Main search */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1" ref={suggestionsRef}>
                      <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                      <Input
                        ref={searchInputRef}
                        placeholder={providerType === "Individual" ? "Doctor name (e.g. Smith)" : "Hospital or facility name"}
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onKeyDown={(e) => { if (e.key === "Enter" && suggestions.length > 0) addProvider(suggestions[0]); }}
                        className="pl-10 h-12 text-sm border-border/50 bg-background/40 focus-visible:ring-primary/15 rounded-lg placeholder:text-muted-foreground/40"
                      />
                      {showSuggestions && searchQuery.length >= 3 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border/50 rounded-xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] z-50 py-1 max-h-72 overflow-y-auto">
                          {zip.trim().length < 5 && (
                            <div className="px-4 py-2.5 text-[12px] text-muted-foreground/60">Enter a ZIP code to search providers</div>
                          )}
                          {zip.trim().length >= 5 && suggestLoading && (
                            <div className="px-4 py-2.5 text-[12px] text-muted-foreground/60 flex items-center gap-2">
                              <Loader2 className="w-3 h-3 animate-spin" /> Searching…
                            </div>
                          )}
                          {zip.trim().length >= 5 && !suggestLoading && suggestions.length === 0 && (
                            <div className="px-4 py-2.5 text-[12px] text-muted-foreground/60">No matches found near {zip}</div>
                          )}
                          {!suggestLoading && suggestions.map((provider) => {
                            const addr = provider.address ?? provider.addresses?.[0];
                            return (
                              <button
                                key={provider.npi}
                                onClick={() => addProvider(provider)}
                                className="w-full text-left px-4 py-2.5 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{providerDisplayName(provider)}</p>
                                  <p className="text-[11px] text-muted-foreground/60 truncate">
                                    {(provider.specialities?.[0] ?? provider.taxonomy ?? "Provider")}
                                    {addr?.city ? ` · ${addr.city}, ${addr.state}` : ""}
                                  </p>
                                </div>
                                <Plus className="w-3.5 h-3.5 text-primary/40 shrink-0" />
                              </button>
                            );
                          })}
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

                  {/* Saved providers */}
                  {savedProviders.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">
                          My Providers ({savedProviders.length})
                        </p>
                        <button onClick={() => setSavedProviders([])} className="text-[11px] text-muted-foreground/50 hover:text-foreground underline underline-offset-2 transition-colors">
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {savedProviders.map((p) => (
                          <div key={p.npi} className="flex items-center gap-2 bg-primary/[0.05] border border-primary/10 rounded-full pl-3 pr-1.5 py-1.5">
                            {p.type === "Facility"
                              ? <Building2 className="w-3 h-3 text-primary/50" strokeWidth={1.5} />
                              : <Stethoscope className="w-3 h-3 text-primary/50" strokeWidth={1.5} />}
                            <span className="text-[12px] font-medium text-foreground">{p.name}</span>
                            {p.specialty && <span className="text-[10px] text-muted-foreground/50">{p.specialty}</span>}
                            <button onClick={() => removeProvider(p.npi)} className="w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
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

                  <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => setInNetworkOnly(!inNetworkOnly)} className={cn(
                      "flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200",
                      inNetworkOnly ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-border/50 text-muted-foreground hover:border-primary/20"
                    )}>
                      <CheckCircle2 className="w-3 h-3" /> Only plans where all my providers are in network
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

                {!hasSearched && savedProviders.length === 0 && (
                  <div className="border-t border-border/30 px-5 sm:px-7 py-4 bg-muted/[0.12]">
                    <p className="text-[10px] text-muted-foreground/45 uppercase tracking-[0.2em] font-semibold mb-2.5">Common Specialties</p>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_SPECIALTIES.map((name) => (
                        <button key={name} onClick={() => { setSearchQuery(name); setShowSuggestions(true); searchInputRef.current?.focus(); }}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/70 bg-white border border-border/40 rounded-full px-3 py-1.5 hover:border-primary/20 hover:text-primary transition-all duration-200">
                          <Stethoscope className="w-3 h-3" strokeWidth={1.5} /> {name}
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

            {!hasSearched && !isLoading && (
              <ScrollFadeIn>
                <div className="mt-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    {[
                      { icon: Stethoscope, title: "Add Your Providers", desc: "Search by name and ZIP to pull real doctors and facilities from the CMS provider directory." },
                      { icon: Star, title: "Enter Your ZIP", desc: "We use your ZIP and age to pull real premiums and subsidy-adjusted pricing." },
                      { icon: Users, title: "Agent Verification", desc: "Networks change mid-year. Our licensed agents will confirm participation at no cost." },
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
                      Provider network data is pulled live from the CMS Health Insurance Marketplace API. Carriers update directories throughout the year — always confirm with the plan before enrolling.
                    </p>
                  </div>
                </div>
              </ScrollFadeIn>
            )}

            {isLoading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary/50" /> Checking provider networks…
                </div>
                {[1, 2, 3].map(i => <ResultSkeleton key={i} />)}
              </div>
            )}

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
                        <p>
                          Premiums shown reflect any advance premium tax credit estimated for the age and ZIP entered. Network status comes directly from carrier directories filed with CMS.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">No Plans Matched</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-md mx-auto leading-relaxed">
                      Try clearing your filters or widening your provider list.
                    </p>
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
                      <RotateCcw className="w-3 h-3 mr-1.5" /> Clear Filters
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="py-12 sm:py-16 bg-muted/[0.25] border-y border-border/30">
        <div className="section-container">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Need help confirming your doctor's network?</h2>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-lg leading-relaxed">
                Our licensed agents will call the carrier, verify participation, and help you pick a plan that keeps your care team — at no cost.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button onClick={() => setQuoteOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                Get Help <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <Button variant="outline" asChild className="font-semibold">
                <a href="tel:8007581590">800.758.1590</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
};

export default ProviderSearch;
