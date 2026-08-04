import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search, MapPin, Phone, ChevronDown, ChevronRight, X, Loader2,
  ShieldCheck, Users, ArrowRight, ArrowLeft,
  CheckCircle2, Heart, DollarSign, Building2, Stethoscope,
  Pill, Star, BarChart3, Scale, Check, Plus, User, Clock,
  Hospital, Filter, ChevronUp, HelpCircle, FileText, Home,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";
import QuoteFormDialog from "@/components/QuoteFormDialog";
import { cn } from "@/lib/utils";
import { saveToolLead } from "@/lib/lead-engine";
import CoverageConcierge from "@/components/CoverageConcierge";
import { searchProviders } from "@/lib/services/provider-service";
import { searchMedications } from "@/lib/services/medication-service";
import { searchPlans, type PlanResult } from "@/lib/services/plan-service";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type MedicarePath = "MAPD" | "SUP";
type SavedDoctor = { name: string; specialty: string };
type SavedRx = { name: string; dosage: string };

type MedicarePlan = {
  id: string; carrier: string; name: string; planType: MedicarePath;
  networkType: string; premium: number; deductible: number;
  oopMax: number; copayPrimary: string; copaySpecialist: string;
  drugCoverage: string; dental: boolean; vision: boolean; hearing: boolean;
  starRating: number; doctorMatch: number; rxMatch: number;
  highlights: string[]; fitScore?: number; fitLabel?: string;
  // SUP-specific
  medigapPlanLetter?: string;
};

type DoctorResult = {
  id: string; name: string; specialty: string;
  practice: string; city: string; phone: string; isFacility: boolean;
};

type MedResult = {
  id: string; name: string; brandName: string | null;
  generic: boolean; category: string; dosage: string | null; form: string | null;
};

/* ================================================================== */
/*  REFERENCE DATA                                                     */
/* ================================================================== */

const MEDICARE_CARRIERS = [
  "UnitedHealthcare", "Humana", "Aetna", "Blue Cross Blue Shield",
  "Cigna", "Kaiser Permanente", "Wellcare", "Centene", "Mutual of Omaha",
];

const NETWORK_TYPES = ["HMO", "PPO", "PFFS", "SNP"];
const MEDIGAP_PLANS = ["Plan A", "Plan B", "Plan C", "Plan D", "Plan F", "Plan G", "Plan K", "Plan L", "Plan M", "Plan N"];
const BUDGET_RANGES_MAPD = ["$0/mo", "Under $25/mo", "$25–$50/mo", "$50–$100/mo", "$100+/mo"];
const BUDGET_RANGES_SUP = ["Under $100/mo", "$100–$200/mo", "$200–$300/mo", "$300+/mo"];

const PRIORITIES_MAPD = [
  "Low monthly premium", "Low drug costs", "Low out-of-pocket max",
  "Broad provider network", "Doctor compatibility", "Prescription coverage",
  "Dental included", "Vision included", "Hearing included", "Fitness benefit",
];
const PRIORITIES_SUP = [
  "Lowest premium", "Most comprehensive coverage", "No referral needed",
  "Any doctor who accepts Medicare", "Travel coverage", "Carrier reputation",
];

const SPECIALTIES = [
  "Primary Care", "Cardiology", "Dermatology", "Endocrinology",
  "Gastroenterology", "Neurology", "Oncology", "Ophthalmology",
  "Orthopedics", "Pulmonology", "Rheumatology", "Urology",
];

const SORT_OPTIONS = [
  { key: "fit", label: "Best Match" },
  { key: "premium-low", label: "Lowest Premium" },
  { key: "deductible-low", label: "Lowest Deductible" },
  { key: "oop-low", label: "Lowest Out-of-Pocket" },
  { key: "doctor", label: "Best Doctor Match" },
  { key: "rx", label: "Best Rx Match" },
  { key: "star", label: "Highest Star Rating" },
];

/* ================================================================== */
/*  FALLBACK DATA                                                      */
/* ================================================================== */

const FALLBACK_DOCTORS: DoctorResult[] = [
  { id: "fd-1", name: "Dr. Margaret Collins", specialty: "Primary Care", practice: "Senior Health Associates", city: "Tampa, FL", phone: "(813) 555-0147", isFacility: false },
  { id: "fd-2", name: "Dr. Robert Whitfield", specialty: "Cardiology", practice: "Heart & Vascular Center", city: "Tampa, FL", phone: "(813) 555-0283", isFacility: false },
  { id: "fd-3", name: "Dr. Patricia Yamamoto", specialty: "Endocrinology", practice: "Diabetes & Metabolic Care", city: "Clearwater, FL", phone: "(727) 555-0391", isFacility: false },
  { id: "fd-4", name: "Dr. William Okonkwo", specialty: "Orthopedics", practice: "Tampa Orthopedic Specialists", city: "Tampa, FL", phone: "(813) 555-0512", isFacility: false },
  { id: "fd-5", name: "Dr. Susan Park", specialty: "Ophthalmology", practice: "Clear Vision Eye Center", city: "St. Petersburg, FL", phone: "(727) 555-0629", isFacility: false },
  { id: "fd-6", name: "Dr. James Henderson", specialty: "Pulmonology", practice: "Bay Area Lung Specialists", city: "Tampa, FL", phone: "(813) 555-0734", isFacility: false },
  { id: "fd-7", name: "Dr. Eleanor Ramirez", specialty: "Rheumatology", practice: "Arthritis & Rheumatology Clinic", city: "Brandon, FL", phone: "(813) 555-0845", isFacility: false },
  { id: "fd-8", name: "Tampa General Hospital", specialty: "Hospital", practice: "Tampa General Hospital", city: "Tampa, FL", phone: "(813) 555-1100", isFacility: true },
];

const FALLBACK_MEDICATIONS: MedResult[] = [
  { id: "fm-1", name: "Lisinopril", brandName: null, generic: true, category: "Blood Pressure", dosage: "10mg", form: "Tablet" },
  { id: "fm-2", name: "Metformin", brandName: null, generic: true, category: "Diabetes", dosage: "500mg", form: "Tablet" },
  { id: "fm-3", name: "Atorvastatin", brandName: null, generic: true, category: "Cholesterol", dosage: "20mg", form: "Tablet" },
  { id: "fm-4", name: "Amlodipine", brandName: null, generic: true, category: "Blood Pressure", dosage: "5mg", form: "Tablet" },
  { id: "fm-5", name: "Omeprazole", brandName: null, generic: true, category: "Acid Reflux", dosage: "20mg", form: "Capsule" },
  { id: "fm-6", name: "Eliquis", brandName: "Eliquis", generic: false, category: "Blood Thinner", dosage: "5mg", form: "Tablet" },
  { id: "fm-7", name: "Jardiance", brandName: "Jardiance", generic: false, category: "Diabetes", dosage: "10mg", form: "Tablet" },
  { id: "fm-8", name: "Entresto", brandName: "Entresto", generic: false, category: "Heart Failure", dosage: "49/51mg", form: "Tablet" },
  { id: "fm-9", name: "Xarelto", brandName: "Xarelto", generic: false, category: "Blood Thinner", dosage: "20mg", form: "Tablet" },
  { id: "fm-10", name: "Gabapentin", brandName: null, generic: true, category: "Nerve Pain", dosage: "300mg", form: "Capsule" },
  { id: "fm-11", name: "Furosemide", brandName: null, generic: true, category: "Heart/Fluid", dosage: "40mg", form: "Tablet" },
  { id: "fm-12", name: "Warfarin", brandName: null, generic: true, category: "Blood Thinner", dosage: "5mg", form: "Tablet" },
];

