export type IncomePeriod = "year" | "month";

export type SavedIncome = {
  income: number;
  period: IncomePeriod;
};

const STORAGE_KEY = "truenroll:compare-income";

/** Reads the last income value the user set in the plan comparison wizard. */
export function readSavedIncome(): SavedIncome | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const income = record.income;
    const period = record.period;
    if (typeof income !== "number" || !Number.isFinite(income) || income < 0) return null;
    return {
      income: Math.min(400000, Math.round(income)),
      period: period === "month" ? "month" : "year",
    };
  } catch {
    return null;
  }
}

/** Persists the income value so it survives navigation away from the wizard. */
export function writeSavedIncome(income: number, period: IncomePeriod): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ income, period }));
  } catch {
    // Storage unavailable (private mode / quota) - income simply will not persist.
  }
}

/** Clears the stored income, e.g. when the user restarts the wizard. */
export function clearSavedIncome(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
