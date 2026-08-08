import type { QuotePlan } from "@/components/quote/PlanCard";

/** One entry in the transcript: a chat turn, or a set of quotes rendered inline. */
export type ConversationItem =
  | { kind: "user" | "assistant"; content: string; at?: number }
  | { kind: "plans"; plans: QuotePlan[] };

export type ChatHistoryEntry = {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
};

export const SESSION_KEY = "truenroll-ai-quote-session";
const HISTORY_KEY = "truenroll-ai-quote-history";
const MAX_ENTRIES = 20;

export const createSessionId = () =>
  `q${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`.slice(0, 32);

/** Local autosave of the wizard transcript so answers survive a refresh. */
export const transcriptKey = (id: string) => `${SESSION_KEY}:transcript:${id}`;

export const loadCachedItems = (id: string): ConversationItem[] => {
  try {
    const raw = window.localStorage.getItem(transcriptKey(id));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConversationItem[]) : [];
  } catch {
    return [];
  }
};

export const saveCachedItems = (id: string, items: ConversationItem[]) => {
  try {
    window.localStorage.setItem(transcriptKey(id), JSON.stringify(items));
  } catch {
    /* storage full or unavailable: autosave is best-effort */
  }
};

export const loadHistory = (): ChatHistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ChatHistoryEntry[])
      .filter((entry) => typeof entry?.id === "string")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
};

const writeHistory = (entries: ChatHistoryEntry[]) => {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* best-effort */
  }
};

const titleFor = (items: ConversationItem[]) => {
  const firstUser = items.find((item) => item.kind === "user");
  const text = firstUser && firstUser.kind === "user" ? firstUser.content.trim() : "";
  if (!text) return "New conversation";
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
};

/**
 * Files the given conversation into the browser-local history index so it can
 * be reopened later. No-ops for empty conversations.
 */
export const archiveSession = (id: string, items: ConversationItem[]): ChatHistoryEntry[] => {
  const messages = items.filter((item) => item.kind !== "plans");
  const existing = loadHistory().filter((entry) => entry.id !== id);
  if (messages.length === 0) return existing;

  saveCachedItems(id, items);
  const next = [
    { id, title: titleFor(items), updatedAt: Date.now(), messageCount: messages.length },
    ...existing,
  ];

  next.slice(MAX_ENTRIES).forEach((entry) => {
    try {
      window.localStorage.removeItem(transcriptKey(entry.id));
    } catch {
      /* best-effort */
    }
  });

  const trimmed = next.slice(0, MAX_ENTRIES);
  writeHistory(trimmed);
  return trimmed;
};

export const removeHistoryEntry = (id: string): ChatHistoryEntry[] => {
  const next = loadHistory().filter((entry) => entry.id !== id);
  try {
    window.localStorage.removeItem(transcriptKey(id));
  } catch {
    /* best-effort */
  }
  writeHistory(next);
  return next;
};

export const clearHistory = (): ChatHistoryEntry[] => {
  loadHistory().forEach((entry) => {
    try {
      window.localStorage.removeItem(transcriptKey(entry.id));
    } catch {
      /* best-effort */
    }
  });
  writeHistory([]);
  return [];
};
