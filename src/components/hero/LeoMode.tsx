import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAiQuoteSeed } from "@/lib/ai-quote-seed";
import { ModeDescription, ModeTrust } from "@/components/hero/ModeParts";

const EXAMPLES = [
  "What's my subsidy?",
  "Is my doctor covered?",
  "Can I switch mid-year?",
  "Are my prescriptions included?",
] as const;

/** A miniature chat composer that hands the visitor's question to the AI walkthrough. */
export const LeoMode = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    if (question) return;
    const timer = window.setInterval(
      () => setExampleIndex((index) => (index + 1) % EXAMPLES.length),
      3200,
    );
    return () => window.clearInterval(timer);
  }, [question]);

  const go = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) saveAiQuoteSeed(trimmed);
    navigate("/ai-quote");
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        go(question);
      }}
      noValidate
    >
      <ModeDescription>
        <span className="block truncate">
          <span className="font-semibold text-foreground">Trudy</span> answers any coverage
          what-if, instantly.
        </span>
      </ModeDescription>

      <div className="rounded-xl border border-border/70 bg-background/60 p-1.5">
        <div className="mb-1.5 flex justify-start">
          <p className="max-w-[85%] truncate rounded-lg rounded-bl-sm bg-muted/70 px-2 py-1 text-[11px] text-muted-foreground">
            Hi, I'm Trudy. What can I help you figure out?
          </p>
        </div>

        <div className="relative">
          <textarea
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                go(question);
              }
            }}
            placeholder={`Try: ${EXAMPLES[exampleIndex]}`}
            aria-label="Ask Trudy a question"
            data-hero-focus
            className="h-[72px] w-full resize-none rounded-lg border border-input bg-background px-2.5 py-1.5 pr-10 text-[13px] leading-snug outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />

          <Button
            type="submit"
            size="icon"
            className="absolute bottom-1.5 right-1.5 h-6 w-6 bg-accent text-accent-foreground hover:bg-accent/90"
            aria-label="Ask Trudy"
          >
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Button>
        </div>
      </div>


      <ModeTrust icon={Sparkle}>Answers from live 2026 CMS plan data.</ModeTrust>
    </form>
  );
};
