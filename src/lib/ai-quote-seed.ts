/**
 * One-shot handoff from the homepage hero into the AI quote walkthrough.
 * The hero stores the visitor's opening question and /ai-quote consumes it
 * on mount so the conversation starts mid-flight instead of at the greeting.
 */

const SEED_KEY = "truenroll.aiquote.seed";

const isBrowser = (): boolean => typeof window !== "undefined";

export const saveAiQuoteSeed = (question: string): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(SEED_KEY, question.trim());
  } catch {
    /* storage unavailable — the walkthrough simply starts at the greeting */
  }
};

/** Reads and clears the pending question, so a reload does not resend it. */
export const takeAiQuoteSeed = (): string | null => {
  if (!isBrowser()) return null;
  try {
    const value = window.sessionStorage.getItem(SEED_KEY);
    if (value) window.sessionStorage.removeItem(SEED_KEY);
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
};
