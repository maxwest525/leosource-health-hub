import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HS_API_BASE = "https://api.one.healthsherpa.com";

const applicantSchema = z.object({
  member_id: z.string().min(1).max(40),
  age: z.number().int().min(0).max(120),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relationship: z.enum(["primary", "spouse", "dependent"]),
  gender: z
    .enum(["male", "female", "other", "unknown", "Male", "Female"])
    .transform((v) => v.toLowerCase())
    .optional(),

  uses_tobacco: z.boolean().default(false),
  pregnant: z.boolean().optional(),
  blind_or_disabled: z.boolean().optional(),
  american_indian_alaska_native: z.boolean().optional(),
});

const filtersSchema = z.object({
  issuer_ids: z.array(z.string().min(1).max(20)).max(50).optional(),
  medical: z
    .object({
      metal_levels: z.array(z.string().min(1).max(40)).max(10).optional(),
      plan_types: z.array(z.string().min(1).max(20)).max(10).optional(),
      hsa_eligible: z.boolean().optional(),
      standardized_only: z.boolean().optional(),
    })
    .optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({
    action: z.literal("counties"),
    zip_code: z.string().regex(/^\d{5}$/),
  }),
  z.object({
    action: z.literal("issuers"),
    state: z.string().length(2),
    plan_year: z.number().int().min(2020).max(2100).optional(),
  }),
  z.object({
    action: z.literal("quotes"),
    zip_code: z.string().regex(/^\d{5}$/),
    fips_code: z.string().min(4).max(5),
    state: z.string().length(2),
    household_size: z.number().int().min(1).max(12),
    annual_income: z.number().min(0).max(10_000_000),
    effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    applicants: z.array(applicantSchema).min(1).max(12),
    filters: filtersSchema.optional(),
    sort_field: z.enum(["premium", "deductible", "metal_level", "issuer"]).optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    page: z.number().int().min(1).max(50).default(1),
    size: z.number().int().min(1).max(50).default(20),
  }),
]);


type ErrorCode =
  | "not_configured"
  | "invalid_request"
  | "unauthorized"
  | "rate_limited"
  | "upstream_error";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (code: ErrorCode, message: string, status = 400) =>
  json({ error: { code, message } }, status);

const mapUpstream = (status: number): { code: ErrorCode; message: string } => {
  if (status === 401 || status === 403) {
    return {
      code: "unauthorized",
      message: "The HealthSherpa API key was rejected. Check the stored key and try again.",
    };
  }
  if (status === 429) {
    return {
      code: "rate_limited",
      message: "HealthSherpa is rate limiting requests right now. Wait a moment and retry.",
    };
  }
  return {
    code: "upstream_error",
    message: "HealthSherpa could not complete that request. Please try again.",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("HEALTHSHERPA_API_KEY") ?? "";

  let parsed: z.infer<typeof requestSchema>;
  try {
    parsed = requestSchema.parse(await req.json());
  } catch (_err) {
    return fail("invalid_request", "That request was missing or had invalid fields.", 400);
  }

  if (parsed.action === "status") {
    return json({ data: { configured: apiKey.length > 0 } });
  }

  if (!apiKey) {
    return fail(
      "not_configured",
      "HealthSherpa is not connected yet. Save HEALTHSHERPA_API_KEY in the backend secrets.",
      503,
    );
  }

  const headers = { "x-api-key": apiKey, "Content-Type": "application/json" };

  try {
    let upstream: Response;

    if (parsed.action === "counties") {
      upstream = await fetch(
        `${HS_API_BASE}/v1/reference/counties?zip_code=${encodeURIComponent(parsed.zip_code)}`,
        { headers },
      );
    } else if (parsed.action === "issuers") {
      const query = new URLSearchParams({ state: parsed.state });
      if (parsed.plan_year) query.set("plan_year", String(parsed.plan_year));
      upstream = await fetch(`${HS_API_BASE}/v1/reference/issuers?${query.toString()}`, { headers });
    } else {
      const planYear = Number(parsed.effective_date.slice(0, 4));
      upstream = await fetch(`${HS_API_BASE}/v1/quotes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          context: {
            product: "aca",
            exchange: "on_exchange",
            coverage_family: "medical",
            coverage_type: "medical",
            plan_year: planYear,
          },
          location: {
            zip_code: parsed.zip_code,
            // Contract requires an exact 5-digit FIPS code.
            fips_code: parsed.fips_code.padStart(5, "0"),
            state: parsed.state.toUpperCase(),
          },
          household: {
            household_size: Math.max(parsed.household_size, parsed.applicants.length),
            annual_income: parsed.annual_income,
            effective_date: parsed.effective_date,
            applicants: parsed.applicants,
          },
          ...(parsed.filters ? { filters: parsed.filters } : {}),
          sort: { field: parsed.sort_field ?? "premium", direction: parsed.sort_direction ?? "asc" },
          page: { number: parsed.page, size: parsed.size },
        }),
      });

    }

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("healthsherpa upstream error", parsed.action, upstream.status, detail.slice(0, 500));

      // An unknown / unsupported ZIP is not a server failure: return an empty county list
      // so the UI can prompt for a different ZIP instead of showing an error state.
      if (parsed.action === "counties" && (upstream.status === 404 || upstream.status === 422)) {
        return json({ data: { counties: [] } });
      }

      const mapped = mapUpstream(upstream.status);
      return fail(mapped.code, mapped.message, upstream.status === 429 ? 429 : 502);
    }

    return json({ data: await upstream.json() });
  } catch (_err) {
    return fail("upstream_error", "Could not reach HealthSherpa. Please try again.", 502);
  }
});