const FALLBACK_MAPD_PLANS: MedicarePlan[] = [
  { id: "mp-1", carrier: "UnitedHealthcare", name: "AARP Medicare Advantage Choice (PPO)", planType: "MAPD", networkType: "PPO", premium: 0, deductible: 0, oopMax: 5900, copayPrimary: "$0", copaySpecialist: "$40", drugCoverage: "Tier 1: $0 / Tier 2: $12 / Tier 3: $47 / Tier 4: 33%", dental: true, vision: true, hearing: true, starRating: 4.5, doctorMatch: 92, rxMatch: 88, highlights: ["$0 premium", "Dental, vision & hearing", "SilverSneakers fitness", "Nationwide PPO network"], fitScore: 96, fitLabel: "Top Rated" },
  { id: "mp-2", carrier: "Humana", name: "Humana Gold Plus HMO", planType: "MAPD", networkType: "HMO", premium: 0, deductible: 0, oopMax: 4500, copayPrimary: "$0", copaySpecialist: "$35", drugCoverage: "Tier 1: $0 / Tier 2: $8 / Tier 3: $42 / Tier 4: 30%", dental: true, vision: true, hearing: true, starRating: 4.0, doctorMatch: 78, rxMatch: 94, highlights: ["$0 premium", "Low drug costs", "Over-the-counter benefit", "Meal delivery after discharge"], fitScore: 93, fitLabel: "Best Rx Coverage" },
  { id: "mp-3", carrier: "Aetna", name: "Aetna Medicare Eagle PPO", planType: "MAPD", networkType: "PPO", premium: 29, deductible: 0, oopMax: 6700, copayPrimary: "$5", copaySpecialist: "$45", drugCoverage: "Tier 1: $0 / Tier 2: $15 / Tier 3: $47 / Tier 4: 33%", dental: true, vision: true, hearing: false, starRating: 4.0, doctorMatch: 85, rxMatch: 82, highlights: ["$29/mo premium", "PPO flexibility", "Dental & vision", "Telehealth $0 copay"], fitScore: 88, fitLabel: "PPO Flexibility" },
  { id: "mp-4", carrier: "Blue Cross Blue Shield", name: "Blue Medicare Advantage HMO", planType: "MAPD", networkType: "HMO", premium: 0, deductible: 250, oopMax: 5200, copayPrimary: "$0", copaySpecialist: "$40", drugCoverage: "Tier 1: $0 / Tier 2: $10 / Tier 3: $45 / Tier 4: 33%", dental: true, vision: true, hearing: true, starRating: 4.5, doctorMatch: 88, rxMatch: 85, highlights: ["$0 premium", "4.5 star rating", "Comprehensive benefits", "Nurse hotline 24/7"], fitScore: 94, fitLabel: "Highest Rated" },
  { id: "mp-5", carrier: "Cigna", name: "Cigna True Choice Medicare (PPO)", planType: "MAPD", networkType: "PPO", premium: 45, deductible: 0, oopMax: 5500, copayPrimary: "$0", copaySpecialist: "$30", drugCoverage: "Tier 1: $0 / Tier 2: $10 / Tier 3: $40 / Tier 4: 30%", dental: true, vision: true, hearing: true, starRating: 4.0, doctorMatch: 80, rxMatch: 90, highlights: ["Low specialist copay", "All-inclusive benefits", "PPO out-of-network access", "CignaCare savings"], fitScore: 86 },
  { id: "mp-6", carrier: "Wellcare", name: "Wellcare Value Script (HMO-POS)", planType: "MAPD", networkType: "HMO", premium: 0, deductible: 0, oopMax: 4900, copayPrimary: "$0", copaySpecialist: "$40", drugCoverage: "Tier 1: $0 / Tier 2: $5 / Tier 3: $40 / Tier 4: 33%", dental: true, vision: true, hearing: true, starRating: 3.5, doctorMatch: 70, rxMatch: 92, highlights: ["$0 everything basics", "Grocery/OTC allowance", "Ride to appointments", "Lowest Tier 2 cost"], fitScore: 82, fitLabel: "Best Value" },
];

const FALLBACK_SUP_PLANS: MedicarePlan[] = [
  { id: "sp-1", carrier: "Mutual of Omaha", name: "Mutual of Omaha Medigap Plan G", planType: "SUP", medigapPlanLetter: "Plan G", networkType: "Any Medicare provider", premium: 148, deductible: 0, oopMax: 0, copayPrimary: "See Plan G", copaySpecialist: "See Plan G", drugCoverage: "Not included — separate Part D required", dental: false, vision: false, hearing: false, starRating: 0, doctorMatch: 100, rxMatch: 0, highlights: ["Most popular Medigap plan", "Any doctor who accepts Medicare", "Covers Part A & B gaps", "Foreign travel emergency"], fitScore: 95, fitLabel: "Most Popular" },
  { id: "sp-2", carrier: "Aetna", name: "Aetna Medicare Supplement Plan G", planType: "SUP", medigapPlanLetter: "Plan G", networkType: "Any Medicare provider", premium: 162, deductible: 0, oopMax: 0, copayPrimary: "See Plan G", copaySpecialist: "See Plan G", drugCoverage: "Not included — separate Part D required", dental: false, vision: false, hearing: false, starRating: 0, doctorMatch: 100, rxMatch: 0, highlights: ["Strong carrier reputation", "Nationwide acceptance", "Predictable costs", "No referrals needed"], fitScore: 90 },
  { id: "sp-3", carrier: "Cigna", name: "Cigna Medicare Supplement Plan N", planType: "SUP", medigapPlanLetter: "Plan N", networkType: "Any Medicare provider", premium: 112, deductible: 0, oopMax: 0, copayPrimary: "$20 copay", copaySpecialist: "$50 copay", drugCoverage: "Not included — separate Part D required", dental: false, vision: false, hearing: false, starRating: 0, doctorMatch: 100, rxMatch: 0, highlights: ["Lower premium option", "Small copays only", "Any Medicare doctor", "Good value coverage"], fitScore: 88, fitLabel: "Best Value" },
  { id: "sp-4", carrier: "UnitedHealthcare", name: "AARP Medicare Supplement Plan G", planType: "SUP", medigapPlanLetter: "Plan G", networkType: "Any Medicare provider", premium: 175, deductible: 0, oopMax: 0, copayPrimary: "See Plan G", copaySpecialist: "See Plan G", drugCoverage: "Not included — separate Part D required", dental: false, vision: false, hearing: false, starRating: 0, doctorMatch: 100, rxMatch: 0, highlights: ["AARP backed", "Trusted carrier", "Comprehensive gap coverage", "Telehealth discount program"], fitScore: 87 },
  { id: "sp-5", carrier: "Blue Cross Blue Shield", name: "BCBS Medicare Supplement Plan N", planType: "SUP", medigapPlanLetter: "Plan N", networkType: "Any Medicare provider", premium: 105, deductible: 0, oopMax: 0, copayPrimary: "$20 copay", copaySpecialist: "$50 copay", drugCoverage: "Not included — separate Part D required", dental: false, vision: false, hearing: false, starRating: 0, doctorMatch: 100, rxMatch: 0, highlights: ["Affordable supplement", "Small copays", "Blue Cross network trust", "No referrals needed"], fitScore: 85 },
  { id: "sp-6", carrier: "Humana", name: "Humana Medicare Supplement Plan F", planType: "SUP", medigapPlanLetter: "Plan F", networkType: "Any Medicare provider", premium: 198, deductible: 0, oopMax: 0, copayPrimary: "Covered", copaySpecialist: "Covered", drugCoverage: "Not included — separate Part D required", dental: false, vision: false, hearing: false, starRating: 0, doctorMatch: 100, rxMatch: 0, highlights: ["Most comprehensive plan", "Zero out-of-pocket", "Covers Part B deductible", "Only for those eligible before 2020"], fitScore: 82 },
];

/* ================================================================== */
/*  STEP INDICATOR                                                     */
/* ================================================================== */

const STEPS = [
  { num: 1, label: "Location", icon: MapPin },
  { num: 2, label: "Plan Type", icon: FileText },
  { num: 3, label: "Doctors", icon: Stethoscope },
  { num: 4, label: "Prescriptions", icon: Pill },
  { num: 5, label: "Preferences", icon: Heart },
  { num: 6, label: "Results", icon: BarChart3 },
];

function StepIndicator({ current }: { current: number }) {
  const active = STEPS.find(s => s.num === current) ?? STEPS[0];
  const pct = (current / STEPS.length) * 100;

  return (
    <>
      {/* Mobile: explicit "Step X of Y" header with a continuous progress rail */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Step {current} of {STEPS.length}
          </span>
          <span className="text-[12px] font-semibold text-foreground">{active.label}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={current}
          aria-label={`Step ${current} of ${STEPS.length}: ${active.label}`}
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/40"
        >
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="hidden sm:flex items-center justify-center gap-0">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center">
            <button className="flex items-center gap-1 group" disabled={step.num > current}>
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 border-2",
                current > step.num ? "bg-primary text-primary-foreground border-primary"
                  : current === step.num ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground/30 border-border/40"
              )}>
                {current > step.num ? <Check className="w-3 h-3" /> : step.num}
              </div>
              <span className={cn(
                "text-[9px] font-medium hidden lg:inline transition-colors",
                current >= step.num ? "text-foreground" : "text-muted-foreground/30"
              )}>{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("w-4 lg:w-8 h-px mx-1 lg:mx-2 transition-colors", current > step.num ? "bg-primary" : "bg-border/30")} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ================================================================== */
/*  HELPERS                                                            */
/* ================================================================== */

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

function StarRating({ rating }: { rating: number }) {
  if (rating <= 0) return null;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn("w-3 h-3", s <= Math.floor(rating) ? "text-amber-400" : s - 0.5 <= rating ? "text-amber-300" : "text-muted/30")}
          fill={s <= rating ? "currentColor" : "none"} strokeWidth={1.5} />
      ))}
      <span className="text-[10px] font-semibold text-muted-foreground/60 ml-0.5 tabular-nums">{rating.toFixed(1)}</span>
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

