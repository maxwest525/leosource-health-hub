/**
 * Normalizes the competing applicant shapes found across the existing intake
 * surfaces onto the canonical `EnrollmentMember`.
 *
 * Before consolidation the app carried `ages: number[]` in the hero finder,
 * HealthSherpaQuoter and SubsidyCalculator, but `dobs: string[]` in
 * ComparePlans, with tobacco as a parallel boolean array in some places and a
 * per-member property in others. Everything funnels through here instead.
 */

import type { EnrollmentMember, EnrollmentRelationship } from "@/lib/enrollment-session";
import type { HsApplicant, HsRelationship } from "@/lib/healthsherpa";

const relationshipForIndex = (index: number): EnrollmentRelationship => {
  if (index === 0) return "primary";
  if (index === 1) return "spouse";
  return "dependent";
};

/** Approximates a birth date from an age. Used only for legacy age-only input. */
export const ageToDob = (age: number, today: Date = new Date()): string => {
  const year = today.getFullYear() - Math.max(0, Math.round(age));
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Derives an age from an ISO birth date. */
export const dobToAge = (dob: string, today: Date = new Date()): number => {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return 0;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Math.max(0, age);
};

/** Converts the legacy `ages[]` + parallel `tobacco[]` pair into members. */
export const agesToMembers = (ages: number[], tobacco: boolean[] = []): EnrollmentMember[] =>
  ages.map((age, index) => ({
    dob: ageToDob(age),
    relationship: relationshipForIndex(index),
    tobacco: Boolean(tobacco[index]),
  }));

/** Converts ComparePlans-style `dobs[]` plus parallel flag arrays into members. */
export const dobsToMembers = (
  dobs: string[],
  options: {
    tobacco?: boolean[];
    genders?: Array<"male" | "female" | undefined>;
    relationships?: EnrollmentRelationship[];
    pregnant?: boolean[];
    disabled?: boolean[];
    tribal?: boolean[];
  } = {},
): EnrollmentMember[] =>
  dobs.map((dob, index) => ({
    dob,
    relationship: options.relationships?.[index] ?? relationshipForIndex(index),
    tobacco: Boolean(options.tobacco?.[index]),
    gender: options.genders?.[index],
    pregnant: options.pregnant?.[index] ?? undefined,
    disabled: options.disabled?.[index] ?? undefined,
    tribal: options.tribal?.[index] ?? undefined,
  }));

/** Maps canonical members onto the HealthSherpa quoting contract. */
export const membersToHsApplicants = (members: EnrollmentMember[]): HsApplicant[] =>
  members.map((member, index) => ({
    member_id: `m${index + 1}`,
    age: dobToAge(member.dob),
    date_of_birth: member.dob,
    relationship: member.relationship as HsRelationship,
    gender: member.gender,
    uses_tobacco: member.tobacco,
    pregnant: member.pregnant,
    blind_or_disabled: member.disabled,
    american_indian_alaska_native: member.tribal,
  }));
