import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CMS_API_BASE = "https://marketplace.api.healthcare.gov/api/v1";
const CMS_API_KEY = Deno.env.get("CMS_MARKETPLACE_API_KEY") ?? "";
const DEFAULT_YEAR = 2026;
const MODEL = "google/gemini-3.6-flash";

const SYSTEM_PROMPT = `You are Trudy, the interactive quoting assistant for TruEnroll.

GOAL: gather the few details needed to price real 2026 Marketplace plans, then call the tools to pull live quotes from the Centers for Medicare & Medicaid Services Marketplace API.

WHAT YOU NEED BEFORE QUOTING:
- 5 digit ZIP code
- a quick qualification check (see below)
- enrollment timing: Open Enrollment or a qualifying life event (see below)
- everyone who needs coverage (ages, and whether any of them use tobacco)
- anyone else in the tax household who is not going on the plan (affects subsidy math only)
- estimated household income for the coverage year (used only for subsidy math)
- any prescriptions they need covered (optional, they can say none)
- any doctors they want to keep in network (optional, they can say none)

QUALIFICATION CHECK (ask as its own single question, right after the ZIP):
- Ask, in one plain question, whether anyone who needs coverage currently has Medicare, Medicaid, or affordable coverage offered through a job, since that changes what they can enroll in.
- If the answer suggests Marketplace coverage may not fit (Medicare, Medicaid, an affordable job plan, or a situation you are unsure about), do NOT quote and do NOT call get_quotes.
- In that case reply with a short, warm, non-alarming handoff: note that based on their situation the options may work differently, and that the next step is a quick conversation with a licensed specialist who can sort out what they actually qualify for. Do not say "you are ineligible", do not list rules, and keep it to two sentences. Then stop asking quoting questions.
- If some people qualify and others do not, quote only the people who can use the Marketplace and mention the rest are better handled with a specialist.

QUALIFYING LIFE EVENT CHECK (ask as its own single question, right after the qualification check):
- Ask in one plain question whether they are shopping during Open Enrollment or have had a recent life change, and name a few examples in the same sentence: losing other coverage, moving, marriage or divorce, a new baby or adoption, or an income change.
- If they are inside Open Enrollment, continue normally.
- If they are outside Open Enrollment and describe no qualifying change, do NOT quote and do NOT call get_quotes. Give the same warm two sentence handoff: based on their timing the enrollment window works a little differently, and a licensed specialist can confirm what they can start now. Do not use the phrase "you do not qualify" and do not lecture about rules.
- If the life event is unclear or borderline (for example a job change with unknown coverage dates), treat it as a specialist handoff rather than guessing.

DEPENDENT ELIGIBILITY:
- Adult children can stay on a parent's plan through age 26, but only if they are on the same tax return. If someone names an adult child, ask in one question whether that person is claimed on their tax return.
- If the adult child is not on their tax return, they need their own application: keep them out of the enrollee list and out of household size, and note in one short sentence that a specialist can set up a separate quote for them.
- Anyone 26 or older who is not a spouse cannot go on the same plan. Quote the rest of the family and mention the specialist handoff for that person in one sentence.

HOW TO WORK:
- Ask exactly ONE question per reply. Never bundle two questions together, never use lists of questions, and never add a follow-up question after the first one.
- Order: 1) ZIP code, 2) the qualification check above, 3) the qualifying life event check above, 4) who needs coverage (just the people, for example "me and my spouse" or "me and 2 kids"), 5) their ages, 6) tobacco use, 7) whether anyone else in the household is on the tax return but not going on the plan, 8) estimated household income, 9) any prescriptions they need covered, 10) any doctors they want to keep in network. Ask the prescription question and the doctor question separately, one per reply, and make it easy to skip by noting they can say "none". Who needs coverage and their ages are two separate questions: never ask for people and ages in the same reply.
- If ages reveal an adult child, insert the tax return question from DEPENDENT ELIGIBILITY as its own single question before moving on.
- Household members who are not on the plan count toward household size for the subsidy estimate, but are never included as enrollees in get_quotes.
- Acknowledge the answer in a few words, then ask the single next question.
- If the visitor volunteers everything at once, still confirm the qualification check and the qualifying life event check before quoting.
- Pass any named prescriptions to get_quotes as drugs and any named doctors as providers so the search checks formulary and network matches. Skip the field when the visitor says none.
- Call look_up_location first when you have a ZIP, then get_quotes.
- After quotes come back, replace any prose recap with exactly 2 or 3 plain-language highlights, one per line, each starting with "- " and each 8 words or fewer so it never wraps awkwardly on a phone. Example shape: "- Lowest monthly cost of the three", "- Good fit if you rarely see a doctor", "- Higher deductible to watch". Use everyday words, no jargon, no plan names, no dollar figures or percentages, and nothing after the highlights except one short question.
- Offer to re-run with different assumptions (income, ages, metal level focus).

ATTACHMENTS:
- Visitors can attach a document or photo in the composer. It arrives in their message as "[Attached document: filename]".
- When that appears, thank them in a few words, note that a licensed specialist will review it with their application, and continue with the next single question. Never claim to have read, verified, or approved the document.

RULES:
- Never guarantee coverage, provider participation, or prescription coverage.
- Never give medical advice and never pretend to be a licensed agent.
- Use hedged language: "may", "based on available information", "worth reviewing".
- Suggest speaking with a licensed specialist for enrollment, exact networks, or complex situations.
- Keep replies to 1-3 short sentences ending in one question. No markdown headers. Short paragraphs only.`;

