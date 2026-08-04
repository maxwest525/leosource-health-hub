import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles, ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/* ================================================================== */
/*  TYPES                                                              */
/* ================================================================== */

type Message = { role: "user" | "assistant"; content: string };

type UserContext = {
  step: number;
  zip: string;
  category: string;
  doctors: { name: string; specialty: string }[];
  prescriptions: { name: string; dosage: string }[];
  budget: string;
  network: string;
  priorities: string[];
  plansCompared: number;
};

type ProactivePrompt = {
  label: string;
  message: string;
};

/* ================================================================== */
/*  STEP-AWARE PROMPTS                                                 */
/* ================================================================== */

function getProactivePrompts(ctx: UserContext): ProactivePrompt[] {
  const prompts: ProactivePrompt[] = [];

  if (ctx.step === 1) {
    prompts.push(
      { label: "Help me choose a coverage type", message: "Can you help me understand the difference between Individual & Family coverage and Medicare? I'm not sure which one applies to me." },
      { label: "Why does my ZIP code matter?", message: "Why do I need to enter my ZIP code? Does it affect which plans are available?" },
    );
  }
  if (ctx.step === 2) {
    prompts.push(
      { label: "How does doctor search work?", message: "How does searching for my doctor help me compare plans? Does it guarantee they'll be in my network?" },
    );
    if (ctx.doctors.length === 0) {
      prompts.push({ label: "Can I skip adding doctors?", message: "Do I need to add doctors, or can I skip this step and still compare plans?" });
    }
  }
  if (ctx.step === 3) {
    prompts.push(
      { label: "Why add my prescriptions?", message: "How does adding my prescriptions help with plan comparison? Will it show me exact costs?" },
    );
    if (ctx.prescriptions.length === 0) {
      prompts.push({ label: "Can I compare without Rx?", message: "Can I still get useful results if I don't add any prescriptions?" });
    }
  }
  if (ctx.step === 4) {
    prompts.push(
      { label: "Lower premium or lower deductible?", message: "Can you explain the tradeoff between a lower monthly premium and a lower deductible? Which might be better for me?" },
      { label: "What is HMO vs PPO?", message: "What's the difference between HMO and PPO? Which one gives me more flexibility?" },
    );
  }
  if (ctx.step === 5) {
    prompts.push(
      { label: "Help me understand these results", message: "Can you help me understand what these plan results mean? What should I look at first?" },
      { label: "Summarize what I've entered", message: "Can you summarize what I've entered so far — my doctors, prescriptions, and preferences?" },
      { label: "Talk to a licensed agent", message: "I'd like to speak with a licensed agent to review my options. Can you help me connect?" },
    );
    if (ctx.plansCompared >= 2) {
      prompts.push({ label: "Compare my selected plans", message: "Can you help me understand the key differences between the plans I've compared?" });
    }
  }

  // Always available
  prompts.push(
    { label: "What is a deductible?", message: "Can you explain what a deductible is in simple terms?" },
  );

  return prompts.slice(0, 4);
}

function getWelcomeMessage(ctx: UserContext): string {
  if (ctx.step === 1) {
    return "Welcome! I'm your coverage guide. I can help you understand each step as you search for doctors, add prescriptions, and compare health plans. Where would you like to start?";
  }
  if (ctx.step === 2) {
    return `Great — you're looking at ${ctx.category || "coverage"} options${ctx.zip ? ` near ${ctx.zip}` : ""}. You can search for your doctors or specialists here. I'm happy to help if you have questions.`;
  }
  if (ctx.step === 3) {
    return `You've saved ${ctx.doctors.length} doctor${ctx.doctors.length !== 1 ? "s" : ""}. Now you can add your prescriptions to help refine your plan matches. Let me know if you need guidance.`;
  }
  if (ctx.step === 4) {
    return "Now let's set your coverage preferences. This helps narrow down plans that align with your priorities. I can explain any of these options.";
  }
  if (ctx.step === 5) {
    const parts: string[] = [];
    if (ctx.doctors.length) parts.push(`${ctx.doctors.length} doctor${ctx.doctors.length !== 1 ? "s" : ""}`);
    if (ctx.prescriptions.length) parts.push(`${ctx.prescriptions.length} prescription${ctx.prescriptions.length !== 1 ? "s" : ""}`);
    return `Here are your matching plans${parts.length ? ` based on ${parts.join(" and ")}` : ""}. I can help explain the differences or connect you with a licensed agent for personalized guidance.`;
  }
  return "I'm your coverage guide. Ask me anything about health plans, doctors, prescriptions, or how this tool works.";
}

/* ================================================================== */
/*  STREAMING                                                          */
/* ================================================================== */

const CONCIERGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coverage-concierge`;

async function streamConcierge({
  messages,
  userContext,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  userContext: UserContext;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  try {
    const resp = await fetch(CONCIERGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, userContext }),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      onError(errBody.error || "Coverage guide is temporarily unavailable.");
      return;
    }

    if (!resp.body) {
      onError("No response received.");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Flush remaining
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (err) {
    onError("Connection error. Please try again.");
  }
}

/* ================================================================== */
/*  LOG INTERACTION                                                     */
/* ================================================================== */

async function logConciergeInteraction(sessionId: string, action: string, details: any) {
  try {
    // Try to find lead by session, otherwise just log
    const { data: leads } = await supabase
      .from("tool_leads")
      .select("id")
      .eq("session_id", sessionId)
      .limit(1);

    if (leads && leads.length > 0) {
      await supabase.from("tool_lead_interactions").insert({
        lead_id: leads[0].id,
        action,
        details,
      });
    }
  } catch { /* silently fail */ }
}

/* ================================================================== */
/*  COMPONENT                                                          */
/* ================================================================== */

export default function CoverageConcierge({
  userContext,
  sessionId,
  onRequestAgent,
}: {
  userContext: UserContext;
  sessionId: string;
  onRequestAgent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevStepRef = useRef(userContext.step);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  // Update welcome when step changes
  useEffect(() => {
    if (userContext.step !== prevStepRef.current && open && messages.length > 0) {
      const welcome = getWelcomeMessage(userContext);
      setMessages(prev => [...prev, { role: "assistant", content: welcome }]);
      prevStepRef.current = userContext.step;
    }
  }, [userContext.step, open]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setError("");
    if (messages.length === 0) {
      setMessages([{ role: "assistant", content: getWelcomeMessage(userContext) }]);
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [messages.length, userContext]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError("");
    setHasInteracted(true);

    const userMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    // Log interaction
    logConciergeInteraction(sessionId, "concierge_question", {
      question: text.trim(),
      step: userContext.step,
    });

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > updatedMessages.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamConcierge({
      messages: updatedMessages.slice(-10), // Send last 10 for context window
      userContext,
      onDelta: upsertAssistant,
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        setError(err);
        setIsStreaming(false);
      },
    });
  }, [messages, isStreaming, sessionId, userContext]);

  const prompts = getProactivePrompts(userContext);

  // Floating trigger
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl",
          "bg-primary text-primary-foreground shadow-[0_4px_24px_rgba(0,0,0,0.12)]",
          "hover:shadow-[0_6px_32px_rgba(0,0,0,0.18)] hover:-translate-y-0.5",
          "transition-all duration-300 group",
          "sm:bottom-8 sm:right-8"
        )}
        aria-label="Open coverage guide"
      >
        <Sparkles className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />
        <span className="text-[13px] font-semibold tracking-tight">Coverage Guide</span>
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed bottom-0 right-0 z-50 sm:bottom-6 sm:right-6",
      "w-full sm:w-[400px] sm:max-h-[600px] max-h-[85vh]",
      "bg-white border border-slate-200 sm:rounded-2xl rounded-t-2xl",
      "shadow-[0_8px_40px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden",
      "animate-in slide-in-from-bottom-4 fade-in duration-300"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/[0.08] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground leading-none">Coverage Guide</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Health plan guidance</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          aria-label="Close coverage guide"
        >
          <X className="w-4 h-4 text-muted-foreground/50" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-lg"
                : "bg-slate-100 text-foreground rounded-bl-lg"
            )}>
              {msg.content.split("\n").map((line, j) => (
                <p key={j} className={j > 0 ? "mt-1.5" : ""}>
                  {line.split(/(\*\*.*?\*\*)/).map((part, k) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={k} className="font-semibold">{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              ))}
            </div>
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl rounded-bl-lg px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-[12px] rounded-xl px-3 py-2 border border-red-100">
            {error}
          </div>
        )}
      </div>

      {/* Proactive prompts */}
      {(!hasInteracted || messages.length <= 2) && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p.message)}
              disabled={isStreaming}
              className={cn(
                "text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all duration-200",
                "bg-white border-slate-200 text-foreground/70 hover:bg-primary/[0.04] hover:border-primary/20 hover:text-primary",
                "disabled:opacity-40 active:scale-[0.97]"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Agent handoff bar */}
      {hasInteracted && userContext.step >= 4 && onRequestAgent && (
        <div className="px-4 pb-2">
          <button
            onClick={() => {
              logConciergeInteraction(sessionId, "concierge_agent_handoff", { step: userContext.step });
              onRequestAgent();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium hover:bg-emerald-100 transition-colors"
          >
            <Phone className="w-3 h-3" />
            Speak to a Licensed Agent
            <ArrowRight className="w-3 h-3 ml-auto" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about coverage, plans, or next steps…"
            disabled={isStreaming}
            className="flex-1 text-[13px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
              input.trim() && !isStreaming
                ? "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                : "bg-slate-100 text-slate-300"
            )}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </form>
        <p className="text-[9px] text-muted-foreground/40 text-center mt-2">
          For plan-specific verification, please speak with a licensed agent.
        </p>
      </div>
    </div>
  );
}
