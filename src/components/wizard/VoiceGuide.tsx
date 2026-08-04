import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic, MicOff, Settings2, Volume2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";


/** Fields the assistant is allowed to write into the intake form. */
export type VoiceFields = {
  address?: string;
  zip?: string;
  effectiveDate?: string;
  spouse?: boolean;
  children?: number;
  others?: number;
  members?: Array<{ index?: number; age?: number; gender?: "Male" | "Female"; tobacco?: boolean }>;
  income?: number;
  incomePeriod?: "year" | "month";
  householdSize?: number;
};

type Turn = { role: "user" | "assistant"; content: string };

type VoiceGuideProps = {
  /** Snapshot of the current step and answers, sent to the assistant each turn. */
  context: Record<string, unknown>;
  onFields: (fields: VoiceFields) => void;
  onAdvance: () => void;
  className?: string;
};

type Phase = "idle" | "listening" | "hearing" | "thinking" | "speaking";

const SPEECH_ON = 0.028; // RMS threshold to treat as speech
const SPEECH_OFF = 0.016; // RMS below this counts toward silence
const BARGE_IN_ON = 0.055; // louder threshold used to interrupt Trudy while she talks
const BARGE_IN_MS = 140; // sustained loudness before we cut her off
const SILENCE_MS = 480; // trailing silence that ends a turn
const MIN_TURN_MS = 280;

const PREFS_KEY = "lsia.voice-guide.prefs";
const DEFAULT_PREFS = { speed: 0.9, humor: 2 };
const HUMOR_LABELS = ["Strictly professional", "Lightly warm", "Friendly and funny", "Playful"];

type GuidePrefs = { speed: number; humor: number };

const readPrefs = (): GuidePrefs => {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFS;
    const value = parsed as Partial<GuidePrefs>;
    return {
      speed: typeof value.speed === "number" ? Math.min(1.2, Math.max(0.7, value.speed)) : DEFAULT_PREFS.speed,
      humor: typeof value.humor === "number" ? Math.min(3, Math.max(0, Math.round(value.humor))) : DEFAULT_PREFS.humor,
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

const speedLabel = (speed: number): string =>
  speed <= 0.8 ? "Slower" : speed >= 1.1 ? "Faster" : speed >= 1.0 ? "Natural" : "Relaxed";



const pickMime = (): string => {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find(type => MediaRecorder.isTypeSupported?.(type)) ?? "";
};

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the recording."));
    reader.readAsDataURL(blob);
  });