/* ================================================================== */
/*  COMPARE DRAWER                                                     */
/* ================================================================== */

function CompareDrawer({ plans, onRemove, onClear }: { plans: MedicarePlan[]; onRemove: (id: string) => void; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  if (plans.length === 0) return null;

  const rows: { label: string; getValue: (p: MedicarePlan) => string }[] = [
    { label: "Carrier", getValue: p => p.carrier },
    { label: "Plan Type", getValue: p => p.planType === "MAPD" ? "Medicare Advantage (MAPD)" : `Medigap ${p.medigapPlanLetter || ""}` },
    { label: "Network", getValue: p => p.networkType },
    { label: "Monthly Premium", getValue: p => `$${p.premium}/mo` },
    { label: "Deductible", getValue: p => p.deductible > 0 ? `$${p.deductible.toLocaleString()}` : "$0" },
    { label: "Max Out-of-Pocket", getValue: p => p.oopMax > 0 ? `$${p.oopMax.toLocaleString()}` : "N/A" },
    { label: "Primary Care", getValue: p => p.copayPrimary },
    { label: "Specialist", getValue: p => p.copaySpecialist },
    { label: "Drug Coverage", getValue: p => p.drugCoverage.substring(0, 40) + (p.drugCoverage.length > 40 ? "…" : "") },
    { label: "Doctor Match", getValue: p => `${p.doctorMatch}%` },
    { label: "Star Rating", getValue: p => p.starRating > 0 ? `${p.starRating} / 5` : "N/A" },
    { label: "Dental", getValue: p => p.dental ? "Included" : "—" },
    { label: "Vision", getValue: p => p.vision ? "Included" : "—" },
    { label: "Hearing", getValue: p => p.hearing ? "Included" : "—" },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/50 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Scale className="w-4 h-4 text-primary/60" />
            <span className="text-sm font-semibold text-foreground">{plans.length} plan{plans.length !== 1 && "s"} selected</span>
            <div className="hidden sm:flex gap-1.5">
              {plans.map(p => (
                <span key={p.id} className="text-[10px] font-medium bg-primary/[0.05] text-primary rounded-full px-2 py-0.5 flex items-center gap-1">
                  {p.carrier.split(" ")[0]} <button onClick={() => onRemove(p.id)}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={onClear}>Clear</Button>
            <Button size="sm" className="text-xs bg-primary text-primary-foreground font-semibold" onClick={() => setOpen(!open)} disabled={plans.length < 2}>
              Compare Side by Side <BarChart3 className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-border/30 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-base font-bold text-foreground">Medicare Plan Comparison</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(85vh-60px)]">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-muted/20 text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider w-40" />
                    {plans.map(p => (
                      <th key={p.id} className="px-4 py-3 text-center min-w-[180px]">
                        <p className="text-[10px] text-muted-foreground/50 font-medium">{p.carrier}</p>
                        <p className="text-[13px] font-semibold text-foreground mt-0.5 leading-snug">{p.name}</p>
                        {p.fitLabel && <p className="text-[10px] text-accent font-semibold mt-1 flex items-center justify-center gap-0.5"><Star className="w-2.5 h-2.5" fill="currentColor" />{p.fitLabel}</p>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-muted/[0.06]" : ""}>
                      <td className="sticky left-0 bg-inherit px-5 py-2.5 text-[12px] font-medium text-muted-foreground/70">{row.label}</td>
                      {plans.map(p => {
                        const val = row.getValue(p);
                        const isBest = row.label === "Monthly Premium" ? p.premium === Math.min(...plans.map(x => x.premium))
                          : row.label === "Max Out-of-Pocket" && p.oopMax > 0 ? p.oopMax === Math.min(...plans.filter(x => x.oopMax > 0).map(x => x.oopMax))
                          : row.label === "Doctor Match" ? p.doctorMatch === Math.max(...plans.map(x => x.doctorMatch))
                          : row.label === "Star Rating" ? p.starRating === Math.max(...plans.map(x => x.starRating))
                          : false;
                        return (
                          <td key={p.id} className={cn("px-4 py-2.5 text-center text-[13px]", isBest ? "font-bold text-primary" : "text-foreground")}>
                            {val}
                            {isBest && <span className="block text-[9px] text-primary/50 font-medium mt-0.5">Best</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-border/30 px-6 py-3 flex justify-between items-center">
              <p className="text-[11px] text-muted-foreground/50">Based on available Medicare plan data. Verify details before enrolling.</p>
              <Button size="sm" className="bg-primary text-primary-foreground text-xs font-semibold" asChild>
                <a href="tel:+18007581590"><Phone className="w-3 h-3 mr-1" /> Speak to a Licensed Agent</a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */

const FindMAPD = () => {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [leadSaved, setLeadSaved] = useState(false);
  const [filtersUsedCount, setFiltersUsedCount] = useState(0);
  const [helpRequested, setHelpRequested] = useState(false);

  const [step, setStep] = useState(1);
  const cardRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollToCard = () => setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  // Step 1 — Location (the hero panel can hand off a ZIP via ?zip=)
  const [zip, setZip] = useState(() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("zip") ?? "";
    return /^\d{5}$/.test(value) ? value : "";
  });
  const [county, setCounty] = useState("");

  // Step 2 — Plan type
  const [medicarePath, setMedicarePath] = useState<MedicarePath | "">("");

  // Step 3 — Doctors
  const [doctorQuery, setDoctorQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [savedDoctors, setSavedDoctors] = useState<SavedDoctor[]>([]);
  const [doctorResults, setDoctorResults] = useState<DoctorResult[]>([]);
  const [doctorSearching, setDoctorSearching] = useState(false);

  useEffect(() => {
    if (!doctorQuery && !specialtyFilter) { setDoctorResults([]); return; }
    const timeout = setTimeout(async () => {
      setDoctorSearching(true);
      try {
        const results = await searchProviders({ query: doctorQuery || "", specialty: specialtyFilter || undefined, zip: zip || undefined, limit: 20 });
        if (results.length > 0) {
          setDoctorResults(results.map(r => ({ id: r.id, name: r.displayName, specialty: r.specialty || "General", practice: r.practiceName || "", city: r.city && r.state ? `${r.city}, ${r.state}` : r.city || "", phone: r.phone || "", isFacility: r.isFacility })));
        } else {
          setDoctorResults(FALLBACK_DOCTORS.filter(d => {
            const mq = !doctorQuery || d.name.toLowerCase().includes(doctorQuery.toLowerCase()) || d.practice.toLowerCase().includes(doctorQuery.toLowerCase());
            const ms = !specialtyFilter || d.specialty === specialtyFilter;
            return mq && ms;
          }));
        }
      } catch {
        setDoctorResults(FALLBACK_DOCTORS.filter(d => {
          const mq = !doctorQuery || d.name.toLowerCase().includes(doctorQuery.toLowerCase());
          const ms = !specialtyFilter || d.specialty === specialtyFilter;
          return mq && ms;
        }));
      } finally { setDoctorSearching(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [doctorQuery, specialtyFilter, zip]);

  const addDoctor = (name: string, specialty: string) => {
    if (!savedDoctors.find(d => d.name === name)) setSavedDoctors(p => [...p, { name, specialty }]);
  };

  // Step 4 — Prescriptions
  const [rxQuery, setRxQuery] = useState("");
  const [savedRx, setSavedRx] = useState<SavedRx[]>([]);
  const [rxResults, setRxResults] = useState<MedResult[]>([]);
  const [rxSearching, setRxSearching] = useState(false);

  useEffect(() => {
    if (!rxQuery) { setRxResults([]); return; }
    const timeout = setTimeout(async () => {
      setRxSearching(true);
      try {
        const results = await searchMedications({ query: rxQuery, limit: 20 });
        if (results.length > 0) {
          setRxResults(results.map(r => ({ id: r.id, name: r.isGeneric ? r.genericName : (r.brandName || r.genericName), brandName: r.brandName, generic: r.isGeneric, category: r.therapeuticClass || "General", dosage: r.dosage, form: r.form })));
        } else {
          setRxResults(FALLBACK_MEDICATIONS.filter(m => m.name.toLowerCase().includes(rxQuery.toLowerCase())));
        }
      } catch {
        setRxResults(FALLBACK_MEDICATIONS.filter(m => m.name.toLowerCase().includes(rxQuery.toLowerCase())));
      } finally { setRxSearching(false); }
    }, 300);
    return () => clearTimeout(timeout);
  }, [rxQuery]);

  const addRx = (name: string, dosage: string) => {
    if (!savedRx.find(r => r.name === name && r.dosage === dosage)) setSavedRx(p => [...p, { name, dosage }]);
  };

  // Step 5 — Preferences
  const [budget, setBudget] = useState("");
  const [preferredCarrier, setPreferredCarrier] = useState("");
  const [preferredNetwork, setPreferredNetwork] = useState("");
  const [priorities, setPriorities] = useState<string[]>([]);
  const [pharmacyPref, setPharmacyPref] = useState("");
  const togglePriority = (p: string) => setPriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  // Step 6 — Results
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState("fit");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadedPlans, setLoadedPlans] = useState<MedicarePlan[]>([]);

  const saveLead = useCallback(async (cta?: string) => {
    if (leadSaved) return;
    setLeadSaved(true);
    try {
      await saveToolLead({
        sessionId, zip, category: `Medicare - ${medicarePath}`, budget,
        carrierPref: preferredCarrier, networkPref: preferredNetwork,
        priorities, doctors: savedDoctors, prescriptions: savedRx,
        plansViewed: loadedPlans.filter(p => expandedId === p.id || compareIds.includes(p.id)).map(p => ({
          name: p.name, carrier: p.carrier, metalTier: p.planType, networkType: p.networkType,
          premium: p.premium, wasCompared: compareIds.includes(p.id),
          fitLabel: p.fitLabel, doctorMatch: p.doctorMatch, rxMatch: p.rxMatch,
        })),
        helpRequested, contactSubmitted: !!cta, finalCta: cta, highestStep: step,
        filtersUsed: filtersUsedCount, householdSize: 1,
      });
    } catch (err) { console.error("Error saving lead:", err); }
  }, [leadSaved, sessionId, zip, medicarePath, budget, preferredCarrier, preferredNetwork, priorities, savedDoctors, savedRx, expandedId, compareIds, helpRequested, step, filtersUsedCount, loadedPlans]);

  const handleGetHelp = useCallback((cta?: string) => {
    setHelpRequested(true);
    saveLead(cta || "get_help");
    setQuoteOpen(true);
  }, [saveLead]);

  const goToResults = useCallback(async () => {
    setStep(6);
    setIsLoading(true);
    scrollToCard();
    try {
      const serviceResults = await searchPlans({ category: "medicare", limit: 30 });
      if (serviceResults.length > 0) {
        setLoadedPlans(serviceResults.map(p => ({
          id: p.id, carrier: p.carrierName, name: p.planName, planType: medicarePath || "MAPD",
          networkType: p.networkType || "HMO", premium: Number(p.premiumIndividual) || 0,
          deductible: Number(p.deductibleIndividual) || 0, oopMax: Number(p.oopMaxIndividual) || 0,
          copayPrimary: p.copayPcp != null ? `$${p.copayPcp}` : "$0", copaySpecialist: p.copaySpecialist != null ? `$${p.copaySpecialist}` : "$40",
          drugCoverage: "See plan details", dental: p.includesDental, vision: p.includesVision,
          hearing: false, starRating: 4.0, doctorMatch: 80, rxMatch: 75, highlights: [], fitScore: 80,
        })));
      } else {
        setLoadedPlans(medicarePath === "SUP" ? FALLBACK_SUP_PLANS : FALLBACK_MAPD_PLANS);
      }
    } catch {
      setLoadedPlans(medicarePath === "SUP" ? FALLBACK_SUP_PLANS : FALLBACK_MAPD_PLANS);
    } finally {
      setIsLoading(false);
      saveLead("view_results");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [medicarePath, saveLead]);

  const results = useMemo(() => {
    let plans = [...loadedPlans];
    if (filterCarrier) plans = plans.filter(p => p.carrier === filterCarrier);
    if (filterNetwork) plans = plans.filter(p => p.networkType === filterNetwork);
    const sortFn = (a: MedicarePlan, b: MedicarePlan) => {
      switch (sortBy) {
        case "premium-low": return a.premium - b.premium;
        case "deductible-low": return a.deductible - b.deductible;
        case "oop-low": return a.oopMax - b.oopMax;
        case "doctor": return b.doctorMatch - a.doctorMatch;
        case "rx": return b.rxMatch - a.rxMatch;
        case "star": return b.starRating - a.starRating;
        default: return (b.fitScore || 0) - (a.fitScore || 0);
      }
    };
    return plans.sort(sortFn);
  }, [loadedPlans, filterCarrier, filterNetwork, sortBy]);

  const comparePlans = useMemo(() => loadedPlans.filter(p => compareIds.includes(p.id)), [loadedPlans, compareIds]);
  const toggleCompare = (id: string) => setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  const goStep = (s: number) => { setStep(s); scrollToCard(); };

  const currentBudgetRanges = medicarePath === "SUP" ? BUDGET_RANGES_SUP : BUDGET_RANGES_MAPD;
  const currentPriorities = medicarePath === "SUP" ? PRIORITIES_SUP : PRIORITIES_MAPD;
  const currentNetworkTypes = medicarePath === "SUP" ? ["Any Medicare provider"] : NETWORK_TYPES;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO */}
      <section className="pt-24 sm:pt-36 pb-4 sm:pb-12 bg-gradient-to-b from-primary/[0.04] via-primary/[0.015] to-background relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.012]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="section-container relative">
          <ScrollFadeIn>
            <div className="max-w-2xl mx-auto text-center space-y-2 sm:space-y-4">
              <div className="hidden sm:inline-flex items-center gap-2 bg-primary/[0.06] rounded-full px-4 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary/60" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-primary/70">Medicare Plan Finder</span>
              </div>
              <h1 className="text-2xl sm:text-4xl md:text-[2.75rem] font-bold tracking-tight text-foreground leading-[1.08]" style={{ textWrap: "balance" }}>
                Find My MAPD / Supplement
              </h1>
              <p className={cn(
                "text-sm sm:text-[15px] text-muted-foreground max-w-lg mx-auto leading-relaxed",
                step <= 5 && "hidden sm:block",
              )} style={{ textWrap: "pretty" }}>
                Search Medicare Advantage Prescription Drug and Medicare Supplement plans based on your location, prescriptions, doctors, and coverage needs.
              </p>
              <div className={cn(
                "grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30 rounded-xl overflow-hidden border border-border/40 max-w-xl mx-auto mt-6",
                step <= 5 && "hidden sm:grid",
              )}>
                {[
                  { icon: MapPin, label: "Location-Based" },
                  { icon: Stethoscope, label: "Doctor Search" },
                  { icon: Pill, label: "Drug Matching" },
                  { icon: Users, label: "Licensed Help" },
                ].map((item, i) => (
                  <div key={i} className="bg-white px-3 py-3 text-center flex flex-col items-center gap-1.5">
                    <item.icon className="w-4 h-4 text-primary/45" strokeWidth={1.5} />
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollFadeIn>
        </div>
      </section>

      {/* GUIDED TOOL */}
      <section className="relative z-20 -mt-2 scroll-mt-24" ref={cardRef}>
        <div className="section-container">
          <div className="max-w-3xl mx-auto">

            {step <= 5 && (
              <ScrollFadeIn>
                <div className="bg-white border border-border/40 rounded-2xl shadow-[0_12px_48px_-12px_rgba(8,56,112,0.09)] overflow-hidden">
                  <div className="px-5 sm:px-7 pt-5 pb-4 border-b border-border/20">
                    <StepIndicator current={step} />
                    {/* Profile summary strip */}
                    {(zip || savedDoctors.length > 0 || savedRx.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2">
                        {zip && <span className="text-[10px] font-medium bg-primary/[0.04] text-primary/60 border border-primary/[0.08] rounded-full px-2.5 py-1 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{zip}</span>}
                        {medicarePath && <span className="text-[10px] font-medium bg-primary/[0.04] text-primary/60 border border-primary/[0.08] rounded-full px-2.5 py-1">{medicarePath === "MAPD" ? "Medicare Advantage" : "Supplement"}</span>}
                        {savedDoctors.map((d, i) => <span key={i} className="text-[10px] font-medium bg-primary/[0.04] text-primary/60 border border-primary/[0.08] rounded-full px-2.5 py-1 flex items-center gap-1"><Stethoscope className="w-2.5 h-2.5" />{d.name}</span>)}
                        {savedRx.map((r, i) => <span key={i} className="text-[10px] font-medium bg-accent/10 text-accent-foreground/60 border border-accent/15 rounded-full px-2.5 py-1 flex items-center gap-1"><Pill className="w-2.5 h-2.5" />{r.name}</span>)}
                      </div>
                    )}
                  </div>

                  <div className="p-5 sm:p-7">

                    {/* ── STEP 1: Location ── */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-base font-bold text-foreground mb-1">Where do you need Medicare coverage?</h2>
                          <p className="text-xs text-muted-foreground/60 mb-4">Medicare plan availability varies by county. Enter your ZIP code so we can show you plans in your area.</p>
                          <div className="grid sm:grid-cols-2 gap-3 max-w-md">
                            <div className="relative">
                              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                              <Input placeholder="ZIP code" value={zip} onChange={e => setZip(e.target.value)} className="pl-10 h-12 text-sm border-border/50 bg-background/40 rounded-lg" />
                            </div>
                            <Input placeholder="County (optional)" value={county} onChange={e => setCounty(e.target.value)} className="h-12 text-sm border-border/50 bg-background/40 rounded-lg" />
                          </div>
                        </div>
                        <div className="bg-muted/20 rounded-lg p-3 flex gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-primary/30 shrink-0 mt-0.5" strokeWidth={1.5} />
                          <p className="text-[11px] text-muted-foreground/60 leading-relaxed">Medicare plans are specific to your county. Your ZIP code helps us determine which plans are available where you live.</p>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button onClick={() => goStep(2)} disabled={!zip} className="bg-primary text-primary-foreground font-semibold">
                            Continue <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 2: Plan Type ── */}
                    {step === 2 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-base font-bold text-foreground mb-1">What type of Medicare plan are you looking for?</h2>
                          <p className="text-xs text-muted-foreground/60 mb-5">Choose the path that best fits your needs. Not sure? Each option includes a brief explanation.</p>

                          <div className="grid sm:grid-cols-2 gap-3">
                            <button onClick={() => setMedicarePath("MAPD")}
                              className={cn("p-5 rounded-xl border text-left transition-all duration-200 active:scale-[0.98]",
                                medicarePath === "MAPD" ? "border-primary/30 bg-primary/[0.04] shadow-sm" : "border-border/50 hover:border-primary/15 bg-white"
                              )}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/[0.06] flex items-center justify-center">
                                  <Building2 className="w-4 h-4 text-primary/60" strokeWidth={1.5} />
                                </div>
                                <Badge className={cn("text-[9px] font-bold uppercase tracking-wider", medicarePath === "MAPD" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 text-muted-foreground/50 border-border/30")}>MAPD</Badge>
                              </div>
                              <p className="text-sm font-semibold text-foreground leading-snug">Medicare Advantage + Prescription Drug</p>
                              <p className="text-[11px] text-muted-foreground/60 mt-1.5 leading-relaxed">Combines hospital, medical, and prescription drug coverage into one plan. Often includes dental, vision, hearing, and fitness benefits.</p>
                            </button>

                            <button onClick={() => setMedicarePath("SUP")}
                              className={cn("p-5 rounded-xl border text-left transition-all duration-200 active:scale-[0.98]",
                                medicarePath === "SUP" ? "border-primary/30 bg-primary/[0.04] shadow-sm" : "border-border/50 hover:border-primary/15 bg-white"
                              )}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/[0.06] flex items-center justify-center">
                                  <ShieldCheck className="w-4 h-4 text-primary/60" strokeWidth={1.5} />
                                </div>
                                <Badge className={cn("text-[9px] font-bold uppercase tracking-wider", medicarePath === "SUP" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30 text-muted-foreground/50 border-border/30")}>SUP</Badge>
                              </div>
                              <p className="text-sm font-semibold text-foreground leading-snug">Medicare Supplement (Medigap)</p>
                              <p className="text-[11px] text-muted-foreground/60 mt-1.5 leading-relaxed">Helps cover costs Original Medicare doesn't pay — like copays, coinsurance, and deductibles. Prescription drug coverage is separate (Part D).</p>
                            </button>
                          </div>

                          {medicarePath === "SUP" && (
                            <div className="mt-4 bg-amber-50/60 border border-amber-200/40 rounded-lg p-3 flex gap-2">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                              <p className="text-[11px] text-amber-800/80 leading-relaxed">Medicare Supplement plans do not include prescription drug coverage. You may need a separate Part D plan for medications.</p>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button variant="outline" onClick={() => goStep(1)} className="font-medium"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                          <Button onClick={() => goStep(3)} disabled={!medicarePath} className="bg-primary text-primary-foreground font-semibold">
                            Continue <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 3: Doctors ── */}
                    {step === 3 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-base font-bold text-foreground mb-1">Find your doctors</h2>
                          <p className="text-xs text-muted-foreground/60 mb-4">
                            {medicarePath === "SUP"
                              ? "With a Supplement plan, you can see any doctor who accepts Medicare. Adding doctors helps us personalize your experience."
                              : "Search for doctors, specialists, or facilities you'd like to keep. This helps us match MAPD plans to your providers."}
                          </p>

                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                              <Input placeholder="Doctor name, practice, or hospital" value={doctorQuery} onChange={e => setDoctorQuery(e.target.value)} className="pl-9 h-11 text-sm border-border/50 rounded-lg" />
                            </div>
                            <select value={specialtyFilter} onChange={e => setSpecialtyFilter(e.target.value)}
                              className="h-11 text-xs font-medium bg-white border border-border/50 rounded-lg px-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15">
                              <option value="">All Specialties</option>
                              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>

                          {!doctorQuery && !specialtyFilter && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {["Primary Care", "Cardiology", "Orthopedics", "Ophthalmology", "Pulmonology"].map(s => (
                                <button key={s} onClick={() => setSpecialtyFilter(s)}
                                  className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground/60 hover:border-primary/15 hover:text-primary transition-colors bg-white">
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}

                          {(doctorQuery || specialtyFilter) && (
                            <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                              {doctorSearching ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground/50">
                                  <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching providers…</span>
                                </div>
                              ) : doctorResults.length > 0 ? doctorResults.map(doc => {
                                const isAdded = savedDoctors.some(d => d.name === doc.name);
                                return (
                                  <div key={doc.id} className={cn("flex items-center justify-between p-3 border rounded-lg transition-colors", isAdded ? "border-primary/20 bg-primary/[0.02]" : "border-border/40 hover:border-primary/10")}>
                                    <div className="min-w-0 flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/[0.05] flex items-center justify-center shrink-0">
                                        {doc.isFacility ? <Hospital className="w-3.5 h-3.5 text-primary/50" strokeWidth={1.5} /> : <User className="w-3.5 h-3.5 text-primary/50" strokeWidth={1.5} />}
                                      </div>
                                      <div>
                                        <p className="text-[13px] font-semibold text-foreground leading-snug">{doc.name}</p>
                                        <p className="text-[11px] text-muted-foreground/60">{doc.specialty} · {doc.city}</p>
                                      </div>
                                    </div>
                                    <Button size="sm" variant={isAdded ? "outline" : "default"}
                                      className={cn("text-[10px] h-7 px-2.5 font-semibold shrink-0 ml-2", isAdded ? "border-primary/20 text-primary" : "bg-primary text-primary-foreground")}
                                      onClick={() => isAdded ? setSavedDoctors(p => p.filter(d => d.name !== doc.name)) : addDoctor(doc.name, doc.specialty)}>
                                      {isAdded ? <><Check className="w-3 h-3 mr-0.5" />Added</> : <><Plus className="w-3 h-3 mr-0.5" />Add</>}
                                    </Button>
                                  </div>
                                );
                              }) : <div className="text-center py-6"><p className="text-sm text-muted-foreground/60">No providers found. Try a different search.</p></div>}
                            </div>
                          )}

                          {savedDoctors.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/20">
                              <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">Your Providers ({savedDoctors.length})</p>
                              <div className="flex flex-wrap gap-1.5">
                                {savedDoctors.map((d, i) => (
                                  <span key={i} className="flex items-center gap-1.5 text-[11px] font-medium bg-primary/[0.05] text-primary border border-primary/10 rounded-full pl-2.5 pr-1 py-1">
                                    <Stethoscope className="w-2.5 h-2.5" /> {d.name}
                                    <button onClick={() => setSavedDoctors(p => p.filter(x => x.name !== d.name))} className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center"><X className="w-2 h-2" /></button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button variant="outline" onClick={() => goStep(2)} className="font-medium"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                          <Button onClick={() => goStep(4)} className="bg-primary text-primary-foreground font-semibold">
                            {savedDoctors.length > 0 ? "Continue" : "Skip This Step"} <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 4: Prescriptions ── */}
                    {step === 4 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-base font-bold text-foreground mb-1">Add your prescriptions</h2>
                          <p className="text-xs text-muted-foreground/60 mb-4">
                            {medicarePath === "MAPD"
                              ? "Search for medications you take. This is critical for MAPD — we'll match plans based on formulary coverage and drug costs."
                              : "If you plan to enroll in a separate Part D plan, listing your medications now will help when reviewing drug coverage options."}
                          </p>

                          <div className="relative max-w-md">
                            <Pill className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" strokeWidth={1.5} />
                            <Input placeholder="Search medication name" value={rxQuery} onChange={e => setRxQuery(e.target.value)} className="pl-9 h-11 text-sm border-border/50 rounded-lg" />
                          </div>

                          {!rxQuery && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {["Lisinopril", "Metformin", "Atorvastatin", "Eliquis", "Gabapentin"].map(m => (
                                <button key={m} onClick={() => setRxQuery(m)}
                                  className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground/60 hover:border-primary/15 hover:text-primary transition-colors bg-white">
                                  {m}
                                </button>
                              ))}
                            </div>
                          )}

                          {rxQuery && (
                            <div className="mt-3 space-y-2 max-h-[280px] overflow-y-auto">
                              {rxSearching ? (
                                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground/50">
                                  <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching medications…</span>
                                </div>
                              ) : rxResults.length > 0 ? rxResults.map(med => (
                                <div key={med.id} className="border border-border/40 rounded-lg p-3 hover:border-primary/10 transition-colors">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[13px] font-semibold text-foreground">{med.name}</p>
                                        <Badge variant="outline" className={cn("text-[9px] font-semibold uppercase tracking-wider", med.generic ? "text-emerald-700 border-emerald-200 bg-emerald-50/60" : "text-amber-700 border-amber-200 bg-amber-50/60")}>
                                          {med.generic ? "Generic" : "Brand"}
                                        </Badge>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground/50 mt-0.5">{med.category}{med.form ? ` · ${med.form}` : ""}</p>
                                    </div>
                                  </div>
                                  {med.dosage ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {[med.dosage].map(d => {
                                        const isAdded = savedRx.some(r => r.name === med.name && r.dosage === d);
                                        return (
                                          <button key={d} onClick={() => isAdded ? setSavedRx(p => p.filter(r => !(r.name === med.name && r.dosage === d))) : addRx(med.name, d)}
                                            className={cn("text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all",
                                              isAdded ? "bg-primary/[0.06] border-primary/20 text-primary" : "bg-white border-border/40 text-muted-foreground hover:border-primary/15"
                                            )}>
                                            {isAdded && <Check className="w-2.5 h-2.5 inline mr-0.5" />}{d}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="text-[10px] h-7 px-2.5 font-semibold"
                                      onClick={() => {
                                        const isAdded = savedRx.some(r => r.name === med.name);
                                        isAdded ? setSavedRx(p => p.filter(r => r.name !== med.name)) : addRx(med.name, "");
                                      }}>
                                      {savedRx.some(r => r.name === med.name) ? <><Check className="w-3 h-3 mr-0.5" />Added</> : <><Plus className="w-3 h-3 mr-0.5" />Add</>}
                                    </Button>
                                  )}
                                </div>
                              )) : <div className="text-center py-6"><p className="text-sm text-muted-foreground/60">No medications found. Try a different name.</p></div>}
                            </div>
                          )}

                          {savedRx.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/20">
                              <p className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider mb-2">Your Medications ({savedRx.length})</p>
                              <div className="flex flex-wrap gap-1.5">
                                {savedRx.map((r, i) => (
                                  <span key={i} className="flex items-center gap-1.5 text-[11px] font-medium bg-accent/10 text-accent-foreground border border-accent/15 rounded-full pl-2.5 pr-1 py-1">
                                    <Pill className="w-2.5 h-2.5" /> {r.name} {r.dosage}
                                    <button onClick={() => setSavedRx(p => p.filter(x => !(x.name === r.name && x.dosage === r.dosage)))} className="w-4 h-4 rounded-full bg-accent/15 flex items-center justify-center"><X className="w-2 h-2" /></button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 bg-muted/20 rounded-lg p-3 flex gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 text-primary/30 shrink-0 mt-0.5" strokeWidth={1.5} />
                            <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                              {medicarePath === "MAPD"
                                ? "Drug formularies and tier placement vary by plan. Results are based on available data — confirm coverage before enrolling."
                                : "Supplement plans do not include drug coverage. A separate Part D plan may be needed."}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button variant="outline" onClick={() => goStep(3)} className="font-medium"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                          <Button onClick={() => goStep(5)} className="bg-primary text-primary-foreground font-semibold">
                            {savedRx.length > 0 ? "Continue" : "Skip This Step"} <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 5: Preferences ── */}
                    {step === 5 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-base font-bold text-foreground mb-1">Set your preferences</h2>
                          <p className="text-xs text-muted-foreground/60 mb-4">Tell us what matters most so we can rank {medicarePath === "MAPD" ? "Medicare Advantage" : "Supplement"} plans that fit your needs.</p>
                        </div>

                        <div>
                          <label className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">Monthly Budget</label>
                          <div className="flex flex-wrap gap-2">
                            {currentBudgetRanges.map(b => (
                              <button key={b} onClick={() => setBudget(budget === b ? "" : b)}
                                className={cn("text-[12px] font-medium px-3.5 py-2 rounded-lg border transition-all duration-200",
                                  budget === b ? "bg-primary/[0.06] border-primary/25 text-primary" : "bg-white border-border/50 text-muted-foreground hover:border-primary/15"
                                )}>{b}</button>
                            ))}
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">Preferred Carrier</label>
                            <select value={preferredCarrier} onChange={e => setPreferredCarrier(e.target.value)}
                              className="w-full h-10 text-sm bg-white border border-border/50 rounded-lg px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15">
                              <option value="">No preference</option>
                              {MEDICARE_CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          {medicarePath === "MAPD" && (
                            <div>
                              <label className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">Network Type</label>
                              <select value={preferredNetwork} onChange={e => setPreferredNetwork(e.target.value)}
                                className="w-full h-10 text-sm bg-white border border-border/50 rounded-lg px-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15">
                                <option value="">No preference</option>
                                {NETWORK_TYPES.map(n => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </div>
                          )}
                        </div>

                        {medicarePath === "MAPD" && (
                          <div>
                            <label className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">Pharmacy Preference</label>
                            <div className="flex flex-wrap gap-2">
                              {["Retail pharmacy", "Mail order", "No preference"].map(p => (
                                <button key={p} onClick={() => setPharmacyPref(pharmacyPref === p ? "" : p)}
                                  className={cn("text-[12px] font-medium px-3.5 py-2 rounded-lg border transition-all duration-200",
                                    pharmacyPref === p ? "bg-primary/[0.06] border-primary/25 text-primary" : "bg-white border-border/50 text-muted-foreground hover:border-primary/15"
                                  )}>{p}</button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-[12px] font-semibold text-foreground/80 uppercase tracking-wider mb-2 block">
                            What matters most? <span className="text-muted-foreground/40 normal-case">(select any)</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {currentPriorities.map(p => (
                              <button key={p} onClick={() => togglePriority(p)}
                                className={cn("text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1",
                                  priorities.includes(p) ? "bg-primary/[0.06] border-primary/25 text-primary" : "bg-white border-border/50 text-muted-foreground hover:border-primary/15"
                                )}>
                                {priorities.includes(p) && <Check className="w-3 h-3" />} {p}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between pt-2">
                          <Button variant="outline" onClick={() => goStep(4)} className="font-medium"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
                          <Button onClick={goToResults} className="bg-primary text-primary-foreground font-semibold">
                            Find Medicare Plans <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollFadeIn>
            )}
          </div>
        </div>
      </section>

      {/* RESULTS */}
      {step === 6 && (
        <section ref={resultsRef} className="py-6 sm:py-10 scroll-mt-24 pb-28">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-5">

              {/* LEFT — Filters */}
              <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
                <div className="bg-white border border-border/30 rounded-xl p-4 shadow-[0_1px_8px_-3px_rgba(0,0,0,0.04)]">
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2.5">Sort By</p>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="w-full text-[12px] font-semibold bg-muted/15 border border-border/40 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15">
                    {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>

                <div className="bg-white border border-border/30 rounded-xl p-4 shadow-[0_1px_8px_-3px_rgba(0,0,0,0.04)]">
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2.5">Carrier</p>
                  <div className="space-y-1">
                    {MEDICARE_CARRIERS.map(c => (
                      <button key={c} onClick={() => { setFilterCarrier(filterCarrier === c ? "" : c); setFiltersUsedCount(p => p + 1); }}
                        className={cn("w-full text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2",
                          filterCarrier === c ? "bg-primary/[0.07] text-primary" : "text-muted-foreground/65 hover:bg-muted/20 hover:text-foreground"
                        )}>
                        <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors", filterCarrier === c ? "bg-primary border-primary" : "border-border/60")}>
                          {filterCarrier === c && <Check className="w-2 h-2 text-white" />}
                        </div>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {medicarePath === "MAPD" && (
                  <div className="bg-white border border-border/30 rounded-xl p-4 shadow-[0_1px_8px_-3px_rgba(0,0,0,0.04)]">
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2.5">Network Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {NETWORK_TYPES.map(n => (
                        <button key={n} onClick={() => { setFilterNetwork(filterNetwork === n ? "" : n); setFiltersUsedCount(p => p + 1); }}
                          className={cn("text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200",
                            filterNetwork === n ? "bg-primary/[0.07] border-primary/20 text-primary shadow-sm" : "bg-white border-border/30 text-muted-foreground/55 hover:border-primary/15"
                          )}>{n}</button>
                      ))}
                    </div>
                  </div>
                )}

                {(filterCarrier || filterNetwork) && (
                  <button onClick={() => { setFilterCarrier(""); setFilterNetwork(""); }}
                    className="w-full text-[11px] font-medium text-primary/70 hover:text-primary flex items-center justify-center gap-1.5 py-2 transition-colors">
                    <X className="w-3 h-3" /> Clear all filters
                  </button>
                )}

                <Button variant="outline" size="sm" onClick={() => goStep(1)} className="w-full text-[10px] font-medium border-border/40 h-8">
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Start Over
                </Button>
              </aside>

              {/* CENTER — Results */}
              <main className="min-w-0">
                {isLoading ? (
                  <div className="space-y-4"><ResultSkeleton /><ResultSkeleton /><ResultSkeleton /></div>
                ) : results.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{medicarePath === "MAPD" ? "Medicare Advantage Plans" : "Medicare Supplement Plans"}</h2>
                        <p className="text-[12px] text-muted-foreground/50">{results.length} plan{results.length !== 1 && "s"} found{zip ? ` near ${zip}` : ""}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {results.map(plan => {
                        const isExpanded = expandedId === plan.id;
                        const isCompared = compareIds.includes(plan.id);
                        return (
                          <div key={plan.id} className={cn("bg-white border rounded-xl transition-all duration-300 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)]",
                            isCompared ? "border-primary/25" : "border-border/30"
                          )}>
                            <div className="p-5 sm:p-6">
                              <div className="flex gap-4">
                                <div className="w-11 h-11 rounded-xl bg-primary/[0.04] border border-primary/[0.06] flex items-center justify-center shrink-0 hidden sm:flex">
                                  <Building2 className="w-5 h-5 text-primary/35" strokeWidth={1.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                      <p className="text-[11px] text-muted-foreground/50 font-medium">{plan.carrier}</p>
                                      <h3 className="text-[15px] font-bold text-foreground leading-snug mt-0.5">{plan.name}</h3>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-primary/[0.04] text-primary/60 border-primary/[0.1]">
                                          {plan.planType === "MAPD" ? plan.networkType : plan.medigapPlanLetter || "Supplement"}
                                        </Badge>
                                        {plan.fitLabel && (
                                          <Badge className="text-[9px] font-bold uppercase tracking-wider bg-accent/10 text-accent border-accent/20">
                                            <Star className="w-2.5 h-2.5 mr-0.5" fill="currentColor" /> {plan.fitLabel}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-xl font-bold text-foreground tabular-nums">${plan.premium}<span className="text-[11px] font-medium text-muted-foreground/40">/mo</span></p>
                                      {plan.starRating > 0 && <StarRating rating={plan.starRating} />}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                                      <p className="text-[10px] text-muted-foreground/45 font-medium">Deductible</p>
                                      <p className="text-sm font-bold text-foreground tabular-nums">{plan.deductible > 0 ? `$${plan.deductible.toLocaleString()}` : "$0"}</p>
                                    </div>
                                    <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                                      <p className="text-[10px] text-muted-foreground/45 font-medium">Max OOP</p>
                                      <p className="text-sm font-bold text-foreground tabular-nums">{plan.oopMax > 0 ? `$${plan.oopMax.toLocaleString()}` : "N/A"}</p>
                                    </div>
                                    <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                                      <p className="text-[10px] text-muted-foreground/45 font-medium">Primary Care</p>
                                      <p className="text-sm font-bold text-foreground">{plan.copayPrimary}</p>
                                    </div>
                                  </div>

                                  {plan.planType === "MAPD" && (
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                      <MatchBar value={plan.doctorMatch} label="Provider Match" />
                                      <MatchBar value={plan.rxMatch} label="Rx Match" />
                                    </div>
                                  )}

                                  {plan.highlights.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                      {plan.highlights.slice(0, isExpanded ? undefined : 3).map((h, i) => (
                                        <span key={i} className="text-[10px] font-medium bg-emerald-50/60 text-emerald-700 border border-emerald-200/30 rounded-full px-2 py-0.5 flex items-center gap-0.5">
                                          <CheckCircle2 className="w-2.5 h-2.5" /> {h}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-border/20 space-y-3 animate-fade-in">
                                      <div className="grid grid-cols-2 gap-3 text-[12px]">
                                        <div><span className="text-muted-foreground/50 font-medium">Specialist Copay:</span> <span className="font-semibold text-foreground ml-1">{plan.copaySpecialist}</span></div>
                                        <div><span className="text-muted-foreground/50 font-medium">Dental:</span> <span className="font-semibold text-foreground ml-1">{plan.dental ? "Included" : "Not included"}</span></div>
                                        <div><span className="text-muted-foreground/50 font-medium">Vision:</span> <span className="font-semibold text-foreground ml-1">{plan.vision ? "Included" : "Not included"}</span></div>
                                        <div><span className="text-muted-foreground/50 font-medium">Hearing:</span> <span className="font-semibold text-foreground ml-1">{plan.hearing ? "Included" : "Not included"}</span></div>
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-muted-foreground/50 font-medium mb-1">Drug Coverage</p>
                                        <p className="text-[12px] font-medium text-foreground bg-muted/[0.12] rounded-lg px-3 py-2">{plan.drugCoverage}</p>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground/40 italic leading-relaxed">Based on available Medicare plan data. Provider participation, formulary placement, and costs may vary. Confirm details with a licensed agent before enrolling.</p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/15">
                                    <Button variant="outline" size="sm" className="text-[10px] h-7 font-semibold" onClick={() => setExpandedId(isExpanded ? null : plan.id)}>
                                      {isExpanded ? "Less" : "Details"} {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                                    </Button>
                                    <Button variant="outline" size="sm" className={cn("text-[10px] h-7 font-semibold", isCompared && "border-primary/30 bg-primary/[0.04] text-primary")}
                                      onClick={() => toggleCompare(plan.id)}>
                                      <Scale className="w-3 h-3 mr-0.5" /> {isCompared ? "Compared" : "Compare"}
                                    </Button>
                                    <Button size="sm" className="text-[10px] h-7 font-semibold bg-primary text-primary-foreground ml-auto" onClick={() => handleGetHelp("plan_interest")}>
                                      <Phone className="w-3 h-3 mr-0.5" /> Speak to Agent
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <Building2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" strokeWidth={1} />
                    <p className="text-lg font-semibold text-foreground mb-1">No plans found</p>
                    <p className="text-sm text-muted-foreground/50 mb-4">Try adjusting your filters or expanding your search.</p>
                    <Button variant="outline" onClick={() => { setFilterCarrier(""); setFilterNetwork(""); }}>Clear Filters</Button>
                  </div>
                )}
              </main>

              {/* RIGHT — Coverage Summary */}
              <aside className="lg:sticky lg:top-28 lg:self-start space-y-4">
                <div className="bg-white border border-border/30 rounded-xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/20">
                    <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em]">Your Coverage Summary</p>
                  </div>
                  <div className="p-4 space-y-3.5">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground/50 font-medium">Plan Type</span>
                        <span className="text-[11px] font-semibold text-foreground">{medicarePath === "MAPD" ? "Medicare Advantage" : "Supplement"}</span>
                      </div>
                      {zip && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/50 font-medium">Location</span>
                          <span className="text-[11px] font-semibold text-foreground flex items-center gap-1"><MapPin className="w-2.5 h-2.5 text-primary/40" />{zip}</span>
                        </div>
                      )}
                      {preferredCarrier && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/50 font-medium">Carrier</span>
                          <span className="text-[11px] font-semibold text-foreground">{preferredCarrier}</span>
                        </div>
                      )}
                      {budget && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground/50 font-medium">Budget</span>
                          <span className="text-[11px] font-semibold text-foreground">{budget}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/15" />

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                        <Stethoscope className="w-3.5 h-3.5 text-primary/40 mx-auto mb-1" />
                        <p className="text-[14px] font-bold text-foreground tabular-nums">{savedDoctors.length}</p>
                        <p className="text-[9px] text-muted-foreground/45 font-medium">Doctors</p>
                      </div>
                      <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                        <Pill className="w-3.5 h-3.5 text-primary/40 mx-auto mb-1" />
                        <p className="text-[14px] font-bold text-foreground tabular-nums">{savedRx.length}</p>
                        <p className="text-[9px] text-muted-foreground/45 font-medium">Prescriptions</p>
                      </div>
                      <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                        <Scale className="w-3.5 h-3.5 text-primary/40 mx-auto mb-1" />
                        <p className="text-[14px] font-bold text-foreground tabular-nums">{compareIds.length}</p>
                        <p className="text-[9px] text-muted-foreground/45 font-medium">Comparing</p>
                      </div>
                      <div className="bg-muted/[0.12] rounded-lg px-3 py-2.5 text-center">
                        <BarChart3 className="w-3.5 h-3.5 text-primary/40 mx-auto mb-1" />
                        <p className="text-[14px] font-bold text-foreground tabular-nums">{results.length}</p>
                        <p className="text-[9px] text-muted-foreground/45 font-medium">Plans Found</p>
                      </div>
                    </div>

                    {priorities.length > 0 && (
                      <>
                        <div className="border-t border-border/15" />
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2">Priorities</p>
                          <div className="flex flex-wrap gap-1">
                            {priorities.map((p, i) => (
                              <span key={i} className="text-[9px] font-medium bg-primary/[0.04] text-primary/65 border border-primary/[0.08] rounded-full px-2 py-0.5">{p}</span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {results.length > 0 && results[0].fitLabel && (
                      <>
                        <div className="border-t border-border/15" />
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2">Top Matches</p>
                          <div className="space-y-1.5">
                            {results.slice(0, 3).map((plan, i) => (
                              <div key={plan.id} className="flex items-center gap-2 bg-muted/[0.12] rounded-lg px-2.5 py-2">
                                <div className="w-5 h-5 rounded-md bg-primary/[0.06] flex items-center justify-center shrink-0">
                                  {i === 0 ? <Star className="w-2.5 h-2.5 text-accent" fill="currentColor" /> : <Building2 className="w-2.5 h-2.5 text-primary/40" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold text-foreground leading-snug truncate">{plan.name}</p>
                                  <p className="text-[9px] text-muted-foreground/45">${plan.premium}/mo</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t border-border/15" />
                    <div className="flex items-center gap-2">
                      {leadSaved ? (
                        <span className="text-[10px] font-medium text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Progress saved</span>
                      ) : (
                        <span className="text-[10px] font-medium text-muted-foreground/40 flex items-center gap-1"><Clock className="w-3 h-3" /> Auto-saves on action</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Refine & Get Help */}
                <div className="bg-white border border-border/30 rounded-xl p-4 shadow-[0_1px_8px_-3px_rgba(0,0,0,0.04)]">
                  <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] mb-2.5">Refine & Get Help</p>
                  <div className="space-y-1">
                    <button onClick={() => goStep(3)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-primary/[0.03] transition-colors group active:scale-[0.98]">
                      <div className="w-7 h-7 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.1] transition-colors">
                        <Stethoscope className="w-3 h-3 text-primary/55" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-snug">Add Doctors</p>
                        <p className="text-[9px] text-muted-foreground/45">Update your provider list</p>
                      </div>
                    </button>
                    <button onClick={() => goStep(4)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-primary/[0.03] transition-colors group active:scale-[0.98]">
                      <div className="w-7 h-7 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.1] transition-colors">
                        <Pill className="w-3 h-3 text-primary/55" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-snug">Add Prescriptions</p>
                        <p className="text-[9px] text-muted-foreground/45">Update your medication list</p>
                      </div>
                    </button>
                    <button onClick={() => handleGetHelp("workspace_verify")}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-primary/[0.03] transition-colors group active:scale-[0.98]">
                      <div className="w-7 h-7 rounded-lg bg-primary/[0.06] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.1] transition-colors">
                        <ShieldCheck className="w-3 h-3 text-primary/55" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-snug">Verify Coverage</p>
                        <p className="text-[9px] text-muted-foreground/45">Confirm provider & Rx details</p>
                      </div>
                    </button>
                    <button onClick={() => handleGetHelp("workspace_speak_agent")}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-emerald-50/50 transition-colors group active:scale-[0.98]">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100/80 transition-colors">
                        <Users className="w-3 h-3 text-emerald-600" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-snug">Licensed Medicare Agent</p>
                        <p className="text-[9px] text-muted-foreground/45">Free expert Medicare support</p>
                      </div>
                    </button>
                    <a href="tel:+18007581590"
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-amber-50/50 transition-colors group active:scale-[0.98]">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 group-hover:bg-amber-100/80 transition-colors">
                        <Phone className="w-3 h-3 text-amber-600" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-snug">Prefer to Talk?</p>
                        <p className="text-[9px] text-muted-foreground/45">800.758.1590</p>
                      </div>
                    </a>
                  </div>
                </div>
              </aside>

            </div>
          </div>
          <CompareDrawer plans={comparePlans} onRemove={id => setCompareIds(p => p.filter(x => x !== id))} onClear={() => setCompareIds([])} />
        </section>
      )}

      {/* FAQ */}
      <ScrollFadeIn>
        <section className="py-16 sm:py-20 bg-muted/[0.08]">
          <div className="section-container max-w-3xl">
            <h2 className="text-xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                { q: "What is the difference between MAPD and Medicare Supplement?", a: "Medicare Advantage (MAPD) combines hospital, medical, and prescription drug coverage into one plan — often with extra benefits like dental and vision. Medicare Supplement (Medigap) helps cover costs that Original Medicare doesn't pay, such as copays, coinsurance, and deductibles. Prescription drug coverage is separate with a Supplement plan." },
                { q: "Can I search based on my prescriptions?", a: "Yes. You can add your medications during the search process. For MAPD plans, we match your prescriptions against plan formularies to help you estimate drug costs and coverage." },
                { q: "Can I check if my doctor is in-network?", a: "Yes. You can search for and add your doctors during the guided flow. For MAPD plans, provider match scores indicate how well each plan covers your providers. Supplement plans allow any doctor who accepts Medicare." },
                { q: "Are these actual Medicare plan names and carriers?", a: "Plan names and carriers shown are based on available Medicare plan data. Results are structured to reflect real plan structures. Always verify specific plan details with a licensed Medicare agent before enrolling." },
                { q: "Can I compare plans side by side?", a: "Absolutely. Select plans using the Compare button and view them side by side — including premiums, deductibles, copays, drug coverage, doctor match, and star ratings." },
                { q: "Can I speak to a licensed Medicare agent?", a: "Yes. At any point in the process, you can request to speak with a licensed Medicare agent at no cost and no obligation. Call 800.758.1590 or use the 'Speak to Agent' button." },
                { q: "Is there a cost to use this tool?", a: "No. This Medicare plan finder is completely free to use. There is no cost and no obligation to enroll." },
              ].map((faq, i) => (
                <details key={i} className="group bg-white border border-border/30 rounded-xl shadow-[0_1px_4px_-2px_rgba(0,0,0,0.04)]">
                  <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-[14px] font-semibold text-foreground hover:text-primary transition-colors list-none">
                    {faq.q}
                    <ChevronDown className="w-4 h-4 text-muted-foreground/40 transition-transform group-open:rotate-180 shrink-0 ml-4" />
                  </summary>
                  <div className="px-5 pb-4 text-[13px] text-muted-foreground leading-relaxed">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* CTA */}
      <ScrollFadeIn>
        <section className="py-12 sm:py-16">
          <div className="section-container">
            <div className="band-ink rounded-2xl px-6 sm:px-10 py-10 sm:py-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
              <div className="relative">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3" style={{ textWrap: "balance" }}>Need help choosing a Medicare plan?</h2>
                <p className="text-sm text-white/60 max-w-md mx-auto mb-6">Our licensed Medicare agents can walk you through your options at no cost and no obligation.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button size="lg" className="bg-accent text-accent-foreground font-semibold hover:bg-accent/90" onClick={() => setQuoteOpen(true)}>
                    Request a Callback <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button size="lg" variant="hero-outline" asChild>
                    <a href="tel:+18007581590"><Phone className="w-4 h-4 mr-1.5" /> 800.758.1590</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>

      {/* AI Concierge */}
      <CoverageConcierge userContext={{ step, zip, category: `Medicare - ${medicarePath}`, doctors: savedDoctors, prescriptions: savedRx, budget, network: preferredNetwork, priorities, plansCompared: compareIds.length }} sessionId={sessionId} onRequestAgent={() => handleGetHelp("concierge_agent")} />

      <Footer />
      <QuoteFormDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </div>
  );
};

export default FindMAPD;
