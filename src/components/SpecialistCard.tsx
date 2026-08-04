import { useState } from "react";
import { CalendarClock, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import BookAgentDialog from "@/components/BookAgentDialog";

type SpecialistCardProps = {
  className?: string;
  compact?: boolean;
};

/**
 * Glass "speak with a licensed specialist" call card. Lives in the header on
 * dark chrome, so all colors resolve against the primary navy background.
 * The phone number dials directly; the adjacent action books a callback.
 */
const SpecialistCard = ({ className, compact = false }: SpecialistCardProps) => {
  const [bookingOpen, setBookingOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "group/adv flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.07] backdrop-blur-md transition-all duration-300 hover:border-accent/50 hover:bg-white/[0.12]",
          compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
          className,
        )}
      >
        <a href="tel:+18007581590" className="flex items-center gap-2">
          <span className="relative flex items-center shrink-0">
            <Phone className="w-4 h-4 text-accent" strokeWidth={1.75} />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[8.5px] uppercase tracking-[0.16em] text-white/55">
              Licensed specialist
            </span>
            <span
              className={cn(
                "block font-semibold text-white leading-tight",
                compact ? "text-[13px]" : "text-base",
              )}
            >
              800.758.1590
            </span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" aria-hidden="true" />
        </a>

        <span className="h-6 w-px bg-white/15 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => setBookingOpen(true)}
          aria-label="Book a callback with a licensed agent"
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-accent/40 text-accent transition-colors duration-300 hover:bg-accent/10 shrink-0",
            compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
          )}
        >
          <CalendarClock className="w-3.5 h-3.5" strokeWidth={1.75} />
          Book a call
        </button>
      </div>

      <BookAgentDialog open={bookingOpen} onOpenChange={setBookingOpen} />
    </>
  );
};

export default SpecialistCard;
