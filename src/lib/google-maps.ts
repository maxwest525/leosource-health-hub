/// <reference types="google.maps" />

let loader: Promise<typeof google.maps> | null = null;

/* Google calls window.gm_authFailure when the key is rejected (e.g. referrer not allowed).
   Nothing throws in that case, so the panel needs an explicit signal to fall back. */
let authFailed = false;
const authListeners = new Set<() => void>();

if (typeof window !== "undefined") {
  (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
    authFailed = true;
    authListeners.forEach(fn => fn());
  };
}

export const isMapsAuthFailed = (): boolean => authFailed;

/** Subscribe to key-rejection failures. Returns an unsubscribe function. */
export const onMapsAuthFailure = (fn: () => void): (() => void) => {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
};

/** Lazily loads the Maps JavaScript API once per session. Resolves null when unavailable. */
export const loadGoogleMaps = (): Promise<typeof google.maps> => {
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Maps can only load in the browser"));
      return;
    }
    const existing = (window as unknown as { google?: { maps?: typeof google.maps } }).google?.maps;
    if (existing) {
      resolve(existing);
      return;
    }

    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
    if (!key) {
      reject(new Error("Google Maps browser key is not configured"));
      return;
    }
    const channel = (import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined) ?? "";

    const callbackName = "__leoMapsReady";
    (window as unknown as Record<string, () => void>)[callbackName] = () => {
      const maps = (window as unknown as { google?: { maps?: typeof google.maps } }).google?.maps;
      if (maps) resolve(maps);
      else reject(new Error("Maps failed to initialize"));
    };

    const script = document.createElement("script");
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
      `&loading=async&callback=${callbackName}` +
      (channel ? `&channel=${encodeURIComponent(channel)}` : "");
    script.async = true;
    script.onerror = () => reject(new Error("Maps script failed to load"));
    document.head.appendChild(script);
  });

  loader.catch(() => {
    loader = null;
  });

  return loader;
};

export type GeoTarget = {
  lat: number;
  lng: number;
  bounds: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  } | null;
  label: string;
};
