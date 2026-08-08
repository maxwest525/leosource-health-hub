import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ShieldCheck, RotateCcw, User, History } from "lucide-react";
import trudyAvatar from "@/assets/truenroll/trudy.png";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuoteAtmosphere } from "@/components/quote/QuoteAtmosphere";
import { PlanCard, type QuotePlan } from "@/components/quote/PlanCard";
import { ChatHistoryDrawer } from "@/components/ai-quote/ChatHistoryDrawer";
import {
  archiveSession,
  clearHistory,
  createSessionId,
  loadCachedItems,
  loadHistory,
  removeHistoryEntry,
  saveCachedItems,
  SESSION_KEY,
  type ChatHistoryEntry,
  type ConversationItem,
} from "@/lib/leo-chat-history";

import { cn } from "@/lib/utils";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { takeAiQuoteSeed } from "@/lib/ai-quote-seed";






const AGENT_NAME = "Trudy";
const GREETING = "Let's find your plan.";
const GREETING_SUB =
  "Tell me your ZIP code and who needs coverage, and I'll walk you through live 2026 Marketplace pricing for your county.";


const THINKING_STAGES = [
  "Reading your details",
  "Locating your rating area",
  "Querying live Marketplace pricing",
  "Estimating your premium tax credit",
  "Ranking plans for your household",
];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;


/** Short local clock label shown beside each message role. */
const formatTime = (value: number) =>
  new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const SenderAvatar = ({ kind }: { kind: "user" | "assistant" }) =>
  kind === "assistant" ? (
    <img
      src={trudyAvatar}
      alt="Trudy"
      className="h-5 w-5 shrink-0 rounded-full object-cover"
      loading="lazy"
    />
  ) : (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
      <User className="h-3 w-3" />
    </span>
  );




/** Minimal three-dot indicator shown while the composer works. */
const ThinkingLoader = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, THINKING_STAGES.length - 1));
    }, 1900);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className="flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.18,
            }}
          />
        ))}
      </span>

      <AnimatePresence mode="wait">
        <motion.p
          key={stage}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          className="text-sm text-muted-foreground"
        >
          {THINKING_STAGES[stage]}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
};


/**
 * Live quote deck rendered inline in the transcript. Cards stream in one at a
 * time behind a holographic panel header with a live telemetry readout.
 */
type PlanSort = "premium" | "deductible";

const SORT_OPTIONS: { value: PlanSort; label: string }[] = [
  { value: "premium", label: "Lowest premium" },
  { value: "deductible", label: "Lowest deductible" },
];

const METAL_ORDER = ["Catastrophic", "Bronze", "Silver", "Gold", "Platinum"];

