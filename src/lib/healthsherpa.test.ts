import { describe, expect, it } from "vitest";
import {
  defaultEffectiveDate,
  upcomingEffectiveDates,
  formatEnumLabel,
  planYearFromEffectiveDate,
} from "@/lib/healthsherpa-format";

describe("defaultEffectiveDate", () => {
  it("returns the first day of the next month", () => {
    expect(defaultEffectiveDate(new Date(Date.UTC(2026, 4, 17)))).toBe("2026-06-01");
  });

  it("rolls over the year in December", () => {
    expect(defaultEffectiveDate(new Date(Date.UTC(2026, 11, 3)))).toBe("2027-01-01");
  });
});

describe("planYearFromEffectiveDate", () => {
  it("derives the plan year from the date", () => {
    expect(planYearFromEffectiveDate("2027-01-01")).toBe(2027);
  });
});

describe("formatEnumLabel", () => {
  it("humanises snake case metal levels", () => {
    expect(formatEnumLabel("expanded_bronze")).toBe("Expanded Bronze");
  });

  it("uppercases network acronyms", () => {
    expect(formatEnumLabel("ppo")).toBe("PPO");
  });

  it("handles missing values", () => {
    expect(formatEnumLabel(undefined)).toBe("Not reported");
  });
});

describe("upcomingEffectiveDates", () => {
  it("returns the next four first-of-month dates", () => {
    expect(upcomingEffectiveDates(4, new Date(Date.UTC(2026, 7, 17)))).toEqual([
      { value: "2026-09-01", label: "09/01/2026" },
      { value: "2026-10-01", label: "10/01/2026" },
      { value: "2026-11-01", label: "11/01/2026" },
      { value: "2026-12-01", label: "12/01/2026" },
    ]);
  });

  it("rolls over into the next year", () => {
    expect(upcomingEffectiveDates(2, new Date(Date.UTC(2026, 11, 3)))).toEqual([
      { value: "2027-01-01", label: "01/01/2027" },
      { value: "2027-02-01", label: "02/01/2027" },
    ]);
  });
});
