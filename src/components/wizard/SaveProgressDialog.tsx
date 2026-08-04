import { useEffect, useState } from "react";
import { Fingerprint, Loader2, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEnrollmentLock } from "@/hooks/use-enrollment-lock";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired once a lock exists so the caller can write the snapshot. */
  onLocked: () => void;
};

/**
 * Shown when someone taps Save without a device lock. Saving is only offered
 * behind Face ID / Touch ID or a 4-digit PIN so nobody else on the device can
 * resume the application or switch the plan.
 */
export const SaveProgressDialog = ({ open, onOpenChange, onLocked }: Props) => {
  const { passkeySupported, busy, error, createPasskey, createPin } = useEnrollmentLock();
  const [mode, setMode] = useState<"choose" | "pin">("choose");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMode("choose");
      setPin("");
      setPinError(null);
    }
  }, [open]);

  const finish = () => {
    onOpenChange(false);
    onLocked();
  };

  const handlePasskey = async () => {
    if (await createPasskey()) finish();
    else setMode("pin");
  };

  const handlePin = async () => {
    setPinError(null);
    if (!/^\d{4}$/.test(pin)) {
      setPinError("Enter 4 digits.");
      return;
    }
    if (await createPin(pin)) finish();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[26rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[16px]">
            <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={2.2} />
            Lock your application first
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Saved progress stays on this device. Add Face ID or a 4-digit PIN so nobody else can
            resume your application or switch your plan.
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" ? (
          <div className="flex flex-col gap-2">
            {passkeySupported && (
              <Button onClick={handlePasskey} disabled={busy} className="w-full font-semibold">
                {busy ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="mr-1.5 h-4 w-4" />
                )}
                Use Face ID / Touch ID
              </Button>
            )}
            <Button variant="outline" onClick={() => setMode("pin")} className="w-full">
              <Lock className="mr-1.5 h-4 w-4" />
              Create a 4-digit PIN
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              aria-label="Create a 4-digit PIN"
              className="text-center text-lg tracking-[0.6em]"
            />
            <Button onClick={handlePin} disabled={busy} className="w-full font-semibold">
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Set PIN and save
            </Button>
            {passkeySupported && (
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Use Face ID instead
              </button>
            )}
          </div>
        )}

        {(pinError || error) && (
          <p role="alert" className="text-[12px] font-medium text-destructive">
            {pinError ?? error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