type Person = { age: number; aptc_eligible: boolean; gender: "Male" | "Female"; uses_tobacco: boolean };

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
};

type QuotePlan = {
  id: string;
  name: string;
  issuer: string;
  metalLevel: string;
  planType: string;
  premium: number;
  premiumWithCredit: number;
  deductible: number | null;
  oopMax: number | null;
  hsaEligible: boolean;
  qualityRating: number | null;
  benefitsUrl: string | null;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function cmsGet(path: string, params: Record<string, string>): Promise<unknown> {
  const search = new URLSearchParams({ ...params, apikey: CMS_API_KEY });
  const resp = await fetch(`${CMS_API_BASE}/${path}?${search.toString()}`);
  if (!resp.ok) throw new Error(`CMS ${path} failed (${resp.status})`);
  return await resp.json();
}

async function cmsPost(path: string, body: unknown): Promise<unknown> {
  const resp = await fetch(`${CMS_API_BASE}/${path}?apikey=${encodeURIComponent(CMS_API_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`CMS ${path} failed (${resp.status})`);
  return await resp.json();
}

async function withYearFallback<T>(year: number, run: (y: number) => Promise<T>): Promise<T> {
  try {
    return await run(year);
  } catch (_err) {
    return await run(year - 1);
  }
}

const tools = [
  {
    type: "function",
    function: {
      name: "look_up_location",
      description: "Resolve a 5 digit ZIP code to its county and state, required before quoting.",
      parameters: {
        type: "object",
        properties: { zipcode: { type: "string", description: "5 digit ZIP code" } },
        required: ["zipcode"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_quotes",
      description:
        "Pull live 2026 Marketplace plan quotes with subsidy-adjusted premiums for a household.",
      parameters: {
        type: "object",
        properties: {
          zipcode: { type: "string", description: "5 digit ZIP code" },
          income: { type: "number", description: "Estimated annual household income in dollars" },
          people: {
            type: "array",
            description: "Everyone who needs coverage",
            items: {
              type: "object",
              properties: {
                age: { type: "number" },
                uses_tobacco: { type: "boolean" },
              },
              required: ["age"],
              additionalProperties: false,
            },
          },
          other_household_ages: {
            type: "array",
            description:
              "Ages of anyone else on the tax return who is NOT going on the plan. Counted for household size in the subsidy math only.",
            items: { type: "number" },
          },
          drugs: {
            type: "array",
            description: "Prescription names the visitor needs covered. Omit if none.",
            items: { type: "string" },
          },
          providers: {
            type: "array",
            description: "Doctor or facility names the visitor wants in network. Omit if none.",
            items: { type: "string" },
          },
          metal_level: {
            type: "string",
            description: "Optional focus: Bronze, Silver, Gold, Platinum, or Catastrophic",
          },
        },
        required: ["zipcode", "income", "people"],
        additionalProperties: false,
      },
    },
  },
];

type CmsCountyResponse = { counties?: Array<{ fips: string; name: string; state: string }> };

async function resolveCounty(zipcode: string) {
  const data = (await withYearFallback(DEFAULT_YEAR, (y) =>
    cmsGet(`counties/by/zip/${zipcode}`, { year: String(y) }),
  )) as CmsCountyResponse;
  return data.counties?.[0] ?? null;
}

function amountOf(list: Array<{ type?: string; amount?: number }> | undefined): number | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const individual = list.find((entry) => (entry.type ?? "").toLowerCase().includes("individual"));
  const chosen = individual ?? list[0];
  return typeof chosen.amount === "number" ? chosen.amount : null;
}

type RawPlan = {
  id: string;
  name: string;
  issuer?: { name?: string };
  metal_level?: string;
  type?: string;
  premium?: number;
  premium_w_credit?: number;
  deductibles?: Array<{ type?: string; amount?: number }>;
  moops?: Array<{ type?: string; amount?: number }>;
  hsa_eligible?: boolean;
  quality_rating?: { global_rating?: number };
  benefits_url?: string;
};

type DrugMatch = { rxcui?: string; name?: string; full_name?: string };
type ProviderMatch = { npi?: string; name?: string; type?: string };

/** Resolves free-text drug names to CMS rxcui identifiers, skipping misses. */
async function resolveDrugs(names: string[]) {
  const resolved: Array<{ rxcui: string; name: string }> = [];
  for (const raw of names.slice(0, 6)) {
    const query = String(raw ?? "").trim();
    if (query.length < 2) continue;
    try {
      const data = (await cmsGet("drugs/autocomplete", { q: query, year: String(DEFAULT_YEAR) })) as
        | DrugMatch[]
        | { drugs?: DrugMatch[] };
      const list = Array.isArray(data) ? data : (data.drugs ?? []);
      const hit = list[0];
      if (hit?.rxcui) resolved.push({ rxcui: String(hit.rxcui), name: hit.full_name ?? hit.name ?? query });
    } catch (_err) {
      // A miss should never block the quote.
    }
  }
  return resolved;
}

/** Resolves free-text doctor names to CMS NPIs near the visitor's ZIP. */
async function resolveProviders(names: string[], zipcode: string) {
  const resolved: Array<{ npi: string; name: string; type: string }> = [];
  for (const raw of names.slice(0, 6)) {
    const query = String(raw ?? "").trim();
    if (query.length < 2) continue;
    try {
      const data = (await cmsGet("providers/autocomplete", {
        q: query,
        zipcode,
        year: String(DEFAULT_YEAR),
      })) as ProviderMatch[] | { providers?: ProviderMatch[] };
      const list = Array.isArray(data) ? data : (data.providers ?? []);
      const hit = list[0];
      if (hit?.npi) {
        resolved.push({
          npi: String(hit.npi),
          name: hit.name ?? query,
          type: hit.type === "FACILITY" ? "Facility" : "Individual",
        });
      }
    } catch (_err) {
      // A miss should never block the quote.
    }
  }
  return resolved;
}

async function runQuotes(
  args: {
    zipcode: string;
    income: number;
    people: Array<{ age: number; uses_tobacco?: boolean }>;
    other_household_ages?: number[];
    drugs?: string[];
    providers?: string[];
    metal_level?: string;
  },
  /** Called with each interim plan list so the client can update cards in place. */
  onPartial?: (plans: QuotePlan[]) => void,
): Promise<{ summary: unknown; plans: QuotePlan[] }> {
  const county = await resolveCounty(args.zipcode);
  if (!county) return { summary: { error: "No county found for that ZIP code." }, plans: [] };

  const clampAge = (age: number) => Math.max(0, Math.min(120, Math.round(age)));

  const people: Person[] = args.people.slice(0, 10).map((person) => ({
    age: clampAge(person.age),
    aptc_eligible: true,
    gender: "Female",
    uses_tobacco: Boolean(person.uses_tobacco),
  }));

  // Non-applicants still count toward household size for the subsidy estimate,
  // but must never be priced as enrollees.
  for (const age of (args.other_household_ages ?? []).slice(0, 10)) {
    if (typeof age !== "number" || Number.isNaN(age)) continue;
    people.push({ age: clampAge(age), aptc_eligible: false, gender: "Female", uses_tobacco: false });
  }


  const drugs = await resolveDrugs(args.drugs ?? []);
  const providers = await resolveProviders(args.providers ?? [], args.zipcode);

  const result = (await withYearFallback(DEFAULT_YEAR, (y) =>
    cmsPost("plans/search", {
      household: { income: args.income, people },
      market: "Individual",
      place: { countyfips: county.fips, state: county.state, zipcode: args.zipcode },
      year: y,
      limit: 24,
      offset: 0,
      ...(drugs.length > 0 ? { drugs: drugs.map((drug) => drug.rxcui) } : {}),
      ...(providers.length > 0
        ? { providers: providers.map((provider) => ({ npi: provider.npi, type: provider.type })) }
        : {}),
      ...(args.metal_level ? { filter: { metal_levels: [args.metal_level] } } : {}),
    }),
  )) as { plans?: RawPlan[]; total?: number };

  const plans: QuotePlan[] = (result.plans ?? []).map((plan) => ({
    id: plan.id,
    name: plan.name,
    issuer: plan.issuer?.name ?? "Unknown carrier",
    metalLevel: plan.metal_level ?? "",
    planType: plan.type ?? "",
    premium: plan.premium ?? 0,
    premiumWithCredit: plan.premium_w_credit ?? plan.premium ?? 0,
    deductible: amountOf(plan.deductibles),
    oopMax: amountOf(plan.moops),
    hsaEligible: Boolean(plan.hsa_eligible),
    qualityRating: plan.quality_rating?.global_rating ?? null,
    benefitsUrl: plan.benefits_url ?? null,
  }));

  // Push the raw carrier order straight away so cards paint while the ranked
  // shortlist is still being assembled, then refresh the same cards in place.
  onPartial?.(plans.slice(0, 12));

  plans.sort((a, b) => a.premiumWithCredit - b.premiumWithCredit);
  const shortlist = plans.slice(0, 12);
  onPartial?.(shortlist);


  return {
    summary: {
      county: `${county.name}, ${county.state}`,
      drugs_checked: drugs.map((drug) => drug.name),
      doctors_checked: providers.map((provider) => provider.name),
      total_plans: result.total ?? plans.length,
      cheapest: shortlist.slice(0, 5).map((plan) => ({
        name: plan.name,
        issuer: plan.issuer,
        metal: plan.metalLevel,
        type: plan.planType,
        monthly_after_subsidy: plan.premiumWithCredit,
        monthly_full_price: plan.premium,
        deductible: plan.deductible,
        out_of_pocket_max: plan.oopMax,
      })),
    },
    plans: shortlist,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const sessionId = String(body?.sessionId ?? "").slice(0, 64);
    const mode = body?.mode === "load" ? "load" : "send";
    const userMessage = String(body?.message ?? "").slice(0, 2000).trim();

    if (!/^[A-Za-z0-9_-]{8,64}$/.test(sessionId)) {
      return jsonResponse({ error: "Invalid session." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: existing } = await admin
      .from("ai_quote_sessions")
      .select("messages, quote_context")
      .eq("session_id", sessionId)
      .maybeSingle();

    const history: ChatMessage[] = Array.isArray(existing?.messages)
      ? (existing?.messages as ChatMessage[])
      : [];
    const context = (existing?.quote_context ?? {}) as { plans?: QuotePlan[] };

    if (mode === "load") {
      return jsonResponse({ messages: history, plans: context.plans ?? [] });
    }

    if (!userMessage) return jsonResponse({ error: "Empty message." }, 400);

    const working: ChatMessage[] = [...history.slice(-40), { role: "user", content: userMessage }];
    let plans: QuotePlan[] = context.plans ?? [];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          for (let step = 0; step < 4; step += 1) {
            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: MODEL,
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...working],
                tools,
                stream: true,
              }),
            });

            if (!response.ok || !response.body) {
              const message =
                response.status === 429
                  ? "The quote composer is busy right now. Please try again in a moment."
                  : response.status === 402
                    ? "Quoting service temporarily unavailable."
                    : "Quote composer temporarily unavailable.";
              if (response.status !== 429 && response.status !== 402) {
                console.error("AI gateway error", response.status, await response.text());
              }
              emit("error", { message });
              controller.close();
              return;
            }

            // Read the gateway SSE stream, forwarding text deltas as they land
            // and accumulating any tool-call fragments for the next loop step.
            let text = "";
            const calls = new Map<
              number,
              { id: string; name: string; args: string }
            >();
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let done = false;

            while (!done) {
              const chunk = await reader.read();
              if (chunk.done) break;
              buffer += decoder.decode(chunk.value, { stream: true });
              let newlineIndex: number;
              while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                if (!line.startsWith("data:")) continue;
                const payload = line.slice(5).trim();
                if (payload === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(payload);
                  const delta = parsed?.choices?.[0]?.delta;
                  if (typeof delta?.content === "string" && delta.content.length > 0) {
                    text += delta.content;
                    emit("delta", { text: delta.content });
                  }
                  if (Array.isArray(delta?.tool_calls)) {
                    for (const part of delta.tool_calls) {
                      const index = Number(part.index ?? 0);
                      const current = calls.get(index) ?? { id: "", name: "", args: "" };
                      if (part.id) current.id = part.id;
                      if (part.function?.name) current.name = part.function.name;
                      if (part.function?.arguments) current.args += part.function.arguments;
                      calls.set(index, current);
                    }
                  }
                } catch (_err) {
                  // ignore malformed keepalive fragments
                }
              }
            }

            const toolCalls = [...calls.values()].filter((call) => call.name);

            working.push({
              role: "assistant",
              content: text,
              ...(toolCalls.length > 0
                ? {
                    tool_calls: toolCalls.map((call) => ({
                      id: call.id,
                      type: "function" as const,
                      function: { name: call.name, arguments: call.args || "{}" },
                    })),
                  }
                : {}),
            });

            if (toolCalls.length === 0) {
              const trimmed = working.slice(-40);
              await admin.from("ai_quote_sessions").upsert(
                { session_id: sessionId, messages: trimmed, quote_context: { plans } },
                { onConflict: "session_id" },
              );
              emit("done", { plans });
              controller.close();
              return;
            }

            for (const call of toolCalls) {
              emit("status", {
                stage: call.name === "get_quotes" ? "quoting" : "locating",
              });
              let toolResult: unknown;
              try {
                const args = JSON.parse(call.args || "{}");
                if (call.name === "look_up_location") {
                  const county = await resolveCounty(String(args.zipcode ?? ""));
                  toolResult = county
                    ? { county: county.name, state: county.state, fips: county.fips }
                    : { error: "No county found for that ZIP code." };
                } else if (call.name === "get_quotes") {
                  const outcome = await runQuotes(
                    {
                      zipcode: String(args.zipcode ?? ""),
                      income: Number(args.income ?? 0),
                      people: Array.isArray(args.people) ? args.people : [],
                      other_household_ages: Array.isArray(args.other_household_ages)
                        ? args.other_household_ages.map(Number)
                        : undefined,
                      drugs: Array.isArray(args.drugs) ? args.drugs.map(String) : undefined,
                      providers: Array.isArray(args.providers) ? args.providers.map(String) : undefined,
                      metal_level: args.metal_level ? String(args.metal_level) : undefined,
                    },
                    // Interim lists refresh the same card block on the client.
                    (partial) => emit("plans", { plans: partial }),
                  );
                  plans = outcome.plans;
                  toolResult = outcome.summary;
                  emit("plans", { plans });
                } else {
                  toolResult = { error: "Unknown tool." };
                }
              } catch (error) {
                console.error("tool error", call.name, error);
                toolResult = {
                  error: "That lookup did not return data. Ask the visitor to confirm details.",
                };
              }

              working.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(toolResult).slice(0, 8000),
              });
            }
          }

          emit("error", { message: "The quote composer could not complete that request." });
          controller.close();
        } catch (error) {
          console.error("ai-quote stream error", error);
          emit("error", { message: "Unexpected error in the quote composer." });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("ai-quote error", error);
    return jsonResponse({ error: "Unexpected error in the quote composer." }, 500);
  }
});
