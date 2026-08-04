import { ExternalLink, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnrollmentSession } from "@/hooks/use-enrollment-session";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shown after a licensed agent creates the HealthSherpa handoff.
 *
 * TruEnroll stays open in this tab with the plan and answers intact, and the
 * enrollment link opens in a new one. Trudy can explain anything already saved
 * in this session, but she cannot see or control the HealthSherpa page.
 */
export const HandoffCompanion = () => {
  const { session } = useEnrollmentSession();
  const url = session?.healthsherpaClientApplyUrl ?? session?.healthsherpaEnrollmentUrl;

  if (!session || session.handoffStatus !== "created" || !url) return null;

  const open = (): void => {
    window.open(url, "_blank", "noopener,noreferrer");
    void supabase.functions
      .invoke("healthsherpa-handoff", { body: { action: "mark_opened", session_id: session.id } })
      .catch(() => undefined);
  };

  return (
    <aside
      aria-label="Enrollment handoff"
      className="mx-4 mt-24 max-w-[1240px] lg:mx-auto rounded-2xl border border-[#CFE6F7] bg-[#F5FBFF] px-5 py-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[#1877D2]" aria-hidden />
        <div className="min-w-[240px] flex-1">
          <p className="text-[15px] font-bold text-[#0F2B46]">Your enrollment is ready on HealthSherpa</p>
          <p className="mt-0.5 text-[13px] text-[#41627E]">
            {session.selectedPlan
              ? `We saved ${session.selectedPlan.name} and your answers here. `
              : "We saved your answers here. "}
            The enrollment opens in a new tab, so you can come back to Trudy at any time.
          </p>
        </div>
        <Button onClick={open} className="shrink-0">
          Open enrollment
          <ExternalLink className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[12px] text-[#6C8BA3]">
        <Info className="mt-[2px] h-3.5 w-3.5 shrink-0" aria-hidden />
        Trudy can explain anything saved in your TruEnroll session, but she cannot see or fill in the HealthSherpa page.
        Speak with a specialist if you get stuck there.
      </p>
    </aside>
  );
};
