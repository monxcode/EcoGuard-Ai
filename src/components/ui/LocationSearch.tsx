import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LOCATIONS } from "../../../shared/locations";
import type { AppLocation } from "../../../shared/types";
import { api } from "../../services/api";

interface LocationSearchProps {
  /** "header" keeps the compact top-bar look; "block" fills a card/label row. */
  variant?: "header" | "block";
  label?: string;
  id?: string;
}

/**
 * Searchable city input: type any city → autocomplete → selection stores a
 * self-contained locationId. Coordinates flow through existing APIs to OpenWeather.
 */
export function LocationSearch({
  variant = "block",
  label = "Location",
  id = "location-search",
}: LocationSearchProps) {
  const { location, setLocation } = useApp();
  const [query, setQuery] = useState(location.name);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<AppLocation[]>(LOCATIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipSearchRef = useRef(false);

  useEffect(() => {
    if (!open) setQuery(location.name);
  }, [location.id, location.name, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(LOCATIONS);
      setLoading(false);
      setError(null);
      setActive(-1);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .searchLocations(trimmed)
        .then((payload) => {
          if (cancelled) return;
          setResults(payload.results);
          setError(payload.error ?? null);
          setActive(-1);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setError("City search is unavailable right now.");
          setActive(-1);
          setLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const selectLocation = (loc: AppLocation) => {
    skipSearchRef.current = true;
    setLocation(loc.id);
    setQuery(loc.name);
    setOpen(false);
    setError(null);
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      setQuery(location.name);
      setActive(-1);
      return;
    }
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "Enter") {
        event.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (results.length === 0 ? -1 : i + 1 >= results.length ? 0 : i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (results.length === 0 ? -1 : i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && results[active]) selectLocation(results[active]);
    }
  };

  const listboxId = `${id}-listbox`;
  const inputClass =
    variant === "header"
      ? "h-8 w-40 sm:w-64 bg-transparent border-none px-2 text-sm text-[#111111] placeholder:text-[#888888] focus:outline-none focus:ring-0"
      : "mt-1.5 w-full h-10 px-3 text-sm border border-[#EAEAEA] rounded-md bg-white placeholder:text-[#888888] text-[#111111] focus:outline-none focus:border-[#111111] transition-colors";

  return (
    <div
      ref={rootRef}
      className={`relative ${variant === "header" ? "hidden sm:block" : "block"}`}
    >
      {variant === "header" ? (
        <span className="sr-only">{label}</span>
      ) : (
        <label htmlFor={id} className="text-xs font-semibold text-[#111111] uppercase tracking-[0.05em]">
          {label}
        </label>
      )}
      <div className={variant === "header" ? "flex items-center gap-1.5 bg-black/5 hover:bg-black/10 rounded-md px-2 py-0.5 transition-colors" : ""}>
        {variant === "header" ? (
          <Search className="w-3.5 h-3.5 text-[#666666] shrink-0" aria-hidden />
        ) : null}
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && open ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          value={query}
          placeholder="Search any city…"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={inputClass}
        />
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="City suggestions"
          className="absolute left-0 right-0 z-40 mt-1 min-w-[240px] max-h-64 overflow-auto bg-white border border-[#EAEAEA] rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-1"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-[#888888]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Searching cities…
            </p>
          ) : null}
          {!loading && results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#888888]">No matching cities found.</p>
          ) : null}
          {!loading && results.length > 0
            ? results.map((loc, index) => (
                <button
                  key={loc.id}
                  id={`${id}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onClick={() => selectLocation(loc)}
                  onMouseEnter={() => setActive(index)}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                    index === active
                      ? "bg-black/5 text-[#111111]"
                      : "text-[#444444] hover:bg-black/5 hover:text-[#111111]"
                  } ${loc.id === location.id ? "font-semibold" : ""}`}
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-40" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate leading-tight">{loc.name}</span>
                    <span className="block truncate text-[11px] text-[#888888] mt-0.5">
                      {loc.region ? `${loc.region} · ` : ""}
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    </span>
                  </span>
                </button>
              ))
            : null}
          {error && !loading ? (
            <p className="px-3 py-2 text-xs text-[#E5484D] bg-[#FAFAFA] rounded-md mt-1">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
