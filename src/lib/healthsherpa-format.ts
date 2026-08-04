import type { HsPlan } from "@/lib/healthsherpa";

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/** First day of next month, as YYYY-MM-DD, derived at runtime. */
export const defaultEffectiveDate = (from: Date = new Date()): string => {
  const next = new Date(Date.UTC(from.getFullYear(), from.getMonth() + 1, 1));
  return next.toISOString().slice(0, 10);
};

/** Upcoming first-of-month coverage start dates, e.g. 09/01/2026. */
export const upcomingEffectiveDates = (
  count = 4,
  from: Date = new Date(),
): Array<{ value: string; label: string }> =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1 + i, 1));
    const value = d.toISOString().slice(0, 10);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return { value, label: `${mm}/01/${d.getUTCFullYear()}` };
  });

/** Plan year implied by an effective date. */
export const planYearFromEffectiveDate = (effectiveDate: string): number =>
  Number(effectiveDate.slice(0, 4));

/** Turns API enum values like `expanded_bronze` into readable labels. */
export const formatEnumLabel = (value?: string | null): string => {
  if (!value) return "Not reported";
  const spaced = value.replace(/_/g, " ").trim();
  if (/^(hmo|ppo|epo|pos)$/i.test(spaced)) return spaced.toUpperCase();
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

/** The API returns numeric fields as strings in places, so coerce defensively. */
export const toNumber = (value?: number | string | null): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const formatUsd = (value?: number | string | null, withCents = false): string => {
  const numeric = toNumber(value);
  return typeof numeric === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: withCents ? 2 : 0,
        maximumFractionDigits: withCents ? 2 : 0,
      }).format(numeric)
    : "Not reported";
};

/** Net premium with a gross fallback, per the documented rendering rules. */
export const displayPremium = (plan: HsPlan): number | undefined =>
  toNumber(plan.pricing?.net_premium) ?? toNumber(plan.pricing?.gross_premium);

