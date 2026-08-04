# Leo chat: fresh start every visit, with restorable history

Today the Leo quote chat reuses one saved session ID, so reopening the page drops you back into the old conversation. This changes it so every visit starts clean, while past conversations are kept in a history list you can reopen.

## Behavior

- Opening `/ai-quote` always starts a brand new, empty conversation. No auto-restore of the previous transcript.
- When you leave a conversation (start a new one, or open a past one) and it has at least one message, it is archived into history with a title from your first message plus a timestamp.
- A small history icon sits in the chat header. Tapping it opens a drawer listing past conversations (newest first) with title, time, and message count.
- Selecting an entry restores that conversation into the chat, exactly as it was, and closes the drawer. The conversation you were in is archived first, so nothing is lost and you can switch back.
- Each history entry has a delete action, plus a "Clear history" action in the drawer footer.
- History is stored in this browser only (no account needed) and capped at the 20 most recent conversations.
- "Start over" keeps working: it archives the current chat and opens a fresh one.

## Technical notes

- `src/pages/AiQuote.tsx`: replace `getSessionId()` on mount with `createSessionId()` so no prior session is loaded, and drop the server `mode: "load"` restore call on boot.
- Keep the existing per-session transcript autosave, and add a `leo:history` localStorage index of `{ id, title, updatedAt, messageCount }`, written whenever a session is left or replaced.
- Restoring reads the cached transcript for that session ID, sets `sessionId` and `items`, and remains the chat `id` used for subsequent edge-function calls so the server-side thread continues correctly.
- New component `src/components/ai-quote/ChatHistoryDrawer.tsx` using the existing shadcn Sheet/Drawer, styled with the navy semantic tokens; trigger is a bare history glyph button matching the existing `h-9` chat action sizing (no border tile).
- List rows are non-nested interactive elements: a select button with a sibling delete button, not a button inside a button.
