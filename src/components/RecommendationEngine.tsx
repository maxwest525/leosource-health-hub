import { useMemo, useState, useCallback } from "react";
import {
  ChevronRight, Phone, Stethoscope, Pill, Scale, ShieldCheck,
  Star, Bookmark, Mail, Clock, ArrowRight, CheckCircle2, Users,
  Sparkles, Heart, DollarSign, BarChart3, Send, X, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollFadeIn } from "@/hooks/use-scroll-animation";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type SavedDoctor = { name: string; specialty: string };
type SavedRx = { name: string; dosage: string };

type RecommendationContext = {
  step: number;
  zip: string;
  category: string;
  doctors: SavedDoctor[];
  prescriptions: SavedRx[];
  budget: string;
  network: string;
  priorities: string[];
  plansCompared: number;
  plansViewed: number;
  helpRequested: boolean;
  sessionId: string;
};

type NextAction = {
  id: string;
  icon: typeof Stethoscope;
  title: string;
  description: string;
  cta: string;
  variant: "primary" | "secondary" | "outline";
  action: () => void;
};

type ShortlistPlan = {
  carrier: string;
  name: string;
  premium: number;
  deductible: number;
  doctorMatch: number;
  rxMatch: number;
  label: string;
  labelColor: string;
};

/* ================================================================== */
/*  INTELLIGENCE                                                       */
/* ================================================================== */

function getUserState(ctx: RecommendationContext) {
  const hasDoctors = ctx.doctors.length > 0;
  const hasRx = ctx.prescriptions.length > 0;
  const hasCompared = ctx.plansCompared >= 2;
  const isMedicare = ctx.category.toLowerCase().includes("medicare");
  const isDoctorFocused = ctx.priorities.some(p => p.toLowerCase().includes("doctor"));
  const isRxFocused = ctx.priorities.some(p => p.toLowerCase().includes("prescription"));
  const isBudgetFocused = ctx.priorities.some(p => p.toLowerCase().includes("premium") || p.toLowerCase().includes("deductible"));

  let state = "general";
  if (hasCompared && hasDoctors && hasRx) state = "full_journey_complete";
  else if (hasCompared) state = "compared_plans";
  else if (hasDoctors && hasRx) state = "doctors_and_rx";
  else if (hasDoctors) state = "doctors_only";
  else if (hasRx) state = "rx_only";

  return { state, hasDoctors, hasRx, hasCompared, isMedicare, isDoctorFocused, isRxFocused, isBudgetFocused };
}

function getRecommendationTitle(state: ReturnType<typeof getUserState>): string {
  if (state.state === "full_journey_complete") return "Your Coverage Review Is Ready";
  if (state.state === "compared_plans") return "Next Steps for Your Comparison";
  if (state.state === "doctors_and_rx") return "Review Your Matches";
  if (state.state === "doctors_only") return "Strengthen Your Comparison";
  if (state.state === "rx_only") return "Continue Building Your Profile";
  return "Recommended Next Steps";
}

function getRecommendationSubtitle(ctx: RecommendationContext, state: ReturnType<typeof getUserState>): string {
  const parts: string[] = [];
  if (ctx.doctors.length) parts.push(`${ctx.doctors.length} doctor${ctx.doctors.length !== 1 ? "s" : ""}`);
  if (ctx.prescriptions.length) parts.push(`${ctx.prescriptions.length} prescription${ctx.prescriptions.length !== 1 ? "s" : ""}`);
  if (ctx.plansCompared) parts.push(`${ctx.plansCompared} plan${ctx.plansCompared !== 1 ? "s" : ""} compared`);

  if (state.state === "full_journey_complete") {
    return `Based on ${parts.join(", ")} — here's what you can do next.`;
  }
  if (parts.length) {
    return `You've added ${parts.join(" and ")}. Here are your recommended next steps.`;
  }
  return "Here's how to get the most out of your plan search.";
}

/* ================================================================== */
/*  LOGGING                                                            */
/* ================================================================== */

async function logRecommendationEvent(sessionId: string, action: string, details?: any) {
  try {
    const { data: leads } = await supabase
      .from("tool_leads")
      .select("id")
      .eq("session_id", sessionId)
      .limit(1);
    if (leads && leads.length > 0) {
      await supabase.from("tool_lead_interactions").insert({
        lead_id: leads[0].id,
        action: `recommendation_${action}`,
        details: details || {},
      });
    }
  } catch { /* silent */ }
}

