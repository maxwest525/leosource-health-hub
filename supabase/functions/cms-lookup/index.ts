import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CMS_API_BASE = "https://marketplace.api.healthcare.gov/api/v1";
const CMS_API_KEY = Deno.env.get("CMS_MARKETPLACE_API_KEY") ?? "";
const DEFAULT_YEAR = 2026;

const personSchema = z.object({
  age: z.number().int().min(0).max(120),
  aptc_eligible: z.boolean().default(true),
  gender: z.enum(["Male", "Female"]).default("Female"),
  uses_tobacco: z.boolean().default(false),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("countyByZip"),
    zipcode: z.string().regex(/^\d{5}$/),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("planSearch"),
    zipcode: z.string().regex(/^\d{5}$/),
    state: z.string().length(2),
    countyfips: z.string().min(4).max(5),
    income: z.number().min(0).max(10_000_000).default(50000),
    people: z.array(personSchema).min(1).max(10),
    market: z.enum(["Individual", "SHOP"]).default("Individual"),
    limit: z.number().int().min(1).max(50).default(20),
    offset: z.number().int().min(0).max(500).default(0),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("drugAutocomplete"),
    query: z.string().min(2).max(80),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("drugCoverage"),
    rxcuis: z.array(z.string().regex(/^\d+$/)).min(1).max(25),
    planIds: z.array(z.string().min(6).max(32)).min(1).max(50),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("providerAutocomplete"),
    query: z.string().min(2).max(80),
    zipcode: z.string().regex(/^\d{5}$/),
    type: z.enum(["Individual", "Facility"]).default("Individual"),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("providerCoverage"),
    npis: z.array(z.string().regex(/^\d{10}$/)).min(1).max(25),
    planIds: z.array(z.string().min(6).max(32)).min(1).max(50),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("eligibilityEstimate"),
    zipcode: z.string().regex(/^\d{5}$/),
    state: z.string().length(2),
    countyfips: z.string().min(4).max(5),
    income: z.number().min(0).max(10_000_000),
    people: z.array(personSchema).min(1).max(10),
    market: z.enum(["Individual", "SHOP"]).default("Individual"),
    hasMarriedCouple: z.boolean().default(false),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("planDetail"),
    planId: z.string().min(6).max(32),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("planCrosswalk"),
    planId: z.string().min(6).max(32),
    state: z.string().length(2),
    countyfips: z.string().min(4).max(5),
    year: z.number().int().optional(),
  }),
  z.object({
    action: z.literal("issuers"),
    state: z.string().length(2),
    year: z.number().int().optional(),
  }),
]);


type CmsRequest = z.infer<typeof requestSchema>;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function cmsGet(path: string, params: Record<string, string>): Promise<unknown> {
  const search = new URLSearchParams({ ...params, apikey: CMS_API_KEY });
  const resp = await fetch(`${CMS_API_BASE}/${path}?${search.toString()}`);
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`CMS ${path} failed (${resp.status}): ${detail.slice(0, 400)}`);
  }
  return await resp.json();
}

