import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

type GeocodeResult = {
  geometry?: {
    location?: { lat: number; lng: number };
    bounds?: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } };
    viewport?: { northeast: { lat: number; lng: number }; southwest: { lat: number; lng: number } };
  };
  formatted_address?: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!lovableApiKey || !mapsKey) {
    return json({ error: "Google Maps connector is not configured" }, 500);
  }

  let payload: { zip?: string; county?: string; state?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const zip = typeof payload.zip === "string" ? payload.zip.replace(/\D/g, "").slice(0, 5) : "";
  const county = typeof payload.county === "string" ? payload.county.slice(0, 80) : "";
  const state = typeof payload.state === "string" ? payload.state.slice(0, 2) : "";

  if (!/^\d{5}$/.test(zip) && !county) {
    return json({ error: "Provide a 5-digit ZIP code or a county name" }, 400);
  }

  const query = county && state ? `${county} County, ${state}, USA` : `${zip}, USA`;

  const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": mapsKey,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    console.error(`Geocode request failed [${response.status}]: ${details}`);
    return json({ error: "Geocode request failed", status: response.status, details }, response.status);
  }

  const data = (await response.json()) as { status?: string; results?: GeocodeResult[] };
  const first = data.results?.[0];
  const location = first?.geometry?.location;

  if (!location) {
    return json({ error: "No match", status: data.status ?? "ZERO_RESULTS" }, 404);
  }

  const bounds = first?.geometry?.bounds ?? first?.geometry?.viewport ?? null;

  return json({
    lat: location.lat,
    lng: location.lng,
    bounds,
    label: first?.formatted_address ?? query,
  });
});
