/** Pure request-shaping helpers for the HealthSherpa agent-assisted contract. */


type SessionRow = Record<string, any>;
export const LOCALES: Record<string, string> = { en: "en-US", es: "es-MX" };

const digits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

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

/** Verified HealthSherpa medication id or RxNorm id only. Never a name fallback. */
export const verifiedPrescriptions = (rx: unknown): Array<{ id: string }> => {
  if (!Array.isArray(rx)) return [];
  const out = new Map<string, { id: string }>();
  for (const item of rx) {
    const raw = (item ?? {}) as Record<string, unknown>;
    if (raw.verified === false || raw.manual === true || raw.unresolved === true) continue;
    const id = String(raw.hs_id ?? raw.medication_id ?? raw.rxcui ?? raw.rxnorm_id ?? raw.id ?? "").trim();
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) continue;
    out.set(id, { id });
  }
  return [...out.values()];
};

/** Canonical session -> HealthSherpa agent-assisted enrollment-session body. */
export const buildHandoffBody = (row: SessionRow, locale: string, agentNote?: string) => {
  const members: any[] = Array.isArray(row.members) ? row.members : [];
  const contact = (row.contact ?? {}) as Record<string, string | undefined>;
  const effectiveDate: string = row.effective_date ?? `${new Date().getFullYear() + 1}-01-01`;
  const planYear = Number(effectiveDate.slice(0, 4));
  const prescriptions = verifiedPrescriptions(row.saved_prescriptions);
  const providers = verifiedNpis(row.saved_doctors);

  const primaryIndex = Math.max(
    0,
    members.findIndex((m) => (m?.relationship ?? "primary") === "primary"),
  );

  const applicants = members.map((member, index) => {
    const isPrimary = index === primaryIndex;
    const sex = String(member?.sex ?? member?.gender ?? "").toLowerCase();
    return {
      relationship: member?.relationship ?? (index === 0 ? "primary" : "dependent"),
      date_of_birth: member?.dob,
      ...(sex === "male" || sex === "female" ? { sex } : {}),
      uses_tobacco: Boolean(member?.tobacco),
      ...(typeof member?.income === "number"
        ? { income_sources: [{ type: "wages", amount: member.income, frequency: "yearly" }] }
        : {}),
      ...(isPrimary
        ? {
            first_name: contact.firstName,
            last_name: contact.lastName,
            ...(contact.email ? { email: contact.email } : {}),
            ...(contact.phone ? { phone_number: digits(contact.phone) } : {}),
          }
        : {}),
      ...(isPrimary && prescriptions.length > 0 ? { prescriptions } : {}),
    };
  });

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
      household_size: Math.max(Number(row.household_size ?? applicants.length), applicants.length),
      effective_date: effectiveDate,
      applicants,
    },
    ...(providers.length > 0 ? { providers } : {}),
    ...(agentNote ? { notes: agentNote.slice(0, 500) } : {}),
  };
};

