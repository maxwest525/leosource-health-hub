export type ZipPlace = {
  zip: string;
  city: string;
  state: string;
};

const RECENTS_KEY = "truenroll.recent-zips";
const MAX_RECENTS = 6;

/** Digits only, formatted as 12345 or 12345-6789. */
export const formatZip = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

/** The 5-digit base of a possibly ZIP+4 value. */
export const baseZip = (raw: string): string => raw.replace(/\D/g, "").slice(0, 5);

export const isCompleteZip = (raw: string): boolean => /^\d{5}$/.test(baseZip(raw));

const cache = new Map<string, ZipPlace | null>();

/** Resolve a 5-digit ZIP to its primary city and state. Returns null when unknown. */
export const lookupZipPlace = async (raw: string, signal?: AbortSignal): Promise<ZipPlace | null> => {
  const zip = baseZip(raw);
  if (!isCompleteZip(zip)) return null;
  if (cache.has(zip)) return cache.get(zip) ?? null;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`, { signal });
    if (!res.ok) {
      cache.set(zip, null);
      return null;
    }
    const data = (await res.json()) as {
      places?: Array<{ "place name"?: string; "state abbreviation"?: string }>;
    };
    const place = data.places?.[0];
    const resolved: ZipPlace | null = place?.["place name"]
      ? { zip, city: place["place name"] as string, state: place["state abbreviation"] ?? "" }
      : null;
    cache.set(zip, resolved);
    return resolved;
  } catch {
    return null;
  }
};

export const readRecentZips = (): ZipPlace[] => {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ZipPlace =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ZipPlace).zip === "string" &&
        typeof (item as ZipPlace).city === "string",
      )
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
};

export const saveRecentZip = (place: ZipPlace): ZipPlace[] => {
  const next = [place, ...readRecentZips().filter(p => p.zip !== place.zip)].slice(0, MAX_RECENTS);
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable, recents are best effort */
  }
  return next;
};