async function cmsPost(path: string, body: unknown): Promise<unknown> {
  const resp = await fetch(`${CMS_API_BASE}/${path}?apikey=${encodeURIComponent(CMS_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`CMS ${path} failed (${resp.status}): ${detail.slice(0, 400)}`);
  }
  return await resp.json();
}

/** Falls back to the previous plan year when the requested year has no data yet. */
async function withYearFallback<T>(year: number, run: (y: number) => Promise<T>): Promise<T> {
  try {
    return await run(year);
  } catch (_err) {
    return await run(year - 1);
  }
}

/**
 * CMS coverage endpoints accept at most 10 plan IDs per call.
 * Splits the request into batches of 10 and merges the array fields of each response.
 */
async function chunkedCoverage(
  planIds: string[],
  run: (ids: string[]) => Promise<unknown>
): Promise<unknown> {
  const batches: string[][] = [];
  for (let i = 0; i < planIds.length; i += 10) batches.push(planIds.slice(i, i + 10));

  const results = await Promise.all(batches.map((ids) => run(ids)));
  if (results.length === 1) return results[0];

  const merged: Record<string, unknown> = {};
  for (const result of results) {
    if (!result || typeof result !== "object") continue;
    for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        const existing = Array.isArray(merged[key]) ? (merged[key] as unknown[]) : [];
        merged[key] = [...existing, ...value];
      } else if (!(key in merged)) {
        merged[key] = value;
      }
    }
  }
  return merged;
}


async function handle(req: CmsRequest): Promise<unknown> {
  const year = req.year ?? DEFAULT_YEAR;

  switch (req.action) {
    case "countyByZip":
      return await withYearFallback(year, (y) =>
        cmsGet(`counties/by/zip/${req.zipcode}`, { year: String(y) })
      );

    case "planSearch":
      return await withYearFallback(year, (y) =>
        cmsPost("plans/search", {
          household: { income: req.income, people: req.people },
          market: req.market,
          place: { countyfips: req.countyfips, state: req.state, zipcode: req.zipcode },
          year: y,
          limit: req.limit,
          offset: req.offset,
        })
      );

    case "drugAutocomplete":
      return await withYearFallback(year, (y) =>
        cmsGet("drugs/autocomplete", { q: req.query, year: String(y) })
      );

    case "drugCoverage":
      return await withYearFallback(year, (y) =>
        chunkedCoverage(req.planIds, (ids) =>
          cmsGet("drugs/covered", {
            drugs: req.rxcuis.join(","),
            planids: ids.join(","),
            year: String(y),
          })
        )
      );


    case "providerAutocomplete":
      return await withYearFallback(year, (y) =>
        cmsGet("providers/autocomplete", {
          q: req.query,
          zipcode: req.zipcode,
          type: req.type,
          year: String(y),
        })
      );

    case "providerCoverage":
      return await withYearFallback(year, (y) =>
        chunkedCoverage(req.planIds, (ids) =>
          cmsGet("providers/covered", {
            providerids: req.npis.join(","),
            planids: ids.join(","),
            year: String(y),
          })
        )
      );


    case "eligibilityEstimate":
      return await withYearFallback(year, (y) =>
        cmsPost("households/eligibility/estimates", {
          household: {
            income: req.income,
            people: req.people,
            has_married_couple: req.hasMarriedCouple,
          },
          market: req.market,
          place: { countyfips: req.countyfips, state: req.state, zipcode: req.zipcode },
          year: y,
        })
      );

    case "planDetail":
      // CMS plan IDs look like 12345FL0010001(-01). Non-CMS ids (e.g. HealthSherpa)
      // would make the upstream 400, so degrade gracefully instead.
      if (!/^\d{5}[A-Za-z]{2}\d{7}(-\d{2})?$/.test(req.planId.trim())) {
        return { plan: null };
      }
      return await withYearFallback(year, (y) =>
        cmsGet(`plans/${encodeURIComponent(req.planId)}`, { year: String(y) })
      );

    case "planCrosswalk":
      return await withYearFallback(year, (y) =>
        cmsGet(`plans/${encodeURIComponent(req.planId)}/crosswalk`, {
          year: String(y),
          state: req.state,
          fips: req.countyfips,
        })
      );

    case "issuers":
      return await withYearFallback(year, (y) =>
        cmsGet("issuers", { state: req.state, year: String(y) })
      );
  }
}


serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!CMS_API_KEY) {
    return jsonResponse({ error: "CMS Marketplace API key is not configured." }, 503);
  }

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonResponse(
        { error: "Invalid request", details: parsed.error.flatten() },
        422
      );
    }

    const data = await handle(parsed.data);
    return jsonResponse({ action: parsed.data.action, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("cms-lookup error:", message);
    return jsonResponse({ error: "Marketplace lookup failed" }, 502);
  }
});