const PlanResults = ({ plans }: { plans: QuotePlan[] }) => {
  const [visible, setVisible] = useState(1);
  const [sort, setSort] = useState<PlanSort>("premium");
  const [metal, setMetal] = useState<string>("all");

  const metalLevels = useMemo(() => {
    const found = Array.from(new Set(plans.map((plan) => plan.metalLevel).filter(Boolean)));
    return found.sort((a, b) => METAL_ORDER.indexOf(a) - METAL_ORDER.indexOf(b));
  }, [plans]);

  const processed = useMemo(() => {
    const filtered = metal === "all" ? plans : plans.filter((plan) => plan.metalLevel === metal);
    return [...filtered].sort((a, b) => {
      if (sort === "deductible") {
        const left = a.deductible ?? Number.POSITIVE_INFINITY;
        const right = b.deductible ?? Number.POSITIVE_INFINITY;
        return left - right;
      }
      return a.premiumWithCredit - b.premiumWithCredit;
    });
  }, [plans, metal, sort]);

  useEffect(() => {
    if (visible >= processed.length) return;
    const timer = window.setTimeout(() => setVisible((count) => count + 1), 130);
    return () => window.clearTimeout(timer);
  }, [visible, processed.length]);

  const shown = processed.slice(0, visible);
  const best = processed.reduce(
    (low, plan) => Math.min(low, plan.premiumWithCredit),
    Number.POSITIVE_INFINITY,
  );


  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.12 }}
      className="relative w-full min-w-0 overflow-hidden rounded-3xl border border-primary/20 bg-card/50 p-3 backdrop-blur-2xl sm:p-4 md:p-5"
    >

      <span className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-primary"
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground">
            Live 2026 quote deck
          </h2>
        </div>
        <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
        <span className="text-[11px] tabular-nums text-primary">
          {shown.length}/{processed.length} rendered
        </span>
        {Number.isFinite(best) && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Best ${Math.round(best)}/mo
          </span>
        )}
      </div>

      {/* Sort + coverage-type controls. Chips scroll horizontally on phones. */}
      <div className="relative mt-3 space-y-2">
        <div
          role="group"
          aria-label="Sort plans"
          className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={sort === option.value}
              onClick={() => {
                setSort(option.value);
                setVisible(processed.length || 1);
              }}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-xs font-medium transition-colors",
                sort === option.value
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {metalLevels.length > 1 && (
          <div
            role="group"
            aria-label="Filter by coverage type"
            className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
          >
            {["all", ...metalLevels].map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={metal === level}
                onClick={() => {
                  setMetal(level);
                  setVisible(1);
                }}
                className={cn(
                  "flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-xs font-medium transition-colors",
                  metal === level
                    ? "border-primary/60 bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {level === "all" ? "All coverage types" : level}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Mobile: swipeable snap rail. sm+: stacked grid. */}
      <motion.div
        layout
        role="list"
        aria-label="Plan quotes"
        className="relative -mx-3 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-3 px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:min-w-0"
      >
        {shown.map((plan, index) => (
          <motion.div
            key={plan.id}
            role="listitem"
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.16 + index * 0.05 }}
            className="w-[86%] shrink-0 snap-center sm:w-auto sm:shrink"
          >
            <PlanCard plan={plan} rank={index + 1} />
          </motion.div>
        ))}

      </motion.div>

      {processed.length === 0 && (
        <p role="status" className="relative mt-3 text-xs text-muted-foreground">
          No plans match that coverage type. Try another filter.
        </p>
      )}

      {processed.length > 1 && (

        <p className="relative mt-1 text-[11px] text-muted-foreground sm:hidden">
          Swipe to compare plans
        </p>
      )}


      <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
        <ShieldCheck className="mt-[2px] h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Pricing reflects live 2026 Marketplace data, including any advance premium tax credit estimated from the
          income you share. Final eligibility is confirmed at enrollment.
        </p>
      </div>
    </motion.section>
  );
};

/**
 * Placeholder deck shown while the CMS lookup runs. It mirrors the real quote
 * panel's chrome, grid and card metrics so the transcript keeps its height and
 * nothing shifts under the thumb on mobile when the real cards land.
 */
const PlanResultsSkeleton = () => (
  <motion.section
    aria-busy="true"
    aria-label="Loading plan quotes"
    role="status"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.99, transition: { duration: 0.32, ease: EASE_IN_OUT } }}
    transition={{ duration: 0.4, ease: EASE_OUT }}

    className="relative w-full min-w-0 overflow-hidden rounded-3xl border border-primary/20 bg-card/50 p-3 backdrop-blur-2xl sm:p-4 md:p-5"
  >
    <span className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
    <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />

    <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-2">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.4, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-foreground">
          Pricing your plans
        </h2>
      </div>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      <span className="text-[11px] text-primary">Checking 2026 Marketplace</span>
    </div>

    <div className="relative -mx-3 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-3 px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 [&>*]:min-w-0">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="relative w-[86%] shrink-0 snap-center overflow-hidden rounded-2xl border border-primary/15 bg-card/70 p-3 sm:w-auto sm:shrink sm:p-4"
        >

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2 w-24 animate-pulse rounded bg-muted/60" />
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted/60" />
              <div className="h-2.5 w-2/5 animate-pulse rounded bg-muted/40" />
            </div>
            <div className="h-5 w-20 shrink-0 animate-pulse rounded bg-muted/60" />
          </div>

          <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
            {Array.from({ length: 3 }).map((__, row) => (
              <div key={row} className="flex items-center justify-between gap-3">
                <div className="h-2.5 w-20 animate-pulse rounded bg-muted/40" />
                <div className="h-2.5 w-12 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>

          <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-muted/30 sm:h-4 sm:w-24" />
        </div>
      ))}
    </div>

    <span className="sr-only">Loading live plan pricing</span>
  </motion.section>
);