/* ================================================================== */
/*  SUB-COMPONENTS                                                     */
/* ================================================================== */

function ProfileSummaryCard({ ctx }: { ctx: RecommendationContext }) {
  return (
    <div className="bg-primary/[0.025] border border-primary/[0.08] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/[0.07] flex items-center justify-center">
          <BarChart3 className="w-3.5 h-3.5 text-primary/60" />
        </div>
        <p className="text-[12px] font-bold text-foreground">Your Coverage Profile</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[12px]">
        {ctx.zip && (
          <div className="flex items-center gap-2 text-foreground/80">
            <ShieldCheck className="w-3 h-3 text-primary/40" />
            <span>ZIP {ctx.zip}{ctx.category ? ` · ${ctx.category}` : ""}</span>
          </div>
        )}
        {ctx.doctors.length > 0 && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Stethoscope className="w-3 h-3 text-primary/40" />
            <span>{ctx.doctors.length} doctor{ctx.doctors.length !== 1 ? "s" : ""} saved</span>
          </div>
        )}
        {ctx.prescriptions.length > 0 && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Pill className="w-3 h-3 text-primary/40" />
            <span>{ctx.prescriptions.length} prescription{ctx.prescriptions.length !== 1 ? "s" : ""} added</span>
          </div>
        )}
        {ctx.plansCompared > 0 && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Scale className="w-3 h-3 text-primary/40" />
            <span>{ctx.plansCompared} plan{ctx.plansCompared !== 1 ? "s" : ""} compared</span>
          </div>
        )}
        {ctx.budget && (
          <div className="flex items-center gap-2 text-foreground/80">
            <DollarSign className="w-3 h-3 text-primary/40" />
            <span>{ctx.budget}</span>
          </div>
        )}
        {ctx.network && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Users className="w-3 h-3 text-primary/40" />
            <span>{ctx.network} preferred</span>
          </div>
        )}
      </div>
      {ctx.priorities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {ctx.priorities.map((p, i) => (
            <span key={i} className="text-[10px] font-medium bg-primary/[0.05] text-primary/70 rounded-full px-2 py-0.5">{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function NextActionCard({ action }: { action: NextAction }) {
  const Icon = action.icon;
  return (
    <button
      onClick={action.action}
      className="w-full text-left bg-white border border-border/40 rounded-xl p-4 hover:border-primary/20 hover:shadow-[0_4px_20px_-8px_rgba(8,56,112,0.08)] transition-all duration-300 group active:scale-[0.98]"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-primary/[0.05] flex items-center justify-center shrink-0 group-hover:bg-primary/[0.08] transition-colors">
          <Icon className="w-4 h-4 text-primary/55" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground leading-snug">{action.title}</p>
          <p className="text-[12px] text-muted-foreground/60 leading-relaxed mt-0.5">{action.description}</p>
        </div>
        <div className="shrink-0 mt-0.5">
          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] font-semibold rounded-lg px-3 py-1.5 transition-all",
            action.variant === "primary" ? "bg-primary text-primary-foreground group-hover:bg-primary/90" :
            action.variant === "secondary" ? "bg-accent text-accent-foreground group-hover:bg-accent/90" :
            "bg-muted/30 text-foreground/70 border border-border/40 group-hover:border-primary/20"
          )}>
            {action.cta}
            <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </button>
  );
}

function SaveProgressModule({
  sessionId,
  onSaved,
}: {
  sessionId: string;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!email.trim()) return;
    setSaving(true);
    logRecommendationEvent(sessionId, "save_progress", { email: email.trim() });

    // Update lead with email if exists
    try {
      const { data: leads } = await supabase
        .from("tool_leads")
        .select("id")
        .eq("session_id", sessionId)
        .limit(1);
      if (leads && leads.length > 0) {
        await supabase.from("tool_leads").update({ email: email.trim() }).eq("id", leads[0].id);
      }
    } catch { /* silent */ }

    setSaving(false);
    setSaved(true);
    onSaved();
  };

  if (saved) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-[13px] font-semibold text-emerald-800">Progress Saved</p>
          <p className="text-[11px] text-emerald-700/70 mt-0.5">We'll send your results summary to {email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/[0.15] border border-border/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <Bookmark className="w-3.5 h-3.5 text-primary/50" />
        <p className="text-[12px] font-bold text-foreground">Save Your Progress</p>
      </div>
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed mb-3">
        Get a summary of your doctors, prescriptions, and plan matches sent to your email so you can pick up where you left off.
      </p>
      <form onSubmit={e => { e.preventDefault(); handleSave(); }} className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          className="h-9 text-[12px] border-border/40 flex-1"
        />
        <Button type="submit" size="sm" className="h-9 text-[11px] bg-primary text-primary-foreground font-semibold shrink-0 px-4" disabled={saving || !email.trim()}>
          {saving ? "Saving…" : "Save Results"}
        </Button>
      </form>
      <p className="text-[9px] text-muted-foreground/40 mt-2">Your information is kept private and secure. No spam, ever.</p>
    </div>
  );
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */

export default function RecommendationEngine({
  ctx,
  onGetHelp,
  onGoToStep,
  shortlistPlans,
}: {
  ctx: RecommendationContext;
  onGetHelp: (cta: string) => void;
  onGoToStep: (step: number) => void;
  shortlistPlans?: ShortlistPlan[];
}) {
  const [progressSaved, setProgressSaved] = useState(false);

  const userState = useMemo(() => getUserState(ctx), [ctx]);
  const title = getRecommendationTitle(userState);
  const subtitle = getRecommendationSubtitle(ctx, userState);

  const nextActions = useMemo((): NextAction[] => {
    const actions: NextAction[] = [];

    // Doctor-focused but no Rx yet
    if (userState.hasDoctors && !userState.hasRx) {
      actions.push({
        id: "add_rx",
        icon: Pill,
        title: "Add Your Prescriptions",
        description: "Adding your medications can help identify plans with stronger formulary compatibility.",
        cta: "Add Rx",
        variant: "primary",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_add_rx"); onGoToStep(3); },
      });
    }

    // Has Rx but no doctors
    if (userState.hasRx && !userState.hasDoctors) {
      actions.push({
        id: "add_doctors",
        icon: Stethoscope,
        title: "Add Your Doctors",
        description: "Search for your providers to see which plans may better align with your care team.",
        cta: "Find Doctors",
        variant: "primary",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_add_doctors"); onGoToStep(2); },
      });
    }

    // Has compared — primary action is agent review
    if (userState.hasCompared) {
      actions.push({
        id: "agent_review",
        icon: Users,
        title: "Review Options With a Licensed Agent",
        description: "A licensed agent can verify doctor and prescription details, clarify plan differences, and help you choose with confidence.",
        cta: "Get Expert Help",
        variant: "secondary",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_agent_review"); onGetHelp("recommendation_agent_review"); },
      });
    }

    // Has doctors + Rx but hasn't compared
    if (userState.hasDoctors && userState.hasRx && !userState.hasCompared) {
      actions.push({
        id: "compare_plans",
        icon: Scale,
        title: "Compare Your Top Plans",
        description: "You have doctors and prescriptions ready. Compare plans to see which options align best with your needs.",
        cta: "Compare Plans",
        variant: "primary",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_compare_plans"); onGoToStep(5); },
      });
    }

    // Always offer agent/callback if they've done meaningful work
    if ((userState.hasDoctors || userState.hasRx) && !userState.hasCompared) {
      actions.push({
        id: "speak_agent",
        icon: Phone,
        title: "Speak to a Licensed Agent",
        description: "Our agents can review your profile, answer questions, and help you narrow your options — always free.",
        cta: "Request Call",
        variant: "outline",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_speak_agent"); onGetHelp("recommendation_speak_agent"); },
      });
    }

    // Enrollment handoff — high intent
    if (userState.hasCompared && (userState.hasDoctors || userState.hasRx)) {
      actions.push({
        id: "enrollment_support",
        icon: Heart,
        title: "Continue to Enrollment Support",
        description: "Ready to move forward? A licensed agent can walk you through final plan details and next steps.",
        cta: "Start Review",
        variant: "primary",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_enrollment"); onGetHelp("recommendation_enrollment_support"); },
      });
    }

    // Verify coverage
    if (userState.hasDoctors || userState.hasRx) {
      actions.push({
        id: "verify",
        icon: ShieldCheck,
        title: "Verify Provider & Prescription Coverage",
        description: "Match scores are estimates. A licensed agent can confirm plan-specific network and formulary details.",
        cta: "Verify Coverage",
        variant: "outline",
        action: () => { logRecommendationEvent(ctx.sessionId, "click_verify"); onGetHelp("recommendation_verify_coverage"); },
      });
    }

    return actions.slice(0, 4);
  }, [userState, ctx, onGetHelp, onGoToStep]);

  // Build shortlist labels
  const shortlist = useMemo(() => {
    if (!shortlistPlans || shortlistPlans.length < 2) return null;

    // Pick top plans by different criteria
    const byDoctor = [...shortlistPlans].sort((a, b) => b.doctorMatch - a.doctorMatch)[0];
    const byRx = [...shortlistPlans].sort((a, b) => b.rxMatch - a.rxMatch)[0];
    const byPremium = [...shortlistPlans].sort((a, b) => a.premium - b.premium)[0];

    const items: (ShortlistPlan & { reason: string; reasonIcon: typeof Star })[] = [];
    const seen = new Set<string>();

    if (byDoctor && !seen.has(byDoctor.name)) {
      items.push({ ...byDoctor, reason: "Stronger Doctor Match", reasonIcon: Stethoscope });
      seen.add(byDoctor.name);
    }
    if (byRx && !seen.has(byRx.name)) {
      items.push({ ...byRx, reason: "Stronger Rx Match", reasonIcon: Pill });
      seen.add(byRx.name);
    }
    if (byPremium && !seen.has(byPremium.name)) {
      items.push({ ...byPremium, reason: "Lower Premium Option", reasonIcon: DollarSign });
      seen.add(byPremium.name);
    }

    return items.slice(0, 3);
  }, [shortlistPlans]);

  // Only show if user has done meaningful work
  if (ctx.step < 5 || (!userState.hasDoctors && !userState.hasRx && !userState.hasCompared)) return null;

  return (
    <>
      {/* ── RECOMMENDATION ENGINE ── */}
      <ScrollFadeIn>
        <section className="py-10 sm:py-14">
          <div className="section-container">
            <div className="max-w-4xl mx-auto space-y-6">

              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-4 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent">Personalized Guidance</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto leading-relaxed">{subtitle}</p>
              </div>

              <div className="grid lg:grid-cols-5 gap-6">
                {/* Left: Profile + Save */}
                <div className="lg:col-span-2 space-y-4">
                  <ProfileSummaryCard ctx={ctx} />

                  {/* Shortlist */}
                  {shortlist && shortlist.length > 0 && (
                    <div className="bg-white border border-border/40 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-accent" fill="hsl(var(--accent))" />
                        <p className="text-[12px] font-bold text-foreground">Your Shortlist</p>
                      </div>
                      <div className="space-y-2">
                        {shortlist.map((plan, i) => {
                          const ReasonIcon = plan.reasonIcon;
                          return (
                            <div key={i} className="flex items-start gap-3 bg-muted/[0.15] rounded-lg p-3">
                              <div className="w-7 h-7 rounded-lg bg-primary/[0.05] flex items-center justify-center shrink-0">
                                <ReasonIcon className="w-3.5 h-3.5 text-primary/50" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold text-foreground leading-snug truncate">{plan.name}</p>
                                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{plan.carrier} · ${plan.premium}/mo</p>
                                <Badge variant="outline" className="text-[8px] font-semibold mt-1 border-accent/20 text-accent bg-accent/[0.05]">
                                  {plan.reason}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-muted-foreground/40 leading-relaxed">
                        Shortlist is based on your profile. Match scores are estimates — verify details with a licensed agent.
                      </p>
                    </div>
                  )}

                  {!progressSaved && (
                    <SaveProgressModule sessionId={ctx.sessionId} onSaved={() => setProgressSaved(true)} />
                  )}
                </div>

                {/* Right: Next actions */}
                <div className="lg:col-span-3 space-y-3">
                  {nextActions.map(action => (
                    <NextActionCard key={action.id} action={action} />
                  ))}

                  {/* Phone CTA */}
                  <div className="bg-white border border-border/40 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-foreground">Prefer to talk?</p>
                      <p className="text-[11px] text-muted-foreground/60">Call a licensed agent, free of charge.</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-[11px] font-semibold shrink-0" asChild>
                      <a href="tel:+18007581590">800.758.1590</a>
                    </Button>
                  </div>

                  {/* Trust note */}
                  <div className="flex gap-2.5 bg-muted/[0.1] rounded-lg p-3.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary/30 shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                      Provider participation and prescription coverage may vary by plan and formulary. Match scores are estimates based on available data. A licensed agent can confirm plan-specific details before enrollment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollFadeIn>
    </>
  );
}
