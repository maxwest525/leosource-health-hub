import { useCallback, useEffect, useState } from "react";

export type LockMethod = "passkey" | "pin";

export type EnrollmentLock = {
  method: LockMethod;
  /** Opaque handle for a platform passkey, or the salted hash for a PIN. */
  handle: string;
  salt?: string;
  createdAt: string;
};

const STORAGE_KEY = "lsia.enrollment-lock";
const CONSENT_KEY = "lsia.intake-consent";

const readLock = (): EnrollmentLock | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EnrollmentLock) : null;
  } catch {
    return null;
  }
};

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

const randomHex = (bytes: number): string => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
};

/** Salted SHA-256 so a raw PIN never touches storage. */
const hashPin = async (pin: string, salt: string): Promise<string> => {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest("SHA-256", data));
};

/**
 * Device-bound lock for an in-progress enrollment. No email or phone is
 * collected: a platform passkey (Face ID / Touch ID) or a 4-digit PIN keeps
 * anyone else on the device from resuming or changing the plan.
 */
export const useEnrollmentLock = () => {
  const [lock, setLock] = useState<EnrollmentLock | null>(null);
  const [consented, setConsented] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLock(readLock());
    setConsented(window.localStorage.getItem(CONSENT_KEY) === "1");
    if (typeof window.PublicKeyCredential === "undefined") return;
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setPasskeySupported)
      .catch(() => setPasskeySupported(false));
  }, []);

  const persist = useCallback((next: EnrollmentLock) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setLock(next);
  }, []);

  const acceptConsent = useCallback(() => {
    window.localStorage.setItem(CONSENT_KEY, "1");
    setConsented(true);
  }, []);

  const createPasskey = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "TruEnroll" },
          user: { id: userId, name: "Secure enrollment", displayName: "Secure enrollment" },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred",
          },
          timeout: 60_000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;

      if (!credential) throw new Error("cancelled");
      persist({ method: "passkey", handle: credential.id, createdAt: new Date().toISOString() });
      return true;
    } catch {
      setError("We could not set up Face ID on this device. You can use a 4-digit PIN instead.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [persist]);

  const createPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!/^\d{4}$/.test(pin)) {
        setError("Enter 4 digits.");
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const salt = randomHex(16);
        persist({ method: "pin", handle: await hashPin(pin, salt), salt, createdAt: new Date().toISOString() });
        return true;
      } finally {
        setBusy(false);
      }
    },
    [persist],
  );

  const verifyPin = useCallback(
    async (pin: string): Promise<boolean> => {
      const current = readLock();
      if (!current || current.method !== "pin" || !current.salt) return false;
      return (await hashPin(pin, current.salt)) === current.handle;
    },
    [],
  );

  const clearLock = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setLock(null);
  }, []);

  return {
    lock,
    consented,
    passkeySupported,
    busy,
    error,
    acceptConsent,
    createPasskey,
    createPin,
    verifyPin,
    clearLock,
  };
};
