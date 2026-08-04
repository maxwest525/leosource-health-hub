import { supabase } from "@/integrations/supabase/client";

/* ================================================================== */
/*  DATA IMPORT SERVICE                                                 */
/*  Manages batch data ingestion for carriers, providers, plans, etc.   */
/* ================================================================== */

export type ImportDomain =
  | "carriers"
  | "providers"
  | "networks"
  | "provider_networks"
  | "medications"
  | "formularies"
  | "plans"
  | "pharmacies";

type ImportLogEntry = {
  domain: ImportDomain;
  sourceName: string;
  importType: "batch" | "api" | "manual";
  versionTag?: string;
};

/**
 * Start a tracked import session.
 */
export async function startImport(entry: ImportLogEntry): Promise<string | null> {
  const { data, error } = await supabase
    .from("data_import_log")
    .insert({
      domain: entry.domain,
      source_name: entry.sourceName,
      import_type: entry.importType,
      version_tag: entry.versionTag || null,
      status: "running",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[DataImport] start error:", error);
    return null;
  }
  return data.id;
}

/**
 * Complete an import session with stats.
 */
export async function completeImport(
  importId: string,
  stats: { processed: number; created: number; updated: number; failed: number; errors?: any[] }
) {
  await supabase.from("data_import_log").update({
    records_processed: stats.processed,
    records_created: stats.created,
    records_updated: stats.updated,
    records_failed: stats.failed,
    error_log: stats.errors || [],
    completed_at: new Date().toISOString(),
    status: stats.failed > 0 ? "completed_with_errors" : "completed",
  }).eq("id", importId);
}

/**
 * Batch insert carriers from structured data.
 */
export async function importCarriers(
  carriers: Array<{
    name: string;
    displayName?: string;
    coverageCategories?: string[];
    statesAvailable?: string[];
    supportPhone?: string;
  }>,
  sourceName: string
): Promise<{ created: number; failed: number }> {
  const importId = await startImport({ domain: "carriers", sourceName, importType: "batch" });
  let created = 0, failed = 0;

  for (const c of carriers) {
    const { error } = await supabase.from("carriers").upsert({
      name: c.name,
      display_name: c.displayName || c.name,
      coverage_categories: c.coverageCategories || [],
      states_available: c.statesAvailable || [],
      support_phone: c.supportPhone || null,
      data_source: sourceName,
      data_confidence: "imported",
      last_data_update: new Date().toISOString(),
    }, { onConflict: "name" });

    if (error) { failed++; } else { created++; }
  }

  if (importId) await completeImport(importId, { processed: carriers.length, created, updated: 0, failed });
  return { created, failed };
}

/**
 * Batch insert providers from structured data.
 */
export async function importProviders(
  providers: Array<{
    npi?: string;
    displayName: string;
    specialty?: string;
    providerType?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    phone?: string;
    isFacility?: boolean;
  }>,
  sourceName: string
): Promise<{ created: number; failed: number }> {
  const importId = await startImport({ domain: "providers", sourceName, importType: "batch" });

  const rows = providers.map(p => ({
    npi: p.npi || null,
    display_name: p.displayName,
    specialty: p.specialty || null,
    provider_type: p.providerType || "individual",
    city: p.city || null,
    state: p.state || null,
    zip_code: p.zipCode || null,
    phone: p.phone || null,
    is_facility: p.isFacility || false,
    data_source: sourceName,
    data_confidence: "imported",
    last_data_update: new Date().toISOString(),
  }));

  const { error, data } = await supabase.from("providers").insert(rows).select("id");
  const created = data?.length || 0;
  const failed = rows.length - created;

  if (importId) await completeImport(importId, { processed: rows.length, created, updated: 0, failed });
  return { created, failed };
}

/**
 * Batch insert medications from structured data.
 */
export async function importMedications(
  meds: Array<{
    genericName: string;
    brandName?: string;
    form?: string;
    dosage?: string;
    therapeuticClass?: string;
    isGeneric?: boolean;
  }>,
  sourceName: string
): Promise<{ created: number; failed: number }> {
  const importId = await startImport({ domain: "medications", sourceName, importType: "batch" });

  const rows = meds.map(m => ({
    generic_name: m.genericName,
    brand_name: m.brandName || null,
    form: m.form || null,
    dosage: m.dosage || null,
    therapeutic_class: m.therapeuticClass || null,
    is_generic: m.isGeneric ?? true,
    data_source: sourceName,
    data_confidence: "imported",
    last_data_update: new Date().toISOString(),
  }));

  const { error, data } = await supabase.from("medications").insert(rows).select("id");
  const created = data?.length || 0;
  const failed = rows.length - created;

  if (importId) await completeImport(importId, { processed: rows.length, created, updated: 0, failed });
  return { created, failed };
}
