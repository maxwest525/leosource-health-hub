import { useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { CalendarClock, Lock } from "lucide-react";

interface BookAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const bookingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Enter your full name" })
    .max(100, { message: "Name must be under 100 characters" })
    .regex(/^[A-Za-z][A-Za-z\s'.-]*$/, { message: "Use letters, spaces, hyphens or apostrophes" }),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((digits) => digits.length === 10 || (digits.length === 11 && digits.startsWith("1")), {
      message: "Enter a 10-digit US phone number",
    })
    .refine((digits) => {
      const local = digits.length === 11 ? digits.slice(1) : digits;
      return !/^[01]/.test(local) && !/^[01]/.test(local.slice(3)) && !/^(\d)\1{9}$/.test(local);
    }, { message: "That phone number doesn't look valid" }),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, { message: "Enter a 5-digit ZIP code" }),
  bestTime: z.string().min(1, { message: "Choose a best time to call" }),
});

type FieldName = "name" | "phone" | "zip" | "bestTime";
type FieldErrors = Partial<Record<FieldName, string>>;

const bestTimeOptions = [
  { value: "asap", label: "As soon as possible" },
  { value: "morning", label: "Morning (8am - 11am)" },
  { value: "midday", label: "Midday (11am - 2pm)" },
  { value: "afternoon", label: "Afternoon (2pm - 5pm)" },
  { value: "evening", label: "Evening (5pm - 8pm)" },
];

export const BookAgentDialog = ({ open, onOpenChange }: BookAgentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [form, setForm] = useState({ name: "", phone: "", zip: "", bestTime: "" });

  const setField = (field: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = bookingSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as FieldName;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { name, phone, zip, bestTime } = parsed.data;
    const [firstName, ...rest] = name.split(/\s+/);
    const timeLabel = bestTimeOptions.find((option) => option.value === bestTime)?.label ?? bestTime;

    try {
      const { error } = await supabase.from("tool_leads").insert({
        session_id: crypto.randomUUID(),
        first_name: firstName,
        last_name: rest.join(" ") || null,
        phone,
        zip_code: zip.slice(0, 5),
        coverage_category: "agent_callback",
        status: "ready_for_agent",
        intent_level: "ready_for_agent",
        intent_score: 90,
        callback_priority: bestTime === "asap",
        routing_team: "licensed_specialists",
        final_cta_taken: `callback_${bestTime}`,
        priorities: [`best_time:${bestTime}`],
      });
      if (error) throw error;

      toast({
        title: "Callback booked",
        description: `A licensed specialist will call you ${timeLabel.toLowerCase()}.`,
      });
      setForm({ name: "", phone: "", zip: "", bestTime: "" });
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl text-foreground">
            <CalendarClock className="w-5 h-5 text-accent" strokeWidth={1.75} />
            Speak with a licensed agent
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Tell us when works best and a licensed specialist will call you. No obligation, no pressure.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2" noValidate>
          <div>
            <label htmlFor="book-name" className="block text-xs font-medium text-foreground mb-1.5">
              Full name
            </label>
            <Input
              id="book-name"
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              autoComplete="name"
              aria-invalid={!!errors.name}
              className={`h-11 ${errors.name ? "border-destructive" : ""}`}
            />
            {errors.name && (
              <p role="alert" className="mt-1 text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="book-phone" className="block text-xs font-medium text-foreground mb-1.5">
                Phone
              </label>
              <Input
                id="book-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                aria-invalid={!!errors.phone}
                className={`h-11 ${errors.phone ? "border-destructive" : ""}`}
              />
              {errors.phone && (
                <p role="alert" className="mt-1 text-xs text-destructive">{errors.phone}</p>
              )}
            </div>
            <div>
              <label htmlFor="book-zip" className="block text-xs font-medium text-foreground mb-1.5">
                ZIP code
              </label>
              <Input
                id="book-zip"
                inputMode="numeric"
                maxLength={10}
                autoComplete="postal-code"
                value={form.zip}
                onChange={(event) => setField("zip", event.target.value)}
                aria-invalid={!!errors.zip}
                className={`h-11 ${errors.zip ? "border-destructive" : ""}`}
              />
              {errors.zip && (
                <p role="alert" className="mt-1 text-xs text-destructive">{errors.zip}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="book-time" className="block text-xs font-medium text-foreground mb-1.5">
              Best time to call
            </label>
            <Select value={form.bestTime} onValueChange={(value) => setField("bestTime", value)}>
              <SelectTrigger
                id="book-time"
                aria-invalid={!!errors.bestTime}
                className={`h-11 ${errors.bestTime ? "border-destructive" : ""}`}
              >
                <SelectValue placeholder="Select a time window" />
              </SelectTrigger>
              <SelectContent>
                {bestTimeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.bestTime && (
              <p role="alert" className="mt-1 text-xs text-destructive">{errors.bestTime}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            variant="outline"
            disabled={loading}
            className="w-full border-primary text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
          >
            {loading ? "Booking your call..." : "Book my callback"}
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            Your information is private and never sold.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookAgentDialog;
