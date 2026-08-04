import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Filter, Phone, Mail, MapPin, ChevronRight, ChevronDown,
  Users, BarChart3, Star, Stethoscope, Pill, ShieldCheck, Clock,
  ArrowRight, X, CheckCircle2, AlertCircle, Scale, Loader2,
  LogOut, Eye, MessageSquare, Tag, Flag, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type Lead = {
  id: string;
  session_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  zip_code: string | null;
  coverage_category: string | null;
  monthly_budget: string | null;
  carrier_preference: string | null;
  network_preference: string | null;
  priorities: string[];
  intent_score: number;
  intent_level: string;
  status: string;
  routing_team: string | null;
  assigned_agent: string | null;
  callback_priority: boolean;
  final_cta_taken: string | null;
  steps_completed: number;
  highest_step_reached: number;
  created_at: string;
  updated_at: string;
};

type LeadDoctor = { id: string; doctor_name: string; specialty: string | null; is_selected: boolean };
type LeadRx = { id: string; medication_name: string; dosage: string | null; is_selected: boolean };
type LeadPlan = { id: string; plan_name: string; carrier: string | null; metal_tier: string | null; premium: number | null; was_compared: boolean; fit_label: string | null; doctor_match: number | null; rx_match: number | null };
type LeadTag = { id: string; tag: string; auto_generated: boolean };
type LeadNote = { id: string; author: string | null; content: string; created_at: string };
type LeadFlag = { id: string; flag: string; resolved: boolean };
type LeadInteraction = { id: string; action: string; step: number | null; details: any; created_at: string };

