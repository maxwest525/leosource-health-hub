/**
 * Small shared handoff between the homepage hero finder and the plan wizard.
 * Kept in sessionStorage so a reload of /wizard keeps the visitor's answers.
 */

export type WizardCategory = "Individual & Family" | "Medicare" | "Dental & Vision";

export type WizardPrefill = {
  zip: string;
  category: WizardCategory | "";
  ages: number[];
  income: number;
  tobacco: boolean[];
};

const STORAGE_KEY = "leosource.wizard.prefill";

const isBrowser = (): boolean => typeof window !== "undefined";

export const saveWizardPrefill = (prefill: WizardPrefill): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(prefill));
  } catch {
    /* storage unavailable — the wizard simply starts empty */
  }
};

export const readWizardPrefill = (): WizardPrefill | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<WizardPrefill>;
    if (!parsed || typeof parsed.zip !== "string") return null;
    const ages = Array.isArray(parsed.ages) && parsed.ages.length > 0 ? parsed.ages.map(Number) : [30];
    return {
      zip: parsed.zip,
      category: (parsed.category as WizardCategory) ?? "",
      ages,
      income: typeof parsed.income === "number" ? parsed.income : 50000,
      tobacco: Array.isArray(parsed.tobacco) && parsed.tobacco.length === ages.length
        ? parsed.tobacco.map(Boolean)
        : ages.map(() => false),
    };
  } catch {
    return null;
  }
};

export const clearWizardPrefill = (): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
};
