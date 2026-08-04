import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, CheckCircle2, AlertCircle, Loader2, Database,
  ArrowLeft, FileText, BarChart3, RefreshCw, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type ImportStatus = "idle" | "loading" | "importing" | "done" | "error";

type BatchResult = {
  batch: number;
  total: number;
  created: number;
  failed: number;
  errors: string[];
  status: "pending" | "importing" | "done" | "error";
};

type ImportLog = {
  id: string;
  domain: string;
  source_name: string;
  status: string;
  records_processed: number;
  records_created: number;
  records_failed: number;
  version_tag: string | null;
  completed_at: string | null;
  started_at: string | null;
};

const TOTAL_BATCHES = 9;

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */

export default function AdminDataImport() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [carrierResult, setCarrierResult] = useState<{ created: number; failed: number } | null>(null);
  const [planBatches, setPlanBatches] = useState<BatchResult[]>([]);
  const [currentBatch, setCurrentBatch] = useState(-1);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [dbStats, setDbStats] = useState<{ carriers: number; plans: number; enriched?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Enrichment state
  const [enrichStatus, setEnrichStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [enrichResult, setEnrichResult] = useState<{ enriched: number; failed: number; total: number; errors?: string[] } | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !session) navigate("/agent-login");
  }, [session, loading, navigate]);

  // Load stats and logs
  useEffect(() => {
    loadStats();
    loadLogs();
  }, []);

  async function loadStats() {
    const [{ count: cc }, { count: pc }, { count: ec }] = await Promise.all([
      supabase.from("carriers").select("*", { count: "exact", head: true }),
      supabase.from("plans").select("*", { count: "exact", head: true }),
      supabase.from("plans").select("*", { count: "exact", head: true }).eq("data_confidence", "enriched"),
    ]);
    setDbStats({ carriers: cc ?? 0, plans: pc ?? 0, enriched: ec ?? 0 });
  }

  async function loadLogs() {
    const { data } = await supabase
      .from("data_import_log")
      .select("*")
      .in("source_name", ["healthcare.gov", "healthcare.gov-api-enrichment"])
      .order("started_at", { ascending: false })
      .limit(20);
    setImportLogs((data as ImportLog[]) || []);
  }

  async function runEnrichBatch(batchSize = 25) {
    setEnrichStatus("running");
    setEnrichError(null);
    setEnrichResult(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("enrich-hcgov-plan", {
        body: { action: "enrich_batch", limit: batchSize },
      });

      if (fnErr) throw new Error(fnErr.message);

      setEnrichResult({
        enriched: data.enriched,
        failed: data.failed,
        total: data.total,
        errors: data.errors,
      });
      setEnrichStatus("done");
      loadStats();
      loadLogs();
    } catch (e: any) {
      setEnrichError(e.message);
      setEnrichStatus("error");
    }
  }

  async function runFullImport() {
    setStatus("importing");
    setError(null);
    setCarrierResult(null);
    setPlanBatches([]);
    setCurrentBatch(-1);

    const token = session?.access_token;
    if (!token) { setError("Not authenticated"); setStatus("error"); return; }

    try {
      // Step 1: Import carriers
      const carriersResp = await fetch("/data/hcgov_carriers.json");
      const carriers = await carriersResp.json();

      const { data: carrierData, error: carrierErr } = await supabase.functions.invoke(
        "import-hcgov-plans",
        { body: { action: "import_carriers", carriers } }
      );

      if (carrierErr) throw new Error(`Carrier import failed: ${carrierErr.message}`);
      setCarrierResult({ created: carrierData.created, failed: carrierData.failed });

      // Step 2: Import plan batches
      const batches: BatchResult[] = Array.from({ length: TOTAL_BATCHES }, (_, i) => ({
        batch: i, total: 0, created: 0, failed: 0, errors: [], status: "pending" as const,
      }));
      setPlanBatches(batches);

      for (let i = 0; i < TOTAL_BATCHES; i++) {
        setCurrentBatch(i);
        batches[i].status = "importing";
        setPlanBatches([...batches]);

        try {
          const plansResp = await fetch(`/data/hcgov_plans_batch_${i}.json`);
          const plans = await plansResp.json();

          const { data: planData, error: planErr } = await supabase.functions.invoke(
            "import-hcgov-plans",
            { body: { action: "import_plans", plans, batchIndex: i, totalBatches: TOTAL_BATCHES } }
          );

          if (planErr) throw new Error(planErr.message);

          batches[i] = {
            ...batches[i],
            total: planData.total,
            created: planData.created,
            failed: planData.failed,
            errors: planData.errors || [],
            status: "done",
          };
        } catch (batchErr: any) {
          batches[i] = { ...batches[i], status: "error", errors: [batchErr.message] };
        }
        setPlanBatches([...batches]);
      }

      setStatus("done");
      loadStats();
      loadLogs();
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  const totalPlansCreated = planBatches.reduce((s, b) => s + b.created, 0);
  const totalPlansFailed = planBatches.reduce((s, b) => s + b.failed, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1.5 text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-sm font-semibold text-slate-800 tracking-tight">
            Healthcare.gov Data Import
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* DB Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Carriers in Database</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                  {dbStats?.carriers ?? "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Plans in Database</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                  {dbStats?.plans ?? "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Enriched Plans</p>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">
                  {dbStats?.enriched ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Import Action */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Import Healthcare.gov Plan Data
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                111 carriers • 4,044 unique plans • 30 states • 97K county-level records
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Source: Individual Market Medical (2026) via data.healthcare.gov
              </p>
            </div>
            <Button
              onClick={runFullImport}
              disabled={status === "importing"}
              className="gap-2"
              size="sm"
            >
              {status === "importing" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
              ) : status === "done" ? (
                <><RefreshCw className="w-4 h-4" /> Re-Import</>
              ) : (
                <><Upload className="w-4 h-4" /> Start Import</>
              )}
            </Button>
          </div>

          {/* Carrier Result */}
          {carrierResult && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-800">
                  Carriers: {carrierResult.created} imported
                  {carrierResult.failed > 0 && `, ${carrierResult.failed} failed`}
                </span>
              </div>
            </div>
          )}

          {/* Plan Batches */}
          {planBatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Plan Batches ({TOTAL_BATCHES})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {planBatches.map((b, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 text-xs",
                      b.status === "done" && "bg-emerald-50 border-emerald-200",
                      b.status === "importing" && "bg-amber-50 border-amber-200",
                      b.status === "error" && "bg-red-50 border-red-200",
                      b.status === "pending" && "bg-slate-50 border-slate-200",
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {b.status === "importing" && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
                      {b.status === "done" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {b.status === "error" && <AlertCircle className="w-3 h-3 text-red-600" />}
                      <span className="font-medium">Batch {i + 1}</span>
                    </div>
                    {b.status !== "pending" && (
                      <p className="text-slate-600 tabular-nums">
                        {b.created}/{b.total} plans
                        {b.failed > 0 && <span className="text-red-600"> ({b.failed} failed)</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {status === "done" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-800 text-sm">Import Complete</p>
                      <p className="text-xs text-emerald-700 tabular-nums">
                        {totalPlansCreated} plans imported successfully
                        {totalPlansFailed > 0 && ` • ${totalPlansFailed} failed`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Enrich Plans */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">
                Enrich Plans via Healthcare.gov API
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Fetch SBC documents, formulary URLs, brochure links, and quality data for imported plans
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Processes un-enriched plans in batches with rate limiting
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => runEnrichBatch(10)}
                disabled={enrichStatus === "running"}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {enrichStatus === "running" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enriching...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Enrich 10</>
                )}
              </Button>
              <Button
                onClick={() => runEnrichBatch(50)}
                disabled={enrichStatus === "running"}
                size="sm"
                className="gap-2"
              >
                {enrichStatus === "running" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enriching...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Enrich 50</>
                )}
              </Button>
            </div>
          </div>

          {enrichResult && (
            <div className={cn(
              "rounded-lg border p-4",
              enrichResult.failed > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200",
            )}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn("w-5 h-5", enrichResult.failed > 0 ? "text-amber-600" : "text-emerald-600")} />
                <div>
                  <p className={cn("font-semibold text-sm", enrichResult.failed > 0 ? "text-amber-800" : "text-emerald-800")}>
                    Enrichment Complete
                  </p>
                  <p className={cn("text-xs tabular-nums", enrichResult.failed > 0 ? "text-amber-700" : "text-emerald-700")}>
                    {enrichResult.enriched} enriched • {enrichResult.failed} failed • {enrichResult.total} processed
                  </p>
                </div>
              </div>
              {enrichResult.errors && enrichResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-amber-700 space-y-0.5">
                  {enrichResult.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="truncate">• {e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {enrichError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4" />
                <span>{enrichError}</span>
              </div>
            </div>
          )}
        </div>

        {/* Import History */}
        {importLogs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Import History
            </h2>
            <div className="space-y-2">
              {importLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        log.status === "completed" && "border-emerald-200 text-emerald-700 bg-emerald-50",
                        log.status === "completed_with_errors" && "border-amber-200 text-amber-700 bg-amber-50",
                      )}
                    >
                      {log.status?.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm text-slate-700 font-medium">{log.domain}</span>
                    {log.version_tag && (
                      <span className="text-xs text-slate-400">{log.version_tag}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 tabular-nums">
                    <span>{log.records_created} created</span>
                    {log.records_failed > 0 && (
                      <span className="text-red-500">{log.records_failed} failed</span>
                    )}
                    <span>
                      {log.completed_at
                        ? new Date(log.completed_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