/* ================================================================== */
/*  STATUS CONFIG                                                      */
/* ================================================================== */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new_tool_lead: { label: "New Lead", color: "bg-blue-100 text-blue-700 border-blue-200" },
  partial_completion: { label: "Partial", color: "bg-slate-100 text-slate-600 border-slate-200" },
  doctor_search_completed: { label: "Doctor Search", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  rx_search_completed: { label: "Rx Search", color: "bg-purple-100 text-purple-700 border-purple-200" },
  plan_compare_completed: { label: "Compared Plans", color: "bg-teal-100 text-teal-700 border-teal-200" },
  high_intent_review: { label: "High Intent", color: "bg-amber-100 text-amber-700 border-amber-200" },
  ready_for_agent: { label: "Ready for Agent", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  contacted: { label: "Contacted", color: "bg-sky-100 text-sky-700 border-sky-200" },
  in_follow_up: { label: "Follow-Up", color: "bg-orange-100 text-orange-700 border-orange-200" },
  plan_guidance: { label: "Plan Guidance", color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  enrolled: { label: "Enrolled", color: "bg-green-100 text-green-700 border-green-200" },
  lost: { label: "Lost", color: "bg-red-100 text-red-600 border-red-200" },
  nurture: { label: "Nurture", color: "bg-rose-100 text-rose-600 border-rose-200" },
};

const INTENT_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  ready_for_agent: "bg-emerald-100 text-emerald-700",
};

const TEAM_LABELS: Record<string, string> = {
  medicare: "Medicare Team",
  aca_individual: "ACA / Individual",
  dental_vision: "Dental & Vision",
  general: "General",
};

/* ================================================================== */
/*  ADMIN DASHBOARD                                                    */
/* ================================================================== */

const AdminDashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterIntent, setFilterIntent] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterPriority, setFilterPriority] = useState(false);

  // Detail data
  const [leadDoctors, setLeadDoctors] = useState<LeadDoctor[]>([]);
  const [leadRx, setLeadRx] = useState<LeadRx[]>([]);
  const [leadPlans, setLeadPlans] = useState<LeadPlan[]>([]);
  const [leadTags, setLeadTags] = useState<LeadTag[]>([]);
  const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
  const [leadFlags, setLeadFlags] = useState<LeadFlag[]>([]);
  const [newNote, setNewNote] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // Redirect if not authed
  useEffect(() => {
    if (!authLoading && !user) navigate("/agent-login");
  }, [authLoading, user, navigate]);

  // Fetch leads
  useEffect(() => {
    if (!user) return;
    const fetchLeads = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("tool_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setLeads((data as Lead[]) || []);
      setLoading(false);
    };
    fetchLeads();
  }, [user]);

  // Load lead detail
  const loadLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead);
    setDetailLoading(true);
    const [docs, rx, plans, tags, notes, flags] = await Promise.all([
      supabase.from("tool_lead_doctors").select("*").eq("lead_id", lead.id),
      supabase.from("tool_lead_prescriptions").select("*").eq("lead_id", lead.id),
      supabase.from("tool_lead_plans").select("*").eq("lead_id", lead.id),
      supabase.from("tool_lead_tags").select("*").eq("lead_id", lead.id),
      supabase.from("tool_lead_notes").select("*").eq("lead_id", lead.id).order("created_at", { ascending: false }),
      supabase.from("tool_lead_flags").select("*").eq("lead_id", lead.id),
    ]);
    setLeadDoctors((docs.data as LeadDoctor[]) || []);
    setLeadRx((rx.data as LeadRx[]) || []);
    setLeadPlans((plans.data as LeadPlan[]) || []);
    setLeadTags((tags.data as LeadTag[]) || []);
    setLeadNotes((notes.data as LeadNote[]) || []);
    setLeadFlags((flags.data as LeadFlag[]) || []);
    setDetailLoading(false);
  };

  // Update lead status
  const updateStatus = async (leadId: string, newStatus: string) => {
    await supabase.from("tool_leads").update({ status: newStatus as any }).eq("id", leadId);
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
  };

  // Add note
  const addNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    await supabase.from("tool_lead_notes").insert({
      lead_id: selectedLead.id,
      author: user?.email || "Agent",
      content: newNote.trim(),
    });
    setLeadNotes(prev => [{ id: crypto.randomUUID(), author: user?.email || "Agent", content: newNote.trim(), created_at: new Date().toISOString() }, ...prev]);
    setNewNote("");
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterIntent && l.intent_level !== filterIntent) return false;
      if (filterTeam && l.routing_team !== filterTeam) return false;
      if (filterPriority && !l.callback_priority) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = [l.first_name, l.last_name, l.email, l.phone, l.zip_code, l.coverage_category]
          .filter(Boolean).join(" ").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [leads, filterStatus, filterIntent, filterTeam, filterPriority, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const highIntent = leads.filter(l => l.intent_level === "high" || l.intent_level === "ready_for_agent").length;
    const priority = leads.filter(l => l.callback_priority).length;
    const medicare = leads.filter(l => l.coverage_category?.toLowerCase().includes("medicare")).length;
    const avgScore = total > 0 ? Math.round(leads.reduce((sum, l) => sum + l.intent_score, 0) / total) : 0;
    return { total, highIntent, priority, medicare, avgScore };
  }, [leads]);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary/50" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">E</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-none">TruEnroll Admin</h1>
              <p className="text-[10px] text-muted-foreground/50">Coverage Tool CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={signOut}>
              <LogOut className="w-3 h-3 mr-1" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Leads", value: stats.total, icon: Users, color: "text-primary" },
            { label: "High Intent", value: stats.highIntent, icon: TrendingUp, color: "text-amber-600" },
            { label: "Priority Callback", value: stats.priority, icon: Phone, color: "text-emerald-600" },
            { label: "Medicare Leads", value: stats.medicare, icon: ShieldCheck, color: "text-blue-600" },
            { label: "Avg. Intent Score", value: stats.avgScore, icon: BarChart3, color: "text-violet-600" },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">{s.label}</p>
                <s.icon className={cn("w-4 h-4", s.color)} strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Lead list */}
          <div className={cn("flex-1 min-w-0", selectedLead && "hidden lg:block lg:max-w-[55%]")}>
            {/* Search + filters */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/35" />
                <Input placeholder="Search by name, email, phone, ZIP…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-sm border-slate-200" />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="text-[11px] font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-foreground">
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select value={filterIntent} onChange={e => setFilterIntent(e.target.value)}
                  className="text-[11px] font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-foreground">
                  <option value="">All Intent</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="ready_for_agent">Ready for Agent</option>
                </select>
                <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
                  className="text-[11px] font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-foreground">
                  <option value="">All Teams</option>
                  {Object.entries(TEAM_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => setFilterPriority(!filterPriority)}
                  className={cn("text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all",
                    filterPriority ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-slate-200 text-muted-foreground"
                  )}>
                  <Phone className="w-3 h-3 inline mr-1" />Priority Only
                </button>
                {(filterStatus || filterIntent || filterTeam || filterPriority || searchQuery) && (
                  <button onClick={() => { setFilterStatus(""); setFilterIntent(""); setFilterTeam(""); setFilterPriority(false); setSearchQuery(""); }}
                    className="text-[11px] text-muted-foreground underline underline-offset-2">Clear all</button>
                )}
              </div>
            </div>

            {/* Results count */}
            <p className="text-[12px] text-muted-foreground mb-2 px-1">
              <span className="font-semibold text-foreground tabular-nums">{filteredLeads.length}</span> lead{filteredLeads.length !== 1 && "s"}
            </p>

            {/* Lead rows */}
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
                    <div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-slate-100" /><div className="flex-1 space-y-2"><div className="h-3 bg-slate-100 rounded w-1/3" /><div className="h-2 bg-slate-50 rounded w-1/2" /></div></div>
                  </div>
                ))
              ) : filteredLeads.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">No leads found</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Adjust your filters or wait for new tool submissions.</p>
                </div>
              ) : filteredLeads.map(lead => {
                const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new_tool_lead;
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <button key={lead.id} onClick={() => loadLeadDetail(lead)}
                    className={cn(
                      "w-full text-left bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-sm",
                      isSelected ? "border-primary/30 shadow-sm" : "border-slate-200 hover:border-primary/15"
                    )}>
                    <div className="flex items-start gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                        lead.callback_priority ? "bg-emerald-100 text-emerald-700" : "bg-primary/[0.06] text-primary/60"
                      )}>
                        {lead.intent_score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-foreground">
                            {lead.first_name || lead.last_name
                              ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                              : lead.email || `Session ${lead.session_id.slice(0, 8)}`}
                          </p>
                          <Badge variant="outline" className={cn("text-[9px] font-semibold uppercase tracking-wider border", sc.color)}>{sc.label}</Badge>
                          {lead.callback_priority && <Badge className="text-[9px] bg-emerald-500 text-white font-semibold">Priority</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground/60">
                          {lead.zip_code && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{lead.zip_code}</span>}
                          {lead.coverage_category && <span>{lead.coverage_category}</span>}
                          {lead.routing_team && <span className="font-medium text-muted-foreground/70">{TEAM_LABELS[lead.routing_team] || lead.routing_team}</span>}
                          <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{new Date(lead.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className={cn("text-[9px] font-medium", INTENT_COLORS[lead.intent_level] || "")}>
                            Intent: {lead.intent_level?.replace("_", " ")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground/40">Step {lead.highest_step_reached}/5</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/20 shrink-0 mt-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          {selectedLead && (
            <div className="flex-1 min-w-0 lg:max-w-[45%]">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-20">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {selectedLead.first_name || selectedLead.last_name
                        ? `${selectedLead.first_name || ""} ${selectedLead.last_name || ""}`.trim()
                        : "Anonymous Lead"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-[9px] font-semibold uppercase tracking-wider border", STATUS_CONFIG[selectedLead.status]?.color)}>{STATUS_CONFIG[selectedLead.status]?.label}</Badge>
                      <Badge variant="outline" className={cn("text-[9px] font-medium", INTENT_COLORS[selectedLead.intent_level])}>Score: {selectedLead.intent_score}</Badge>
                      {selectedLead.callback_priority && <Badge className="text-[9px] bg-emerald-500 text-white">Priority Callback</Badge>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedLead(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
                </div>

                <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
                  {detailLoading ? (
                    <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary/40" /></div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {/* Contact info */}
                      <div className="p-5 space-y-2">
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Contact</p>
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                          {selectedLead.email && <div className="flex items-center gap-1.5 text-foreground"><Mail className="w-3 h-3 text-muted-foreground/40" />{selectedLead.email}</div>}
                          {selectedLead.phone && <div className="flex items-center gap-1.5 text-foreground"><Phone className="w-3 h-3 text-muted-foreground/40" />{selectedLead.phone}</div>}
                          {selectedLead.zip_code && <div className="flex items-center gap-1.5 text-foreground"><MapPin className="w-3 h-3 text-muted-foreground/40" />{selectedLead.zip_code}</div>}
                          {selectedLead.coverage_category && <div className="flex items-center gap-1.5 text-foreground"><ShieldCheck className="w-3 h-3 text-muted-foreground/40" />{selectedLead.coverage_category}</div>}
                        </div>
                        {(selectedLead.monthly_budget || selectedLead.carrier_preference || selectedLead.network_preference) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {selectedLead.monthly_budget && <span className="text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{selectedLead.monthly_budget}</span>}
                            {selectedLead.carrier_preference && <span className="text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{selectedLead.carrier_preference}</span>}
                            {selectedLead.network_preference && <span className="text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{selectedLead.network_preference}</span>}
                          </div>
                        )}
                        {selectedLead.priorities?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {selectedLead.priorities.map((p, i) => (
                              <span key={i} className="text-[10px] font-medium bg-primary/[0.04] text-primary/70 rounded-full px-2 py-0.5">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Doctors */}
                      {leadDoctors.length > 0 && (
                        <div className="p-5">
                          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Doctors ({leadDoctors.length})</p>
                          <div className="space-y-1.5">
                            {leadDoctors.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-[12px] bg-slate-50 rounded-lg px-3 py-2">
                                <div><p className="font-medium text-foreground">{d.doctor_name}</p>{d.specialty && <p className="text-muted-foreground/50 text-[10px]">{d.specialty}</p>}</div>
                                {d.is_selected && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prescriptions */}
                      {leadRx.length > 0 && (
                        <div className="p-5">
                          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><Pill className="w-3 h-3" /> Prescriptions ({leadRx.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {leadRx.map(r => (
                              <span key={r.id} className="text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-1">
                                {r.medication_name} {r.dosage && <span className="text-purple-400">{r.dosage}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Plans */}
                      {leadPlans.length > 0 && (
                        <div className="p-5">
                          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><Scale className="w-3 h-3" /> Plans Viewed ({leadPlans.length})</p>
                          <div className="space-y-1.5">
                            {leadPlans.map(p => (
                              <div key={p.id} className="flex items-center justify-between text-[12px] bg-slate-50 rounded-lg px-3 py-2">
                                <div>
                                  <p className="font-medium text-foreground">{p.plan_name}</p>
                                  <p className="text-muted-foreground/50 text-[10px]">{p.carrier} · {p.metal_tier} · ${p.premium}/mo</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {p.was_compared && <Badge variant="outline" className="text-[8px] border-primary/20 text-primary/60">Compared</Badge>}
                                  {p.fit_label && <Badge variant="outline" className="text-[8px] border-amber-200 text-amber-600">{p.fit_label}</Badge>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {leadTags.length > 0 && (
                        <div className="p-5">
                          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {leadTags.map(t => (
                              <span key={t.id} className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                                {t.tag.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Flags */}
                      {leadFlags.length > 0 && (
                        <div className="p-5">
                          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><Flag className="w-3 h-3" /> Verification Flags</p>
                          <div className="space-y-1.5">
                            {leadFlags.map(f => (
                              <div key={f.id} className="flex items-center gap-2 text-[11px]">
                                <AlertCircle className={cn("w-3 h-3", f.resolved ? "text-emerald-500" : "text-amber-500")} />
                                <span className={cn("font-medium", f.resolved ? "text-muted-foreground line-through" : "text-foreground")}>{f.flag.replace(/_/g, " ")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Status update */}
                      <div className="p-5">
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Update Status</p>
                        <select value={selectedLead.status} onChange={e => updateStatus(selectedLead.id, e.target.value)}
                          className="w-full text-[12px] font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-foreground">
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>

                      {/* Notes */}
                      <div className="p-5">
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Notes</p>
                        <div className="flex gap-2 mb-3">
                          <Input placeholder="Add a note…" value={newNote} onChange={e => setNewNote(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addNote()}
                            className="text-[12px] h-9 border-slate-200" />
                          <Button size="sm" className="h-9 text-xs bg-primary text-primary-foreground" onClick={addNote} disabled={!newNote.trim()}>Add</Button>
                        </div>
                        {leadNotes.length > 0 ? (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {leadNotes.map(n => (
                              <div key={n.id} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-semibold text-foreground/70">{n.author}</span>
                                  <span className="text-[10px] text-muted-foreground/40">{new Date(n.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-[12px] text-foreground leading-relaxed">{n.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/40">No notes yet.</p>
                        )}
                      </div>

                      {/* Agent summary */}
                      <div className="p-5 bg-primary/[0.02]">
                        <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 flex items-center gap-1"><Eye className="w-3 h-3" /> Agent Briefing</p>
                        <div className="text-[12px] text-foreground/80 leading-relaxed space-y-1 bg-white border border-slate-200 rounded-lg p-3">
                          {leadDoctors.length > 0 && <p>• Searched for <strong>{leadDoctors.length}</strong> provider{leadDoctors.length !== 1 && "s"}{leadDoctors.filter(d => d.is_selected).length > 0 && ` (${leadDoctors.filter(d => d.is_selected).length} selected)`}</p>}
                          {leadRx.length > 0 && <p>• Added <strong>{leadRx.length}</strong> prescription{leadRx.length !== 1 && "s"}</p>}
                          {leadPlans.length > 0 && <p>• Viewed <strong>{leadPlans.length}</strong> plan{leadPlans.length !== 1 && "s"}{leadPlans.filter(p => p.was_compared).length > 0 && `, compared ${leadPlans.filter(p => p.was_compared).length}`}</p>}
                          {selectedLead.monthly_budget && <p>• Budget preference: <strong>{selectedLead.monthly_budget}</strong></p>}
                          {selectedLead.carrier_preference && <p>• Carrier interest: <strong>{selectedLead.carrier_preference}</strong></p>}
                          {selectedLead.network_preference && <p>• Network preference: <strong>{selectedLead.network_preference}</strong></p>}
                          {selectedLead.final_cta_taken && <p>• Final action: <strong>{selectedLead.final_cta_taken}</strong></p>}
                          <p>• Reached step <strong>{selectedLead.highest_step_reached}</strong> of 5</p>
                          <p>• Intent score: <strong>{selectedLead.intent_score}/100</strong> ({selectedLead.intent_level?.replace("_", " ")})</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
