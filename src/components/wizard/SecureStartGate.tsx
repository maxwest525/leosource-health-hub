import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Fingerprint, Loader2, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dur, ease } from "@/lib/motion";
import { useEnrollmentLock } from "@/hooks/use-enrollment-lock";

/** Match the sitewide deep-navy band instead of the brighter action blue. */
const inkVars = {
  "--primary": "var(--ink)",
  "--primary-foreground": "var(--ink-foreground)",
} as React.CSSProperties;

type Props = {
  /** Called once the member has acknowledged the notice, with or without a lock. */
  onStart: () => void;
};

/**
 * Pre-intake safety notice. Explains what we do and do not do with the
 * answers, then offers an optional device lock (Face ID or a 4-digit PIN) so
 * nobody else can resume the intake and switch the plan.
 */
export const SecureStartGate = ({ onStart }: Props) => {
  const { lock, passkeySupported, busy, error, acceptConsent, createPasskey, createPin } =
    useEnrollmentLock();
  const [mode, setMode] = useState<"choose" | "pin">("choose");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const begin = () => {
    acceptConsent();
    onStart();
  };

  const handlePasskey = async () => {
    const ok = await createPasskey();
    if (ok) begin();
    else setMode("pin");
  };

  const handlePin = async () => {
    setPinError(null);
    if (!/^\d{4}$/.test(pin)) {
      setPinError("Enter 4 digits.");
      return;
    }
    if (await createPin(pin)) begin();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.md, ease: ease.out }}
      className="mx-auto flex w-full max-w-[43rem] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
    >
      <div
        style={inkVars}
        className="flex items-center justify-between gap-3 border-b border-primary-foreground/10 bg-primary px-5 py-3.5"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary-foreground/85" strokeWidth={2} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13.5px] font-semibold leading-tight text-primary-foreground">
              Before you start
            </span>
            <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.18em] text-primary-foreground/55">
              Secure ACA intake
            </span>
          </span>
        </div>
        <span className="shrink-0 text-[9.5px] font-medium uppercase tracking-[0.18em] text-primary-foreground/50">
          TruEnroll #L118979
        </span>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" strokeWidth={2.2} />
          <div className="space-y-1 text-[11.5px] leading-relaxed text-foreground/80">
            <p className="font-semibold text-foreground">
              Official enrollment application notice
            </p>
            <p>
              Responses submitted here are used to determine plan eligibility, premium rates, and
              advance premium tax credits, and are reported on your Marketplace application under 45
              CFR 155. Inaccurate income, household, or residency information may result in adjusted
              subsidies, repayment at tax filing, or termination of coverage.
            </p>
          </div>
        </div>

        <ul className="grid gap-1.5 text-[11.5px] leading-relaxed text-muted-foreground sm:grid-cols-2">
          {[
            "Transmitted over TLS 1.2+ and stored encrypted.",
            "Accessed only by your licensed TruEnroll agent.",
            "Never sold or disclosed to third-party data brokers.",
            "No email or phone number required to begin.",
          ].map(item => (
            <li key={item} className="flex items-start gap-1.5">
              <Check className="mt-[3px] h-3 w-3 shrink-0 text-primary" strokeWidth={2.5} />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.2} />
            <div className="min-w-0 space-y-0.5">
              <p className="text-[12.5px] font-semibold text-foreground">
                Secure your application (optional)
              </p>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Add Face ID or a 4-digit PIN so no other user of this device can resume your
                application or change your plan selection.
              </p>
            </div>
          </div>


          {lock ? (
            <p className="mt-2.5 flex items-center gap-2 text-[11.5px] font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              {lock.method === "passkey" ? "Face ID lock is active" : "PIN lock is active"}
            </p>
          ) : mode === "choose" ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {passkeySupported && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 gap-2 text-[12.5px]"
                  disabled={busy}
                  onClick={handlePasskey}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Fingerprint className="h-3.5 w-3.5" strokeWidth={2.2} />
                  )}
                  Use Face ID
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 gap-2 text-[12.5px]"
                onClick={() => setMode("pin")}
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={2.2} />
                Use a 4-digit PIN
              </Button>
            </div>

          ) : (
            <div className="mt-3 space-y-2">
              <label htmlFor="lock-pin" className="sr-only">
                Create a 4-digit PIN
              </label>
              <div className="flex gap-2">
                <input
                  id="lock-pin"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  placeholder="••••"
                  value={pin}
                  onChange={e => {
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                    setPinError(null);
                  }}
                  className={cn(
                    "h-10 w-24 rounded-lg border border-border bg-background text-center text-base tracking-[0.4em] outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
                    pinError && "border-destructive",
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 text-[12.5px]"
                  disabled={busy}
                  onClick={handlePin}
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set PIN and continue"}
                </Button>
              </div>
              {(pinError ?? error) && (
                <p className="text-[11px] text-destructive">{pinError ?? error}</p>
              )}
            </div>
          )}

          {!lock && mode === "choose" && error && (
            <p className="mt-2 text-[11px] text-destructive">{error}</p>
          )}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-border/60 pt-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10.5px] leading-snug text-muted-foreground">
            By continuing, you acknowledge our privacy notice and attest that the information you
            provide is true and complete to the best of your knowledge.
          </p>
          <Button
            type="button"
            style={inkVars}
            className="h-10 shrink-0 gap-2 bg-primary text-[13px] text-primary-foreground hover:bg-primary/90"
            onClick={begin}
          >
            {lock ? "Start my intake" : "Continue without a lock"}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
          </Button>
        </div>

      </div>
    </motion.div>
  );
};
