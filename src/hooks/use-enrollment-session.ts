/**
 * Shared access to the server-persisted TruEnroll enrollment session.
 *
 * Every consumer surface (intake, doctors, prescriptions, subsidy) mounts this
 * hook. It resolves the one canonical session for the visitor, paints from the
 * local cache while the round trip is in flight, and exposes a `patch` that
 * writes back to the server row.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureEnrollmentSession,
  isConsumerEditable,
  readCachedSession,
  patchEnrollmentSession,
  type EnrollmentPatch,
  type EnrollmentSession,
} from "@/lib/enrollment-session";

export type UseEnrollmentSession = {
  /** Null until the first server read resolves (cache paints before that). */
  session: EnrollmentSession | null;
  /** True once the server row has been read at least once this mount. */
  ready: boolean;
  /** False when an agent holds the session and the consumer may not edit. */
  canEdit: boolean;
  error: string | null;
  patch: (patch: EnrollmentPatch) => Promise<EnrollmentSession | null>;
};

export const useEnrollmentSession = (): UseEnrollmentSession => {
  const [session, setSession] = useState<EnrollmentSession | null>(() => readCachedSession());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void ensureEnrollmentSession()
      .then(next => {
        if (!mounted.current) return;
        setSession(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!mounted.current) return;
        setError(e instanceof Error ? e.message : "Could not start your session.");
      })
      .finally(() => {
        if (mounted.current) setReady(true);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const patch = useCallback(async (next: EnrollmentPatch): Promise<EnrollmentSession | null> => {
    try {
      const saved = await patchEnrollmentSession(next);
      if (mounted.current) {
        setSession(saved);
        setError(null);
      }
      return saved;
    } catch (e: unknown) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Could not save your answers.");
      return null;
    }
  }, []);

  return { session, ready, canEdit: isConsumerEditable(session), error, patch };
};
