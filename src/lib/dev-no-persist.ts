/**
 * Dev-only guard: keeps app state from persisting between reloads while testing.
 * Clears any existing app keys on boot and no-ops future writes for them.
 * Supabase auth keys (sb-*) are left alone so sign-in still works.
 */
const APP_KEY_PREFIXES = ["lsia.", "leo."];

const isAppKey = (key: string) => APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));

export const installDevNoPersist = (): void => {
  if (!import.meta.env.DEV || typeof window === "undefined") return;

  try {
    const existing = Object.keys(window.localStorage);
    existing.filter(isAppKey).forEach((key) => window.localStorage.removeItem(key));

    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      if (isAppKey(key)) return;
      originalSetItem(key, value);
    };
  } catch {
    // storage unavailable - nothing to clean up
  }
};
