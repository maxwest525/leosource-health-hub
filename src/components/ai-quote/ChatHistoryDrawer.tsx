import { History, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ChatHistoryEntry } from "@/lib/leo-chat-history";

const formatWhen = (value: number) => {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

type ChatHistoryDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: ChatHistoryEntry[];
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

/** Browser-local list of past Trudy conversations that can be reopened. */
export const ChatHistoryDrawer = ({
  open,
  onOpenChange,
  entries,
  activeId,
  onSelect,
  onDelete,
  onClear,
}: ChatHistoryDrawerProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
      <SheetHeader className="space-y-1 border-b border-border/60 px-5 py-4 text-left">
        <SheetTitle className="flex items-center gap-2 text-base text-foreground">
          <History className="h-4 w-4 text-primary" />
          Chat history
        </SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">
          Saved on this device only. Reopen a past conversation any time.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {entries.length === 0 ? (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">
            No saved conversations yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`flex items-center gap-1 rounded-lg border px-1 transition-colors ${
                  entry.id === activeId
                    ? "border-primary/40 bg-primary/10"
                    : "border-transparent hover:border-primary/25 hover:bg-primary/5"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(entry.id)}
                  className="min-w-0 flex-1 rounded-md px-2 py-2.5 text-left"
                >
                  <span className="block truncate text-sm text-foreground">{entry.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {formatWhen(entry.updatedAt)} · {entry.messageCount} messages
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${entry.title}`}
                  onClick={() => onDelete(entry.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="border-t border-border/60 px-5 py-3">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 items-center rounded-full border border-transparent px-3 text-xs text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            Clear history
          </button>
        </div>
      ) : null}
    </SheetContent>
  </Sheet>
);
