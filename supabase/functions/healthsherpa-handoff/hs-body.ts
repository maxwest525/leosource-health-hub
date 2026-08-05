/** Pure request-shaping helpers for the HealthSherpa agent-assisted contract. */

type SessionRow = Record<string, any>;
export const LOCALES: Record<string, string> = { en: "en-US", es: "es-MX" };

export const AGENT_NOTE_MAX = 500;

const digits = (value: unknown): string =>
  String(value ?? "").replace(/\D/g, "");

/** Ten-digit NPIs only. Manually entered / unverified doctors are omitted. */
export const verifiedNpis = (doctors: unknown): string[] => {
  if (!Array.isArray(doctors)) return [];
  const out = new Set<string>();
  for (const d of doctors) {
    const raw = (d ?? {}) as Record<string, unknown>;
    if (raw.verified === false || raw.manual === true) continue;
    const npi = digits(raw.npi ?? raw.id);
    if (/^\d{10}$/.test(npi)) out.add(npi);
  }
  return [...out];
};

// `saved_prescriptions` is an optional TruEnroll household-planning aid. It is
// intentionally ignored here: no prescription field is emitted anywhere in the
// HealthSherpa `/v1/enrollment-sessions` request (see CONTRACT.md). There is no
// prescription-shaping code in this module.

const RELATIONSHIPS = new Set(["primary", "spouse", "dependent"]);

/** Legacy `child` is normalised to `dependent`; anything else is rejected. */
export const normalizeRelationship = (
  value: unknown,
  index: number,
): string => {
  const raw = String(value ?? (index === 0 ? "primary" : "dependent"))
    .toLowerCase();
  const normalized = raw === "child" ? "dependent" : raw;
  if (!RELATIONSHIPS.has(normalized)) {
    throw new Error(`unsupported_relationship: ${raw}`);
  }
  return normalized;
};

/** Canonical session -> HealthSherpa agent-assisted enrollment-session body. */
export const buildHandoffBody = (
  row: SessionRow,
  locale: string,
  agentNote?: string,
) => {
  const members: any[] = Array.isArray(row.members) ? row.members : [];
  const contact = (row.contact ?? {}) as Record<string, string | undefined>;
  // Used only to derive the plan year; the household schema is closed and
  // does not accept an effective_date property.
  const effectiveDate: string = row.effective_date ??
    `${new Date().getFullYear() + 1}-01-01`;
  const planYear = Number(effectiveDate.slice(0, 4));
  const providers = verifiedNpis(row.saved_doctors);

  const relationships = members.map((m, i) =>
    normalizeRelationship(m?.relationship, i)
  );
  const primaryCount = relationships.filter((r) => r === "primary").length;
  if (members.length > 0 && primaryCount !== 1) {
    throw new Error("exactly_one_primary_required");
  }
  const primaryIndex = Math.max(0, relationships.indexOf("primary"));

  const applicants = members.map((member, index) => {
    const isPrimary = index === primaryIndex;
    const sex = String(member?.sex ?? member?.gender ?? "").toLowerCase();
    const income = typeof member?.income === "number" ? member.income : null;
    const employer = typeof member?.employer === "string" && member.employer
      ? member.employer
      : null;
    return {
      relationship: relationships[index],
      date_of_birth: member?.dob,
      ...(sex === "male" || sex === "female" ? { sex } : {}),
      uses_tobacco: Boolean(member?.tobacco),
      ...(income !== null
        ? {
          income_sources: [{
            amount: income,
            ...(employer ? { employer } : {}),
          }],
        }
        : {}),
      ...(isPrimary
        ? {
          first_name: contact.firstName,
          last_name: contact.lastName,
          ...(contact.email ? { email: contact.email } : {}),
          ...(contact.phone ? { phone_number: digits(contact.phone) } : {}),
        }
        : {}),
    };
  });

  if (agentNote && agentNote.length > AGENT_NOTE_MAX) {
    throw new Error("agent_note_too_long");
  }

  return {
    context: {
      product: "aca",
      exchange: "on_exchange",
      coverage_family: "medical",
      coverage_type: "medical",
      plan_year: planYear,
      flow: "agent_assisted",
      locale: LOCALES[locale] ?? "en-US",
    },
    external_id: row.external_id,
    location: {
      zip_code: String(row.zip_code ?? ""),
      fips_code: String(row.county_fips ?? "").padStart(5, "0"),
      state: String(row.state ?? "").toUpperCase(),
    },
    household: {
      annual_income: Number(row.annual_income ?? 0),
      household_size: Math.max(
        Number(row.household_size ?? applicants.length),
        applicants.length,
      ),
      applicants,
    },
    ...(providers.length > 0 ? { providers } : {}),

    ...(agentNote ? { notes: agentNote } : {}),
  };
};
