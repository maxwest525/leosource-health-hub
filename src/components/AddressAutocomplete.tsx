import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loadGoogleMaps } from "@/lib/google-maps";

export type ResolvedAddress = {
  /** Full one-line address as typed or picked. */
  formatted: string;
  zip: string;
  city: string;
  state: string;
};

type Suggestion = { id: string; primary: string; secondary: string };

type Props = {
  value: string;
  onChange: (next: string) => void;
  onResolved: (place: ResolvedAddress) => void;
  /** Shown to the right of the field, e.g. a status icon. */
  status?: "idle" | "loading" | "done";
  invalid?: boolean;
  placeholder?: string;
};

const componentValue = (
  components: google.maps.places.AddressComponent[] | undefined | null,
  type: string,
  short = false,
): string => {
  const hit = components?.find(c => c.types.includes(type));
  if (!hit) return "";
  return (short ? hit.shortText : hit.longText) ?? hit.longText ?? "";
};

/**
 * Single-line address field backed by Places Autocomplete (New).
 * Falls back to plain typing + browser geolocation when Maps is unavailable.
 */
export const AddressAutocomplete = ({
  value,
  onChange,
  onResolved,
  status = "idle",
  invalid,
  placeholder = "Start typing your street address",
}: Props) => {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  // Debounced Places (New) autocomplete.
  useEffect(() => {
    const query = value.trim();
    if (query.length < 4) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        await loadGoogleMaps();
        const { AutocompleteSuggestion, AutocompleteSessionToken } =
          (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        if (!sessionRef.current) sessionRef.current = new AutocompleteSessionToken();
        const { suggestions: found } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          sessionToken: sessionRef.current,
          includedRegionCodes: ["us"],
        });
        if (cancelled) return;
        setSuggestions(
          found
            .map(s => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => !!p)
            .slice(0, 5)
            .map(p => ({
              id: p.placeId,
              primary: p.mainText?.text ?? p.text.text,
              secondary: p.secondaryText?.text ?? "",
            })),
        );
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value]);

  const commit = useCallback(
    async (s: Suggestion) => {
      setOpen(false);
      setActive(-1);
      setBusy(true);
      setNote(null);
      onChange([s.primary, s.secondary].filter(Boolean).join(", "));
      try {
        const { Place } = (await google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        const place = new Place({ id: s.id });
        await place.fetchFields({ fields: ["addressComponents", "formattedAddress"] });
        sessionRef.current = null;
        const zip = componentValue(place.addressComponents, "postal_code").slice(0, 5);
        const city =
          componentValue(place.addressComponents, "locality") ||
          componentValue(place.addressComponents, "sublocality") ||
          componentValue(place.addressComponents, "postal_town");
        const state = componentValue(place.addressComponents, "administrative_area_level_1", true);
        if (!/^\d{5}$/.test(zip)) {
          setNote("That address is missing a ZIP code. Pick a more specific result.");
          return;
        }
        onChange(place.formattedAddress ?? [s.primary, s.secondary].filter(Boolean).join(", "));
        onResolved({ formatted: place.formattedAddress ?? "", zip, city, state });
      } catch {
        setNote("We couldn't verify that address. Try again or type your ZIP code.");
      } finally {
        setBusy(false);
      }
    },
    [onChange, onResolved],
  );

  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setNote("Location isn't available in this browser. Type your address instead.");
      return;
    }
    setGeoBusy(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        // Preferred path: Google reverse geocoding gives the full street address.
        try {
          await loadGoogleMaps();
          const { Geocoder } = (await google.maps.importLibrary(
            "geocoding",
          )) as google.maps.GeocodingLibrary;
          const { results } = await new Geocoder().geocode({
            location: { lat: latitude, lng: longitude },
          });
          const best =
            results.find(r => r.types.includes("street_address")) ??
            results.find(r => r.types.includes("premise")) ??
            results[0];
          const part = (type: string, short = false) => {
            const hit = best?.address_components.find(c => c.types.includes(type));
            return (short ? hit?.short_name : hit?.long_name) ?? "";
          };
          const zip = part("postal_code").replace(/\D/g, "").slice(0, 5);
          const city = part("locality") || part("sublocality") || part("postal_town");
          const state = part("administrative_area_level_1", true);
          if (best && /^\d{5}$/.test(zip)) {
            const formatted = best.formatted_address.replace(/,\s*USA$/i, "");
            onChange(formatted);
            onResolved({ formatted, zip, city, state });
            setGeoBusy(false);
            return;
          }
        } catch {
          /* fall through to the network fallback below */
        }

        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const data = (await res.json()) as {
            postcode?: string;
            city?: string;
            locality?: string;
            principalSubdivisionCode?: string;
          };
          const zip = (data.postcode ?? "").replace(/\D/g, "").slice(0, 5);
          const city = data.city || data.locality || "";
          const state = (data.principalSubdivisionCode ?? "").replace("US-", "");
          if (/^\d{5}$/.test(zip)) {
            const formatted = [city, state, zip].filter(Boolean).join(", ");
            onChange(formatted);
            onResolved({ formatted, zip, city, state });
          } else {
            setNote("We couldn't match your location. Type your address instead.");
          }
        } catch {
          setNote("We couldn't match your location. Type your address instead.");
        } finally {
          setGeoBusy(false);
        }
      },
      () => {
        setGeoBusy(false);
        setNote("Location access was blocked. Type your address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [onChange, onResolved]);


  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(i => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void commit(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const showSpinner = busy || status === "loading";

  return (
    <div ref={wrapRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        aria-label="Home address"
        aria-invalid={invalid}
        autoComplete="street-address"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        onChange={e => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
          setNote(null);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-11 pr-[6.5rem]"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {showSpinner && (
          <span className="text-muted-foreground/40">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
        <button
          type="button"
          onClick={useMyLocation}
          disabled={geoBusy}
          aria-label="Use my current location"
          className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {geoBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
          Locate
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-border/60 bg-background shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => void commit(s)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors",
                  i === active ? "bg-primary/10 text-foreground" : "text-foreground/80",
                )}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate font-semibold">{s.primary}</span>
                <span className="min-w-0 truncate text-muted-foreground/70">{s.secondary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p role="alert" className="mt-1.5 text-[11.5px] text-muted-foreground/80">
          {note}
        </p>
      )}
    </div>
  );
};
