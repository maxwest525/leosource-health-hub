/**
 * Pre-approval validation for the canonical enrollment session.
 *
 * Nothing here mutates the session. Conflicts are surfaced to the agent so a
 * human decides; we never silently overwrite consumer answers.
 */

import type { EnrollmentSession } from "@/lib/enrollment-session";

export type IssueSeverity = "blocker" | "conflict" | "flag";

export type ValidationIssue = {
  /** Canonical field path an agent can mark for correction. */
  field: string;
  severity: IssueSeverity;
  message: string;
};

export type ValidationReport = {
  issues: ValidationIssue[];
  blockers: ValidationIssue[];
  conflicts: ValidationIssue[];
  flags: ValidationIssue[];
  canApprove: boolean;
};

const AGE_MS = 365.2425 * 24 * 60 * 60 * 1000;

const ageFromDob = (dob: string): number | null => {
  const parsed = Date.parse(dob);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((Date.now() - parsed) / AGE_MS);
};

const isIsoDate = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Validates the canonical session against everything HealthSherpa and CMS require. */
export const validateEnrollmentSession = (session: EnrollmentSession): ValidationReport => {
  const issues: ValidationIssue[] = [];
  const add = (field: string, severity: IssueSeverity, message: string): void => {
    issues.push({ field, severity, message });
  };

  /* -------- location -------- */
  if (!session.zipCode) add("zip_code", "blocker", "ZIP code is missing.");
  else if (!/^\d{5}$/.test(session.zipCode)) add("zip_code", "blocker", "ZIP code must be 5 digits.");

  if (!session.countyFips) add("county_fips", "blocker", "County (FIPS) was never resolved for this ZIP.");
  else if (!/^\d{4,5}$/.test(session.countyFips)) add("county_fips", "conflict", "County FIPS code looks malformed.");

  if (!session.state) add("state", "blocker", "State is missing.");
  else if (!/^[A-Za-z]{2}$/.test(session.state)) add("state", "conflict", "State must be a 2-letter code.");

  /* -------- household -------- */
  const members = session.members ?? [];
  if (members.length === 0) add("members", "blocker", "No applicants were entered.");

  if (session.householdSize === null) {
    add("household_size", "blocker", "Household size is missing.");
  } else if (members.length > session.householdSize) {
    add(
      "household_size",
      "conflict",
      `Household size is ${session.householdSize} but ${members.length} applicants were entered.`,
    );
  } else if (members.length > 0 && members.length < session.householdSize) {
    add(
      "household_size",
      "flag",
      `Household size is ${session.householdSize} with ${members.length} applicants — confirm non-applicant members.`,
    );
  }

  const primaries = members.filter(m => m.relationship === "primary");
  if (members.length > 0 && primaries.length === 0) add("members", "blocker", "No primary applicant is designated.");
  if (primaries.length > 1) add("members", "conflict", "More than one primary applicant is designated.");
  if (members.filter(m => m.relationship === "spouse").length > 1) {
    add("members", "conflict", "More than one spouse is listed.");
  }

  const seen = new Set<string>();
  members.forEach((member, index) => {
    const label = `members[${index}]`;

    if (!member.dob) add(`${label}.dob`, "blocker", `Applicant ${index + 1} has no date of birth.`);
    else if (!isIsoDate(member.dob)) add(`${label}.dob`, "blocker", `Applicant ${index + 1} has an invalid date of birth.`);
    else {
      const age = ageFromDob(member.dob);
      if (age === null || age < 0 || age > 120) {
        add(`${label}.dob`, "blocker", `Applicant ${index + 1} has an out-of-range date of birth.`);
      } else if (age >= 65) {
        add(
          `${label}.dob`,
          "flag",
          `Applicant ${index + 1} is ${age} — screen for Medicare eligibility before an on-exchange enrollment.`,
        );
      }
    }

    if (typeof member.tobacco !== "boolean") {
      add(`${label}.tobacco`, "blocker", `Applicant ${index + 1} has no tobacco-use answer.`);
    }

    const key = `${member.dob}|${member.relationship}|${member.gender ?? ""}`;
    if (seen.has(key)) add(`${label}`, "conflict", `Applicant ${index + 1} looks like a duplicate entry.`);
    seen.add(key);
  });

  /* -------- income -------- */
  if (session.annualIncome === null) {
    add("annual_income", "blocker", "Household income is missing.");
  } else if (session.annualIncome < 0) {
    add("annual_income", "conflict", "Household income is negative.");
  } else if (session.annualIncome === 0) {
    add("annual_income", "flag", "Reported income is $0 — screen for Medicaid or CHIP eligibility.");
  } else if (session.householdSize && session.annualIncome / session.householdSize < 7_000) {
    add(
      "annual_income",
      "flag",
      "Income is below the likely Medicaid/CHIP threshold for this household size — confirm before approval.",
    );
  }

  const memberIncome = members.reduce((sum, m) => sum + (typeof m.income === "number" ? m.income : 0), 0);
  if (memberIncome > 0 && session.annualIncome !== null && Math.abs(memberIncome - session.annualIncome) > 1) {
    add(
      "annual_income",
      "conflict",
      `Applicant income sources total $${memberIncome.toLocaleString()} but household income is $${session.annualIncome.toLocaleString()}.`,
    );
  }

  if (!session.effectiveDate) add("effective_date", "blocker", "Requested coverage effective date is missing.");

  /* -------- doctors and prescriptions -------- */
  session.savedDoctors?.forEach((doctor, index) => {
    if (!doctor.id) add(`saved_doctors[${index}].id`, "conflict", `Saved doctor "${doctor.name}" has no NPI identifier.`);
    else if (!/^\d{10}$/.test(doctor.id)) {
      add(`saved_doctors[${index}].id`, "flag", `Saved doctor "${doctor.name}" has a non-NPI identifier and cannot be sent.`);
    }
  });
  session.savedPrescriptions?.forEach((rx, index) => {
    if (!rx.id) add(`saved_prescriptions[${index}].id`, "conflict", `Prescription "${rx.name}" has no drug identifier.`);
    if (!rx.name) add(`saved_prescriptions[${index}].name`, "conflict", `A saved prescription has no name.`);
  });

  /* -------- contact, required for the handoff -------- */
  const contact = session.contact ?? {};
  if (!contact.firstName) add("contact.firstName", "blocker", "First name is required for the HealthSherpa handoff.");
  if (!contact.lastName) add("contact.lastName", "blocker", "Last name is required for the HealthSherpa handoff.");
  if (!contact.email && !contact.phone) {
    add("contact.email", "blocker", "An email or phone number is required for the HealthSherpa handoff.");
  }
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email)) {
    add("contact.email", "conflict", "Email address looks invalid.");
  }
  if (contact.phone && contact.phone.replace(/\D/g, "").length < 10) {
    add("contact.phone", "conflict", "Phone number is not a full 10-digit US number.");
  }

  /* -------- coverage screening -------- */
  if (session.selectedPlan?.apiEnrollable === false) {
    add(
      "selected_plan",
      "flag",
      "The selected plan is not API-enrollable — this must go through the agent-assisted HealthSherpa flow.",
    );
  }

  const blockers = issues.filter(i => i.severity === "blocker");
  const conflicts = issues.filter(i => i.severity === "conflict");
  const flags = issues.filter(i => i.severity === "flag");

  return { issues, blockers, conflicts, flags, canApprove: blockers.length === 0 && conflicts.length === 0 };
};
