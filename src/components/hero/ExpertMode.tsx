import { useState } from "react";
import { z } from "zod";
import { Phone, Video, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ModeChips,
  ModeDescription,
  ModeError,
  ModeRow,
  ModeTrust,
  type ModeChipOption,
} from "@/components/hero/ModeParts";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Enter your full name" })
    .max(100, { message: "Name must be under 100 characters" }),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => digits.length === 10 || (digits.length === 11 && digits.startsWith("1")), {
      message: "Enter a 10 digit US phone number",
    }),
  zip: z.string().trim().regex(/^\d{5}$/, { message: "Enter a 5 digit ZIP code" }),
  bestTime: z.string().min(1, { message: "Choose a time that works" }),
});

const TIME_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "morning", label: "Morning (8am - 11am)" },
  { value: "midday", label: "Midday (11am - 2pm)" },
  { value: "afternoon", label: "Afternoon (2pm - 5pm)" },
  { value: "evening", label: "Evening (5pm - 8pm)" },
];

type Method = "phone" | "video";

const METHODS: ReadonlyArray<ModeChipOption<Method>> = [
  { value: "phone", label: "Phone call", icon: Phone },
  { value: "video", label: "Video", icon: Video },
];

const TRUST: Record<Method, string> = {
  phone: "Licensed specialists only. No call center, no pressure.",
  video: "Screen-share your options with a licensed specialist.",
};

/** Inline callback / video booking, writing to the same lead pipeline as the dialog. */
export const ExpertMode = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", zip: "", bestTime: "" });
  const [method, setMethod] = useState<Method>("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details and try again.");
      return;
    }

    setLoading(true);
    const { name, phone, zip, bestTime } = parsed.data;
    const [firstName, ...rest] = name.split(/\s+/);
    const timeLabel = TIME_OPTIONS.find((option) => option.value === bestTime)?.label ?? bestTime;

    try {
      const { error: insertError } = await supabase.from("tool_leads").insert({
        session_id: crypto.randomUUID(),
        first_name: firstName,
        last_name: rest.join(" ") || null,
        phone,
        zip_code: zip,
        coverage_category: "agent_callback",
        status: "ready_for_agent",
        intent_level: "ready_for_agent",
        intent_score: 90,
        callback_priority: bestTime === "asap",
        routing_team: "licensed_specialists",
        final_cta_taken: `hero_${method}_${bestTime}`,
        priorities: [`best_time:${bestTime}`, `contact_method:${method}`],
      });
      if (insertError) throw insertError;

      toast({
        title: method === "video" ? "Video session requested" : "Callback booked",
        description: `A licensed specialist will reach out ${timeLabel.toLowerCase()}.`,
      });
      setForm({ name: "", phone: "", zip: "", bestTime: "" });
    } catch {
      toast({
        title: "We couldn't book that just yet",
        description: "Please try again, or call 800.758.1590 to speak with a specialist now.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ModeDescription>
        Book a licensed specialist at a time that works for you, no obligation.
      </ModeDescription>

      <ModeChips<Method>
        label="How you want to meet"
        options={METHODS}
        value={method}
        onChange={setMethod}
      />

      <ModeRow>
        <Input
          value={form.name}
          onChange={(event) => setField("name", event.target.value)}
          placeholder="Full name"
          aria-label="Full name"
          data-hero-focus
          autoComplete="name"
          className="h-9 min-w-0 flex-1 text-sm"
        />
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={form.phone}
          onChange={(event) => setField("phone", event.target.value)}
          placeholder="Phone"
          aria-label="Phone number"
          className="h-9 min-w-0 flex-1 text-sm"
        />
      </ModeRow>

      <ModeRow className="mt-2">
        <div className="relative w-24 shrink-0">
          <MapPin
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
            value={form.zip}
            onChange={(event) => setField("zip", event.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="ZIP"
            aria-label="ZIP code"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Select value={form.bestTime} onValueChange={(value) => setField("bestTime", value)}>
          <SelectTrigger aria-label="Best time" className="h-9 min-w-0 flex-1 text-sm">
            <SelectValue placeholder="Best time" />
          </SelectTrigger>
          <SelectContent>
            {TIME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={loading}
          className="h-9 shrink-0 bg-accent px-3 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Book"}
        </Button>
      </ModeRow>

      <ModeError>{error}</ModeError>

      <ModeTrust>{TRUST[method]}</ModeTrust>
    </form>
  );
};
