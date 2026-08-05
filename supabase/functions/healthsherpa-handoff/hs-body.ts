/** Pure request-shaping helpers for the HealthSherpa agent-assisted contract. */

type SessionRow = Record<string, any>;
export const LOCALES: Record<string, string> = { en: "en-US", es: "es-MX" };

export const AGENT_NOTE_MAX = 500;

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

export type PrescriptionRef = { id: string } | { rx_norm_identifier: string };

/**
 * Verified HealthSherpa catalog identifiers keep their provenance as `id`;
 * RxNorm/RxCUI identifiers are sent as `rx_norm_identifier`. Never a name fallback,
 * and never an RxNorm value emitted as a generic `id`.
 *
 * Legacy compatibility: rows saved by the CMS drug search before provenance was
 * recorded carry a bare, all-digit `id` and nothing else. HealthSherpa catalog
 * identifiers are never bare digits, so such a value is treated as RxNorm.
 * An explicitly marked catalog id is never reinterpreted.
 */
export const verifiedPrescriptions = (rx: unknown): PrescriptionRef[] => {
  if (!Array.isArray(rx)) return [];
  const out = new Map<string, PrescriptionRef>();
  for (const item of rx) {
    const raw = (item ?? {}) as Record<string, unknown>;
    if (raw.verified === false || raw.manual === true || raw.unresolved === true) continue;

    const catalogId = String(raw.hs_id ?? raw.medication_id ?? "").trim();
    const rxNorm = String(raw.rxcui ?? raw.rxnorm_id ?? raw.rx_norm_identifier ?? "").trim();
    const idField = String(raw.id ?? "").trim();
    const idIsRxNorm = raw.id_type === "rxnorm" || raw.id_type === "rxcui";
    const idIsCatalog = raw.id_type === "healthsherpa" || raw.id_type === "hs";

    let ref: PrescriptionRef | null = null;
    if (catalogId && /^[A-Za-z0-9_-]+$/.test(catalogId)) ref = { id: catalogId };
    else if (rxNorm && /^[0-9]+$/.test(rxNorm)) ref = { rx_norm_identifier: rxNorm };
    else if (idField && /^[A-Za-z0-9_-]+$/.test(idField)) {
      const legacyRxNorm = !idIsCatalog && !raw.id_type && /^[0-9]+$/.test(idField);
      ref = idIsRxNorm || legacyRxNorm ? { rx_norm_identifier: idField } : { id: idField };
    }
    if (!ref) continue;
    out.set(JSON.stringify(ref), ref);
  }
  return [...out.values()];
};

export type TopLevelPrescription = PrescriptionRef & {
  applicant_index: number;
  duration?: number;
};

/** Reads a nonnegative integer days-supply, if the saved row actually has one. */
const savedDuration = (raw: Record<string, unknown>): number | undefined => {
  const candidate = raw.duration ?? raw.days_supply ?? raw.daysSupply;
  if (candidate === null || candidate === undefined || candidate === "") return undefined;
  const n = Number(candidate);
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0 ? n : undefined;
};

/**
 * Live contract, established by three authorized non-consumer observations
 * (all 2026-08-05):
 *  - 6654bbdb-88b5-4080-9cb3-976fa92eb1d2: objects must carry the legacy
 *    `{ id, duration, applicant_index, rx_norm_identifier }` linkage shape.
 *  - 6a8ff4cb-a00e-414e-ad4c-9e840f4997df: `client.prescriptions` is rejected -
 *    "Prescriptions is not a recognized field".
 *  - e6a8a9b1-6d87-4ffd-84ae-cf6bb9fc06b1: `applicant_index` inside
 *    `household.applicants[].prescriptions[]` is rejected -
 *    "Applicant index is not a recognized field".
 * Therefore prescriptions are emitted as a TOP-LEVEL `prescriptions` array,
 * sibling of `client`, `household`, `providers` and `notes`, each object
 * carrying `applicant_index`. `duration` only when the saved row has one.
 */
export const topLevelPrescriptions = (rx: unknown, applicantIndex: number): TopLevelPrescription[] => {
  const refs = verifiedPrescriptions(rx);
  const durations = new Map<string, number>();
  if (Array.isArray(rx)) {
    for (const item of rx) {
      const raw = (item ?? {}) as Record<string, unknown>;
      const d = savedDuration(raw);
      if (d === undefined) continue;
      for (const key of [raw.hs_id, raw.medication_id, raw.rxcui, raw.rxnorm_id, raw.rx_norm_identifier, raw.id]) {
        const k = String(key ?? "").trim();
        if (k && !durations.has(k)) durations.set(k, d);
      }
    }
  }
  return refs.map((ref) => {
    const key = "id" in ref ? ref.id : ref.rx_norm_identifier;
    const duration = durations.get(key);
    return { ...ref, applicant_index: applicantIndex, ...(duration !== undefined ? { duration } : {}) };
  });
};





const RELATIONSHIPS = new Set(["primary", "spouse", "dependent"]);

/** Legacy `child` is normalised to `dependent`; anything else is rejected. */
export const normalizeRelationship = (value: unknown, index: number): string => {
  const raw = String(value ?? (index === 0 ? "primary" : "dependent")).toLowerCase();
  const normalized = raw === "child" ? "dependent" : raw;
  if (!RELATIONSHIPS.has(normalized)) {
    throw new Error(`unsupported_relationship: ${raw}`);
  }
  return normalized;
};

/** Canonical session -> HealthSherpa agent-assisted enrollment-session body. */
export const buildHandoffBody = (row: SessionRow, locale: string, agentNote?: string) => {
  const members: any[] = Array.isArray(row.members) ? row.members : [];
  const contact = (row.contact ?? {}) as Record<string, string | undefined>;
  // Used only to derive the plan year; the household schema is closed and
  // does not accept an effective_date property.
  const effectiveDate: string = row.effective_date ?? `${new Date().getFullYear() + 1}-01-01`;
  const planYear = Number(effectiveDate.slice(0, 4));
  // Prescriptions nest on the primary applicant (see applicantPrescriptions).
  const providers = verifiedNpis(row.saved_doctors);

  const relationships = members.map((m, i) => normalizeRelationship(m?.relationship, i));
  const primaryCount = relationships.filter((r) => r === "primary").length;
  if (members.length > 0 && primaryCount !== 1) {
    throw new Error("exactly_one_primary_required");
  }
  const primaryIndex = Math.max(0, relationships.indexOf("primary"));
  const prescriptions = applicantPrescriptions(row.saved_prescriptions, primaryIndex);


  const applicants = members.map((member, index) => {
    const isPrimary = index === primaryIndex;
    const sex = String(member?.sex ?? member?.gender ?? "").toLowerCase();
    const income = typeof member?.income === "number" ? member.income : null;
    const employer = typeof member?.employer === "string" && member.employer ? member.employer : null;
    return {
      relationship: relationships[index],
      date_of_birth: member?.dob,
      ...(sex === "male" || sex === "female" ? { sex } : {}),
      uses_tobacco: Boolean(member?.tobacco),
      ...(income !== null
        ? { income_sources: [{ amount: income, ...(employer ? { employer } : {}) }] }
        : {}),
      ...(isPrimary && prescriptions.length > 0 ? { prescriptions } : {}),
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
      household_size: Math.max(Number(row.household_size ?? applicants.length), applicants.length),
      applicants,
    },
    ...(providers.length > 0 ? { providers } : {}),
    ...(agentNote ? { notes: agentNote } : {}),
  };
};