/** Live voice-to-voice intake assistant: hands-free, continuous turn taking. */
export const VoiceGuide = ({ context, onFields, onAdvance, className }: VoiceGuideProps) => {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<GuidePrefs>(readPrefs);

  const historyRef = useRef<Turn[]>([]);
  const contextRef = useRef(context);
  contextRef.current = context;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable — settings stay for this session only */
    }
  }, [prefs]);


  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false); // true only while Trudy's audio is actually playing
  const liveRef = useRef(false);
  const gateRef = useRef(false); // true while thinking/speaking — mic input ignored
  const advanceRef = useRef(onAdvance);
  advanceRef.current = onAdvance;
  const fieldsRef = useRef(onFields);
  fieldsRef.current = onFields;

  const stopPlayback = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.onended = null;
      el.onerror = null;
      el.pause();
    }
    audioRef.current = null;
    playingRef.current = false;
  }, []);

  /** One roundtrip: audio (or opening ping) in, spoken reply + fields out. */
  const send = useCallback(async (payload: { audio?: string; mime?: string; text?: string }) => {
    gateRef.current = true;
    setPhase("thinking");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("voice-guide", {
        body: {
          ...payload,
          history: historyRef.current.slice(-12),
          context: contextRef.current,
          speed: prefsRef.current.speed,
          humor: prefsRef.current.humor,
        },

      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(String(data.error));
      if (data?.empty) {
        gateRef.current = false;
        setPhase(liveRef.current ? "listening" : "idle");
        return;
      }

      const transcript = typeof data?.transcript === "string" ? data.transcript : "";
      const say = typeof data?.say === "string" ? data.say : "";
      if (transcript) {
        setHeard(transcript);
        historyRef.current = [...historyRef.current, { role: "user", content: transcript }];
      }
      if (say) {
        setReply(say);
        historyRef.current = [...historyRef.current, { role: "assistant", content: say }];
      }
      if (data?.fields && typeof data.fields === "object") fieldsRef.current(data.fields as VoiceFields);

      const resume = () => {
        playingRef.current = false;
        if (data?.advance === true) {
          // Move the page for them, let it settle, then narrate the new screen.
          advanceRef.current();
          gateRef.current = true;
          setPhase("thinking");
          window.setTimeout(() => {
            void sendRef.current({
              text: "(The page just moved to the next step. Confirm what we captured, say what this screen is, and ask its first question.)",
            });
          }, 320);
          return;
        }
        gateRef.current = false;
        setPhase(liveRef.current ? "listening" : "idle");
      };

      if (typeof data?.audio === "string" && data.audio) {
        stopPlayback();
        const el = new Audio(`data:audio/mpeg;base64,${data.audio}`);
        audioRef.current = el;
        playingRef.current = true;
        setPhase("speaking");
        el.onended = resume;
        el.onerror = resume;
        void el.play().catch(resume);
      } else {
        resume();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not respond.");
      gateRef.current = false;
      setPhase(liveRef.current ? "listening" : "idle");
    }
  }, [stopPlayback]);

  const sendRef = useRef(send);
  sendRef.current = send;


  /** Starts the mic stream and the continuous voice-activity loop. */
  const startLive = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") await audioCtx.resume().catch(() => {});
      ctxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);

      liveRef.current = true;
      setLive(true);
      setPhase("listening");

      let speaking = false;
      let startedAt = 0;
      let quietSince = 0;
      let loudSince = 0;

      const beginTurn = () => {
        const mime = pickMime();
        const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        chunksRef.current = [];
        recorder.ondataavailable = event => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          if (blob.size < 2400) {
            gateRef.current = false;
            setPhase(liveRef.current ? "listening" : "idle");
            return;
          }
          const audio = await blobToBase64(blob);
          await send({ audio, mime: recorder.mimeType || "audio/webm" });
        };
        recorder.start();
        recorderRef.current = recorder;
        startedAt = performance.now();
        speaking = true;
        setPhase("hearing");
      };

      const endTurn = () => {
        speaking = false;
        gateRef.current = true;
        setPhase("thinking");
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        recorderRef.current = null;
      };

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, rms * 12));

        if (gateRef.current) {
          // Barge-in: if the caller starts talking while Trudy speaks, cut her off and listen.
          if (!playingRef.current) return;
          const at = performance.now();
          if (rms > BARGE_IN_ON) {
            if (loudSince === 0) loudSince = at;
            if (at - loudSince > BARGE_IN_MS) {
              loudSince = 0;
              stopPlayback();
              gateRef.current = false;
              beginTurn();
            }
            return;
          }
          loudSince = 0;
          return;
        }
        loudSince = 0;

        const now = performance.now();
        if (!speaking) {
          if (rms > SPEECH_ON) beginTurn();
          return;
        }
        if (rms > SPEECH_OFF) {
          quietSince = 0;
          return;
        }
        if (quietSince === 0) quietSince = now;
        if (now - quietSince > SILENCE_MS && now - startedAt > MIN_TURN_MS) {
          quietSince = 0;
          endTurn();
        }
      };
      rafRef.current = requestAnimationFrame(tick);

      if (historyRef.current.length === 0) void send({});
    } catch {
      setError("Microphone access is needed for the live assistant.");
    }
  }, [send, stopPlayback]);

  const stopLive = useCallback(() => {
    liveRef.current = false;
    gateRef.current = false;
    setLive(false);
    setPhase("idle");
    setLevel(0);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    stopPlayback();
  }, [stopPlayback]);

  useEffect(() => () => stopLive(), [stopLive]);

  const closeAssistant = useCallback(() => {
    stopLive();
    setOpen(false);
  }, [stopLive]);

  const statusLabel =
    phase === "hearing"
      ? "Listening to you…"
      : phase === "thinking"
        ? "Thinking…"
        : phase === "speaking"
          ? "Trudy is speaking"
          : live
            ? "Go ahead, I'm listening"
            : "Start the live conversation";

  return (
    <div className={cn("pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-primary/20 bg-card/95 shadow-xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between gap-2 bg-primary px-3.5 py-2.5 text-primary-foreground">
              <span className="flex items-center gap-2 text-[12.5px] font-semibold">
                <Volume2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                Trudy · live voice intake
              </span>
              <span className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setShowSettings(value => !value)}
                  aria-label="Voice guide settings"
                  aria-expanded={showSettings}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    showSettings ? "text-primary-foreground" : "text-primary-foreground/80 hover:text-primary-foreground",
                  )}
                >
                  <Settings2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={closeAssistant}
                  aria-label="Close the voice assistant"
                  className="rounded-md p-1 text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </span>
            </div>

            <AnimatePresence initial={false}>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-b border-border/60 bg-muted/40"
                >
                  <div className="space-y-3.5 px-3.5 py-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="guide-speed" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Speaking speed
                        </label>
                        <span className="text-[11.5px] font-medium text-foreground">
                          {speedLabel(prefs.speed)} · {prefs.speed.toFixed(2)}x
                        </span>
                      </div>
                      <Slider
                        id="guide-speed"
                        min={0.7}
                        max={1.2}
                        step={0.05}
                        value={[prefs.speed]}
                        onValueChange={([speed]) => setPrefs(current => ({ ...current, speed }))}
                        aria-label="Speaking speed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="guide-humor" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Humor
                        </label>
                        <span className="text-[11.5px] font-medium text-foreground">{HUMOR_LABELS[prefs.humor]}</span>
                      </div>
                      <Slider
                        id="guide-humor"
                        min={0}
                        max={3}
                        step={1}
                        value={[prefs.humor]}
                        onValueChange={([humor]) => setPrefs(current => ({ ...current, humor }))}
                        aria-label="How funny the guide is"
                      />
                    </div>

                    <p className="text-[10.5px] leading-snug text-muted-foreground/70">
                      Changes apply to Trudy's next reply and are remembered on this device.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>


            <div className="space-y-2.5 px-3.5 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    phase === "hearing"
                      ? "bg-primary animate-pulse"
                      : phase === "speaking"
                        ? "bg-accent animate-pulse"
                        : live
                          ? "bg-primary/50"
                          : "bg-muted-foreground/40",
                  )}
                  aria-hidden
                />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {statusLabel}
                </span>
              </div>

              {/* live input meter */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary/70"
                  animate={{ width: `${Math.round(level * 100)}%` }}
                  transition={{ duration: 0.08, ease: "linear" }}
                />
              </div>

              {heard && (
                <p className="text-[11.5px] leading-snug text-muted-foreground">
                  <span className="font-semibold text-foreground/70">You:</span> {heard}
                </p>
              )}
              <p className="min-h-[2.5rem] text-[13px] font-medium leading-snug text-foreground">
                {reply || (live ? "Answer out loud — I'll fill the form as you go." : "Tap start and just talk.")}
              </p>
              {error && <p className="text-[11.5px] leading-snug text-destructive">{error}</p>}

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={live ? stopLive : startLive}
                  className={cn(
                    "inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-[12.5px] font-semibold transition-colors",
                    live
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : "border-primary/35 bg-primary/[0.06] text-primary hover:bg-primary/[0.1]",
                  )}
                >
                  {phase === "thinking" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden /> Working
                    </>
                  ) : live ? (
                    <>
                      <MicOff className="h-4 w-4" strokeWidth={1.75} aria-hidden /> End live conversation
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Start live conversation
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10.5px] leading-snug text-muted-foreground/70">
                Trudy fills the form as you speak. Review every field before you continue.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            void startLive();
          }}
          className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 text-[12.5px] font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
        >
          <Mic className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Guide me by voice
        </button>
      )}
    </div>
  );
};
