import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, Flag, Loader2,
  LogOut, RefreshCw, Stethoscope, Pill, User, Undo2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  addAgentNote, approveReview, claimReview, createHandoff, listEnrollmentEvents,
  listReviewQueue, reconcileSession, releaseReview, requestCorrection,
  REVIEW_STATUS_LABEL, type EnrollmentEvent, type ReviewRecord, type ReviewStatus,
} from "@/lib/agent-review";
import { validateEnrollmentSession, type ValidationIssue } from "@/lib/enrollment-validation";

/** Mirrors the HealthSherpa agent-note contract enforced by the backend. */
const AGENT_NOTE_MAX = 500;

const STATUS_STYLE: Record<ReviewStatus, string> = {
  intake_in_progress: "bg-slate-100 text-slate-600 border-slate-200",
  awaiting_agent_review: "bg-amber-100 text-amber-700 border-amber-200",
  in_agent_review: "bg-blue-100 text-blue-700 border-blue-200",
  needs_consumer_correction: "bg-orange-100 text-orange-700 border-orange-200",
  agent_approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  handoff_created: "bg-indigo-100 text-indigo-700 border-indigo-200",
  enrollment_in_progress: "bg-cyan-100 text-cyan-700 border-cyan-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  reconciliation_required: "bg-rose-100 text-rose-700 border-rose-200",
  follow_up_required: "bg-purple-100 text-purple-700 border-purple-200",
};

const SEVERITY_STYLE: Record<ValidationIssue["severity"], string> = {
  blocker: "bg-red-50 border-red-200 text-red-700",
  conflict: "bg-amber-50 border-amber-200 text-amber-800",
  flag: "bg-slate-50 border-slate-200 text-slate-600",
};

const money = (value: number | null): string =>
  value === null ? "Not provided" : `$${value.toLocaleString()}`;

const timeAgo = (iso: string): string => {
  if (!iso) return "unknown";
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
};