/**
 * Live conversational quoting walkthrough. Reads like a normal chat: the
 * assistant's answers reveal word by word, the composer stays pinned and
 * focused, and priced plans appear inline in the flow of the conversation.
 */
const AiQuote = () => {
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string>("");
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  // True while the CMS quote lookup is running, so the transcript can hold the
  // deck's space with skeleton cards instead of jumping when results land.
  const [quoting, setQuoting] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [booting, setBooting] = useState(true);
  const keyboardInset = useKeyboardInset();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef<string | null>(takeAiQuoteSeed());


  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ChatHistoryEntry[]>([]);
  // Latest transcript, so the conversation can be archived when the page unloads.
  const liveRef = useRef<{ id: string; items: ConversationItem[] }>({ id: "", items: [] });
  liveRef.current = { id: sessionId, items };

  // Every visit starts a brand new conversation; past ones live in history.
  useEffect(() => {
    const id = createSessionId();
    setSessionId(id);
    window.localStorage.setItem(SESSION_KEY, id);
    setHistory(loadHistory());
    setBooting(false);

    const archive = () => archiveSession(liveRef.current.id, liveRef.current.items);
    window.addEventListener("beforeunload", archive);
    return () => {
      window.removeEventListener("beforeunload", archive);
      archive();
    };
  }, []);


  // Autosave the transcript locally on every change.
  useEffect(() => {
    if (!sessionId || booting) return;
    saveCachedItems(sessionId, items);
  }, [sessionId, items, booting]);


  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, streaming, thinking, keyboardInset]);

  useEffect(() => {
    if (!thinking && !booting) inputRef.current?.focus();
  }, [thinking, booting]);

  /**
   * Streams the reply token by token straight from the edge function's SSE
   * response so partial text renders the moment the model produces it.
   */
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || thinking || streaming !== null || !sessionId) return;
      setInput("");
      setItems((prev) => [...prev, { kind: "user", content: trimmed, at: Date.now() }]);
      setThinking(true);
      setQuoting(false);

      let assembled = "";
      let plansOpen = false;
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-quote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ sessionId, mode: "send", message: trimmed }),
          },
        );

        if (!response.ok || !response.body) {
          throw new Error("The quote composer is unavailable right now.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError: string | null = null;

        const handleEvent = (name: string, raw: string) => {
          let data: Record<string, unknown> = {};
          try {
            data = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            return;
          }
          if (name === "delta" && typeof data.text === "string") {
            assembled += data.text;
            setThinking(false);
            setStreaming(assembled);
          } else if (name === "status") {
            setQuoting(data.stage === "quoting");
          } else if (name === "plans" && Array.isArray(data.plans)) {
            // Quotes land mid-stream and are refined as the lookup finishes, so
            // the first payload opens a card block and later ones update it in
            // place instead of stacking duplicate result sets.
            const fresh = data.plans as QuotePlan[];
            if (fresh.length > 0) {
              setQuoting(false);
              if (!plansOpen && assembled.trim().length > 0) {
                setItems((prev) => [...prev, { kind: "assistant", content: assembled, at: Date.now() }]);
                assembled = "";
                setStreaming("");
              }
              if (plansOpen) {
                setItems((prev) => {
                  const next = [...prev];
                  for (let index = next.length - 1; index >= 0; index -= 1) {
                    if (next[index].kind === "plans") {
                      next[index] = { kind: "plans", plans: fresh };
                      return next;
                    }
                  }
                  return [...next, { kind: "plans", plans: fresh }];
                });
              } else {
                plansOpen = true;
                setItems((prev) => [...prev, { kind: "plans", plans: fresh }]);
              }
            }
          } else if (name === "error" && typeof data.message === "string") {
            streamError = data.message;
          }
        };


        // Parse the SSE frames as they arrive; each frame is separated by a blank line.
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          let split: number;
          while ((split = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            let eventName = "message";
            let dataLine = "";
            for (const line of frame.split("\n")) {
              if (line.startsWith("event:")) eventName = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
            }
            if (dataLine) handleEvent(eventName, dataLine);
          }
        }

        if (streamError) throw new Error(streamError);

        setStreaming(null);
        setThinking(false);
        setQuoting(false);
        if (assembled.trim().length > 0) {
          setItems((prev) => [...prev, { kind: "assistant", content: assembled, at: Date.now() }]);
        }
      } catch (caught) {
        setStreaming(null);
        setThinking(false);
        setQuoting(false);
        if (assembled.trim().length > 0) {
          setItems((prev) => [...prev, { kind: "assistant", content: assembled, at: Date.now() }]);
        }
        toast({
          title: "Quote composer unavailable",
          description:
            caught instanceof Error ? caught.message : "Please try again, or speak with a licensed specialist.",
          variant: "destructive",
        });
      }
    },
    [sessionId, streaming, thinking, toast],
  );

  // The hero's "Ask Trudy" panel can hand off an opening question.
  useEffect(() => {
    if (booting || !sessionId) return;
    const seed = seedRef.current;
    if (!seed) return;
    seedRef.current = null;
    void send(seed);
  }, [booting, sessionId, send]);




  /** Files the current chat into history and opens an empty one. */
  const startOver = useCallback(() => {
    setHistory(archiveSession(sessionId, items));
    const next = createSessionId();
    window.localStorage.setItem(SESSION_KEY, next);
    setSessionId(next);
    setItems([]);
    setStreaming(null);
    setQuoting(false);
    inputRef.current?.focus();
  }, [sessionId, items]);

  /** Reopens a past conversation, archiving the current one first. */
  const restoreSession = useCallback(
    (id: string) => {
      setHistory(archiveSession(sessionId, items));
      setSessionId(id);
      setItems(loadCachedItems(id));
      setStreaming(null);
      setQuoting(false);
      setHistoryOpen(false);
      window.localStorage.setItem(SESSION_KEY, id);
    },
    [sessionId, items],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setHistory(removeHistoryEntry(id));
      if (id === sessionId) {
        const next = createSessionId();
        window.localStorage.setItem(SESSION_KEY, next);
        setSessionId(next);
        setItems([]);
      }
    },
    [sessionId],
  );

  const clearAllHistory = useCallback(() => {
    setHistory(clearHistory());
  }, []);


  const busy = thinking || streaming !== null;
  const empty = items.length === 0 && !streaming && !thinking;

  // Wizard framing: pair each question with the answer that followed it, then
  // keep only the current step on screen so the flow reads like a form.
  const answered: { question: string; answer: string }[] = [];
  let pendingQuestion: string | null = null;
  items.forEach((item) => {
    if (item.kind === "assistant") pendingQuestion = item.content;
    else if (item.kind === "user") {
      answered.push({ question: pendingQuestion ?? "Your answer", answer: item.content });
      pendingQuestion = null;
    }
  });

  // Full conversation stays on screen so the user can scroll back through it.
  const visible = items.map((item, index) => ({ item, index }));



  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <Header />

      <main className="quote-console relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden pt-20 md:pt-24">
        <QuoteAtmosphere />

        {/* Chat history */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          aria-label="Chat history"
          className="absolute right-3 top-[5.25rem] z-20 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground md:right-5 md:top-[6.5rem]"
        >
          <History className="h-4 w-4" />
        </button>
        <ChatHistoryDrawer
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          entries={history}
          activeId={sessionId}
          onSelect={restoreSession}
          onDelete={deleteSession}
          onClear={clearAllHistory}
        />

        {/* Conversation */}
        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col">

          <div className="mx-auto mt-auto w-full max-w-3xl px-4 py-6 space-y-6 md:px-5 md:py-8 md:space-y-7">
            {empty ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
                className="pt-2 md:pt-14"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                      {AGENT_NAME}
                    </p>
                    <p className="text-xs text-muted-foreground">Licensed coverage concierge</p>
                  </div>
                </div>
                <h1 className="mt-5 text-3xl font-bold leading-[1.05] tracking-tight text-foreground md:text-6xl">
                  Hi, I&apos;m {AGENT_NAME}.{" "}
                  <span className="text-primary">{GREETING}</span>
                </h1>
                <p className="mt-4 max-w-xl text-base md:text-lg font-light leading-relaxed text-muted-foreground">
                  {GREETING_SUB}
                </p>
              </motion.div>


            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Step {answered.length + 1}
                  </span>
                  <button
                    type="button"
                    onClick={startOver}
                    className="-mr-1 inline-flex h-9 items-center gap-1.5 rounded-full border border-transparent px-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
                  >
                    <RotateCcw className="w-3 h-3" />
                    New chat
                  </button>

                </div>



              </div>
            )}

            {visible.map(({ item, index }) =>
              item.kind === "plans" ? (
                <PlanResults key={`plans-${index}`} plans={item.plans} />
              ) : (
                <motion.div
                  key={`${item.kind}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className={cn("flex", item.kind === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "whitespace-pre-wrap leading-relaxed",
                      item.kind === "user"
                        ? "max-w-[80%] text-right text-sm text-muted-foreground"
                        : "max-w-full text-[15px] md:text-base text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80",
                        item.kind === "user" && "justify-end",
                      )}
                    >
                      <SenderAvatar kind={item.kind === "user" ? "user" : "assistant"} />
                      {item.kind === "user" ? "You" : "Trudy"}
                      {item.at ? (
                        <time
                          dateTime={new Date(item.at).toISOString()}
                          className="font-normal tabular-nums tracking-normal text-muted-foreground/70"
                        >
                          {formatTime(item.at)}
                        </time>
                      ) : null}
                    </span>

                    {item.content}
                  </div>

                </motion.div>
              ),
            )}


            {streaming !== null && (
              <div className="text-[15px] md:text-base text-foreground leading-relaxed whitespace-pre-wrap">
                <span className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                  <SenderAvatar kind="assistant" />
                  Trudy
                </span>
                {streaming}
                <motion.span
                  className="inline-block w-[2px] h-[1.05em] align-[-0.15em] ml-0.5 bg-primary"

                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}

            <AnimatePresence>{quoting && <PlanResultsSkeleton />}</AnimatePresence>

            <AnimatePresence>{thinking && <ThinkingLoader />}</AnimatePresence>


            <div ref={endRef} />
          </div>
        </div>


        {/* Persistent composer */}

        <div
          className="relative z-10 shrink-0 border-t border-primary/15 bg-background/70 backdrop-blur-2xl transition-transform duration-200"
          style={{
            transform: keyboardInset ? `translateY(-${keyboardInset}px)` : undefined,
            paddingBottom: keyboardInset ? 0 : "env(safe-area-inset-bottom)",
          }}
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="mx-auto w-full max-w-3xl px-3 py-3 space-y-2 md:px-5 md:py-4">
            <PromptInputBox
              allowAttachments
              onSend={(message, files) => {
                const names = (files ?? []).map((file) => file.name).join(", ");
                const withAttachment = names
                  ? `${message}${message ? "\n\n" : ""}[Attached document: ${names}]`
                  : message;
                void send(withAttachment);
              }}
              isLoading={busy}
              disabled={booting}
              placeholder="Type your answer or attach a document..."
            />

            <p className="text-center text-[11px] text-muted-foreground">
              Live CMS Marketplace data · Speak with a licensed specialist before enrolling
            </p>
          </div>

        </div>

      </main>
    </div>
  );
};

export default AiQuote;
