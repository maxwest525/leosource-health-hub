import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3.6-flash";
const ELEVEN_VOICE_ID = "9BWtsMINqrJLrRacOk9x"; // Aria — warm, professional
const ELEVEN_MODEL = "eleven_turbo_v2_5";

const SYSTEM_PROMPT = `You are Trudy, the licensed-agency voice assistant for TruEnroll (TruEnroll #L118979).
You walk a consumer through a secure ACA self-enrollment intake by voice and fill the form on their behalf.

PERSONALITY
- Warm and clear, like a friendly agent across the desk. Never robotic, never sarcastic about money or health.
- Follow the HUMOR LEVEL given below exactly, and drop the humor entirely if the consumer sounds stressed or confused.


RULES
- Ask exactly ONE question per reply. Keep every reply under 30 spoken words, plain English.
- You are given the current form step and the current answers. Ask only for what is still missing on the CURRENT step.
- Narrate the move: when a step is done, briefly confirm what you captured, say what screen comes next, then ask its first question.
- Never guarantee coverage, never quote eligibility rules, and never give medical advice.
- If the consumer's situation sounds like Medicare, Medicaid, or job coverage, say a licensed specialist will follow up and stop collecting.
- Never say "talk to a human" — say "speak with a specialist".
- The moment the current step's answers are complete, set advance to true so the page moves forward for them.


OUTPUT
Reply with JSON only, no markdown:
{
  "say": "the sentence to speak",
  "fields": { ...only the fields you learned this turn... },
  "advance": false
}

FIELD SCHEMA (omit anything you did not learn)
  "address": string (full spoken street address, if given)
  "zip": "5-digit string"
  "effectiveDate": "YYYY-MM-DD" (must be one of the offered start dates)
  "spouse": boolean, "children": number, "others": number
  "members": [ { "index": 0, "age": number, "gender": "Male"|"Female", "tobacco": boolean } ]
     index 0 is the consumer, 1 is the spouse when present, then children, then others.
  "income": number (annual or monthly dollars), "incomePeriod": "year"|"month"
  "householdSize": number
Numbers must be numbers, never words.`;


/** Wording the model should follow for each humor setting (0 = strictly professional). */
const HUMOR_GUIDE = [
  "HUMOR LEVEL: none. Stay strictly professional and factual. No jokes, no asides.",
  "HUMOR LEVEL: light. At most a brief warm aside every few turns. Mostly straightforward.",
  "HUMOR LEVEL: moderate. A gentle, friendly quip is welcome when it fits naturally.",
  "HUMOR LEVEL: playful. Be noticeably funny and upbeat, but never at the consumer's expense and never longer than the answer itself.",
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Body = {
  audio?: string;
  mime?: string;
  text?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: Record<string, unknown>;
  speed?: number;
  humor?: number;
};


const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const base64ToBytes = (b64: string): Uint8Array => {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

async function transcribe(apiKey: string, audio: string, mime: string): Promise<string> {
  const bytes = base64ToBytes(audio);
  if (bytes.byteLength < 2048) return "";
  const ext = mime.includes("mp4") ? "mp4" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime || "audio/webm" }), `speech.${ext}`);
  form.append("model_id", "scribe_v2");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error(`ElevenLabs STT failed [${res.status}]: ${detail}`);
    throw new Error(`Transcription failed (${res.status})`);
  }
  const data = await res.json();
  return typeof data?.text === "string" ? data.text.trim() : "";
}

async function speak(apiKey: string, text: string, speed: number): Promise<string | null> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_64`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.78, style: 0.35, speed },
      }),

    },
  );
  if (!res.ok) {
    console.error(`ElevenLabs TTS failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  return bytesToBase64(new Uint8Array(await res.arrayBuffer()));
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!elevenKey) return json({ error: "Voice service is not configured." }, 500);
    if (!lovableKey) return json({ error: "AI service is not configured." }, 500);

    const body = (await req.json()) as Body;
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

    let transcript = typeof body.text === "string" ? body.text.trim() : "";
    if (!transcript && body.audio) {
      transcript = await transcribe(elevenKey, body.audio, body.mime ?? "audio/webm");
    }

    const opening = history.length === 0 && !transcript;
    if (!transcript && !opening) {
      return json({ transcript: "", say: "", fields: {}, advance: false, empty: true });
    }

    const speed = clamp(typeof body.speed === "number" ? body.speed : 0.9, 0.7, 1.2);
    const humorIndex = clamp(Math.round(typeof body.humor === "number" ? body.humor : 2), 0, 3);
    const contextLine = `CURRENT FORM CONTEXT (JSON):\n${JSON.stringify(body.context ?? {}, null, 0)}`;
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: HUMOR_GUIDE[humorIndex] },
      { role: "system", content: contextLine },

      ...history,
      {
        role: "user",
        content: opening
          ? "(The consumer just turned on the voice assistant. Greet them in one short sentence and ask the first question for the current step.)"
          : transcript,
      },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages, response_format: { type: "json_object" } }),
    });

    if (!aiRes.ok) {
      const detail = await aiRes.text();
      console.error(`AI gateway failed [${aiRes.status}]: ${detail}`);
      const message =
        aiRes.status === 429
          ? "The assistant is busy — try again in a moment."
          : aiRes.status === 402
            ? "The assistant is temporarily unavailable."
            : "The assistant could not respond.";
      return json({ error: message, status: aiRes.status }, aiRes.status);
    }

    const aiData = await aiRes.json();
    const raw: string = aiData?.choices?.[0]?.message?.content ?? "";
    let parsed: { say?: string; fields?: Record<string, unknown>; advance?: boolean } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { say: raw.replace(/[{}"]/g, " ").trim().slice(0, 240) };
    }

    const say = (parsed.say ?? "").toString().trim();
    const audio = say ? await speak(elevenKey, say, speed) : null;

    return json({
      transcript,
      say,
      fields: parsed.fields && typeof parsed.fields === "object" ? parsed.fields : {},
      advance: parsed.advance === true,
      audio,
    });
  } catch (error) {
    console.error("voice-guide error:", error);
    return json({ error: error instanceof Error ? error.message : "Voice assistant failed." }, 500);
  }
});