const AgentReview = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<EnrollmentEvent[]>([]);
  const [note, setNote] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");
  const [markedFields, setMarkedFields] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/agent-login");
  }, [authLoading, user, navigate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listReviewQueue());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load the review queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const selected = useMemo(
    () => records.find(record => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setEvents([]);
      return;
    }
    void listEnrollmentEvents(selectedId).then(setEvents).catch(() => setEvents([]));
    setMarkedFields([]);
    setCorrectionNote("");
    setNote("");
  }, [selectedId]);

  const report = useMemo(() => (selected ? validateEnrollmentSession(selected) : null), [selected]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter(record =>
      [record.id, record.zipCode, record.state, record.contact?.email, record.contact?.lastName, record.assignedAgent]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query)),
    );
  }, [records, search]);

  const applyUpdate = (updated: ReviewRecord): void => {
    setRecords(prev => prev.map(record => (record.id === updated.id ? updated : record)));
  };

  const run = async (label: string, action: () => Promise<ReviewRecord>): Promise<void> => {
    setBusy(true);
    try {
      applyUpdate(await action());
      if (selectedId) setEvents(await listEnrollmentEvents(selectedId));
      toast.success(label);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "That action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleHandoff = async (regenerate: boolean): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await createHandoff(selected.id, { regenerate, agentNote: selected.agentNote ?? undefined });
      const url = result.client_apply_url ?? result.shopping_url;
      toast.success(result.already_created ? "Handoff already exists." : "HealthSherpa handoff created.");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      await refresh();
      setEvents(await listEnrollmentEvents(selected.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not create the handoff.");
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async (): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await reconcileSession(selected.id);
      toast[result.error ? "warning" : "success"](result.error ?? "Policy status updated.");
      await refresh();
      setEvents(await listEnrollmentEvents(selected.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reconciliation failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleField = (field: string): void => {
    setMarkedFields(prev => (prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]));
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-6 py-4">
          <ClipboardList className="h-5 w-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Enrollment review queue</h1>
          <Badge variant="outline" className="ml-1">{records.length}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search session, ZIP, agent, email"
              className="h-9 w-64"
              aria-label="Search the review queue"
            />
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn("mr-1.5 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-6 py-6 lg:grid-cols-[380px_1fr]">
        {/* Queue */}
        <section aria-label="Review queue" className="space-y-2">
          {loading && <p className="text-sm text-slate-500">Loading sessions…</p>}
          {!loading && visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <h2 className="mt-2 text-sm font-semibold text-slate-700">No sessions in review</h2>
              <p className="mt-1 text-sm text-slate-500">Sessions appear here once a consumer submits for review.</p>
            </div>
          )}
          {visible.map(record => (
            <button
              key={record.id}
              type="button"
              onClick={() => setSelectedId(record.id)}
              className={cn(
                "w-full rounded-xl border bg-white p-4 text-left transition hover:border-blue-300",
                selectedId === record.id ? "border-blue-500 ring-1 ring-blue-200" : "border-slate-200",
              )}
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-[11px]", STATUS_STYLE[record.reviewStatus])}>
                  {REVIEW_STATUS_LABEL[record.reviewStatus]}
                </Badge>
                <span className="ml-auto text-[11px] text-slate-400">{timeAgo(record.updatedAt)}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {record.contact?.firstName || record.contact?.lastName
                  ? `${record.contact?.firstName ?? ""} ${record.contact?.lastName ?? ""}`.trim()
                  : `Session ${record.id.slice(0, 8)}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {record.zipCode ?? "no ZIP"} · {record.state ?? "—"} · household {record.householdSize ?? "?"} ·{" "}
                {money(record.annualIncome)}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {record.assignedAgent ? `Assigned to ${record.assignedAgent}` : "Unassigned"}
              </p>
            </button>
          ))}
        </section>

        {/* Detail */}
        <section aria-label="Review detail">
          {!selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Select a session to review it.
            </div>
          )}

          {selected && report && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn(STATUS_STYLE[selected.reviewStatus])}>
                    {REVIEW_STATUS_LABEL[selected.reviewStatus]}
                  </Badge>
                  <span className="text-xs text-slate-500">Session {selected.id}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    {selected.assignedAgent ? `Claimed by ${selected.assignedAgent}` : "Unassigned"} · last activity{" "}
                    {timeAgo(selected.updatedAt)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("Review claimed.", () => claimReview(selected.id))}>
                    Claim review
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => void run("Assignment released.", () => releaseReview(selected.id))}>
                    <Undo2 className="mr-1.5 h-4 w-4" />
                    Release
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy || !report.canApprove}
                    onClick={() => void run("Session approved.", () => approveReview(selected.id))}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || selected.reviewStatus !== "agent_approved"}
                    onClick={() => void handleHandoff(false)}
                  >
                    <ArrowUpRight className="mr-1.5 h-4 w-4" />
                    Create HealthSherpa handoff
                  </Button>
                  {selected.handoffStatus === "created" && (
                    <>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void handleHandoff(true)}>
                        Regenerate handoff
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void handleReconcile()}>
                        <RefreshCw className="mr-1.5 h-4 w-4" />
                        Reconcile
                      </Button>
                    </>
                  )}
                </div>

                {!report.canApprove && (
                  <p className="mt-3 text-xs text-red-600">
                    Approval is blocked until the blockers and conflicts below are resolved.
                  </p>
                )}
              </div>

              {/* Validation */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Validation ({report.blockers.length} blockers, {report.conflicts.length} conflicts, {report.flags.length} flags)
                </h2>
                {report.issues.length === 0 && (
                  <p className="mt-2 text-sm text-emerald-700">Everything required for the handoff is present.</p>
                )}
                <ul className="mt-3 space-y-2">
                  {report.issues.map(issue => (
                    <li
                      key={`${issue.field}-${issue.message}`}
                      className={cn("flex items-start gap-3 rounded-lg border p-3 text-xs", SEVERITY_STYLE[issue.severity])}
                    >
                      <span className="font-mono text-[11px] opacity-70">{issue.field}</span>
                      <span className="flex-1">{issue.message}</span>
                      <button
                        type="button"
                        onClick={() => toggleField(issue.field)}
                        className={cn(
                          "shrink-0 rounded border px-2 py-0.5 text-[11px]",
                          markedFields.includes(issue.field) ? "border-orange-400 bg-orange-100 text-orange-800" : "border-slate-300",
                        )}
                      >
                        <Flag className="mr-1 inline h-3 w-3" />
                        {markedFields.includes(issue.field) ? "Marked" : "Mark"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <User className="h-4 w-4 text-blue-600" />
                    Household &amp; income
                  </h2>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between"><dt>Location</dt><dd>{selected.zipCode ?? "—"} · {selected.countyFips ?? "no county"} · {selected.state ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>Household size</dt><dd>{selected.householdSize ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>Annual income</dt><dd>{money(selected.annualIncome)}</dd></div>
                    <div className="flex justify-between"><dt>Effective date</dt><dd>{selected.effectiveDate ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>Contact</dt><dd>{selected.contact?.email ?? selected.contact?.phone ?? "—"}</dd></div>
                  </dl>
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {selected.members.map((member, index) => (
                      <li key={`${member.dob}-${index}`}>
                        {member.relationship} · DOB {member.dob || "missing"} · tobacco {member.tobacco ? "yes" : "no"}
                        {typeof member.income === "number" ? ` · income $${member.income.toLocaleString()}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-900">Selected plan &amp; handoff</h2>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between"><dt>Plan</dt><dd>{selected.selectedPlan?.name ?? "None selected"}</dd></div>
                    <div className="flex justify-between"><dt>Carrier</dt><dd>{selected.selectedPlan?.issuerName ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>External ID</dt><dd className="font-mono">{selected.externalId ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>Handoff status</dt><dd>{selected.handoffStatus ?? "none"}</dd></div>
                    <div className="flex justify-between"><dt>Confirmation ID</dt><dd>{selected.healthsherpaConfirmationId ?? "—"}</dd></div>
                    <div className="flex justify-between"><dt>Policy status</dt><dd>{selected.policyStatus.policy_status}</dd></div>
                    <div className="flex justify-between"><dt>Payment status</dt><dd>{selected.policyStatus.payment_status}</dd></div>
                    <div className="flex justify-between"><dt>Last reconciled</dt><dd>{selected.lastReconciledAt ? timeAgo(selected.lastReconciledAt) : "never"}</dd></div>
                  </dl>
                  {selected.reconciliationError && (
                    <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                      {selected.reconciliationError}
                    </p>
                  )}
                  {selected.healthsherpaClientApplyUrl && (
                    <a
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline"
                      href={selected.healthsherpaClientApplyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open client apply link <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    Saved doctors
                  </h2>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {selected.savedDoctors.length === 0 && <li>None saved.</li>}
                    {selected.savedDoctors.map(doctor => (
                      <li key={doctor.id}>{doctor.name} · NPI {doctor.id || "missing"}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Pill className="h-4 w-4 text-blue-600" />
                    Saved prescriptions
                  </h2>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {selected.savedPrescriptions.length === 0 && <li>None saved.</li>}
                    {selected.savedPrescriptions.map(rx => (
                      <li key={rx.id}>{rx.name}{rx.dosage ? ` · ${rx.dosage}` : ""}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Notes and corrections */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-900">Internal note</h2>
                  <Textarea
                    value={note}
                    maxLength={AGENT_NOTE_MAX}
                    onChange={event => setNote(event.target.value)}
                    placeholder="Notes stay internal and are attached to the audit history."
                    className="mt-2 text-sm"
                    rows={3}
                  />
                  <p className={`mt-1 text-[11px] ${note.trim().length > AGENT_NOTE_MAX ? "text-red-600" : "text-slate-400"}`}>
                    {note.trim().length}/{AGENT_NOTE_MAX} characters
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={busy || note.trim().length === 0 || note.trim().length > AGENT_NOTE_MAX}
                    onClick={() => {
                      const value = note.trim();
                      if (value.length > AGENT_NOTE_MAX) {
                        toast.error(`Notes must be ${AGENT_NOTE_MAX} characters or fewer.`);
                        return;
                      }
                      void run("Note saved.", () => addAgentNote(selected.id, value)).then(() => setNote(""));
                    }}
                  >
                    Save note
                  </Button>
                  {selected.agentNote && (
                    <p className="mt-3 text-xs text-slate-500">
                      Latest: {selected.agentNote}
                      {selected.agentNote.length > AGENT_NOTE_MAX && (
                        <span className="mt-1 block font-semibold text-red-600">
                          This stored note is {selected.agentNote.length} characters and blocks the HealthSherpa handoff.
                          Replace it with a note of {AGENT_NOTE_MAX} characters or fewer.
                        </span>
                      )}
                    </p>
                  )}
                </div>


                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="text-sm font-bold text-slate-900">Return to consumer</h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {markedFields.length} field{markedFields.length === 1 ? "" : "s"} marked for correction.
                  </p>
                  <Textarea
                    value={correctionNote}
                    onChange={event => setCorrectionNote(event.target.value)}
                    placeholder="What does the consumer need to fix?"
                    className="mt-2 text-sm"
                    rows={3}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    disabled={busy || correctionNote.trim().length === 0}
                    onClick={() =>
                      void run("Sent back to the consumer.", () =>
                        requestCorrection(selected.id, correctionNote.trim(), markedFields),
                      )
                    }
                  >
                    Request correction
                  </Button>
                </div>
              </div>

              {/* Audit history */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-bold text-slate-900">Audit history</h2>
                <ol className="mt-3 space-y-2">
                  {events.length === 0 && <li className="text-xs text-slate-500">No events recorded yet.</li>}
                  {events.map(event => (
                    <li key={event.id} className="flex gap-3 text-xs text-slate-600">
                      <span className="w-32 shrink-0 text-slate-400">{new Date(event.createdAt).toLocaleString()}</span>
                      <span className="font-semibold text-slate-800">{event.eventType.replace(/_/g, " ")}</span>
                      <span className="text-slate-400">{event.actor}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AgentReview;
