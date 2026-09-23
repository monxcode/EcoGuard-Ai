import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LOCATIONS } from "../../../shared/locations";
import type { AppLocation, DataState } from "../../../shared/types";
import { api } from "../../services/api";

interface LocationSearchProps {
  /** "header" is the compact top-bar search; "block" is a labeled form field. */
  variant?: "header" | "block";
  label?: string;
  id?: string;
}

/**
 * Global location search: any city → autocomplete → selection stores a
 * self-contained locationId. Coordinates flow through existing APIs internally.
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
  const [source, setSource] = useState<{ state: DataState; source: string } | null>(null);
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
      setSource(null);
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
          setSource({ state: payload.state, source: payload.source });
          setActive(-1);
          setLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setError("City search is unavailable right now.");
          setSource(null);
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

  return (
    <div ref={rootRef} className={`relative ${variant === "header" ? "w-full" : "block"}`}>
      {variant === "header" ? (
        <span className="sr-only">{label}</span>
      ) : (
        <label
          htmlFor={id}
          className="block text-[13px] font-medium text-ink-2 mb-1.5"
        >
          {label}
        </label>
      )}

      <div
        className={
          variant === "header"
            ? "flex items-center gap-2 h-9 px-3 bg-surface border border-line rounded-lg transition-colors focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/12"
            : ""
        }
      >
        {variant === "header" ? (
          <Search className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden />
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
          placeholder={variant === "header" ? "Search any city…" : "Search any city…"}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={
            variant === "header"
              ? "flex-1 min-w-0 bg-transparent border-none text-sm text-ink placeholder:text-ink-3 focus:outline-none"
              : "w-full h-9 px-3 text-sm text-ink bg-surface border border-line rounded-lg placeholder:text-ink-3 transition-colors focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/12"
          }
        />
        {variant === "header" && query === location.name ? (
          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden aria-label="Current location" />
        ) : null}
      </div>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="City suggestions"
          className="absolute left-0 right-0 z-40 mt-1.5 min-w-[260px] max-h-72 overflow-auto bg-surface border border-line rounded-xl shadow-[0_12px_40px_-12px_rgba(26,29,26,0.18)] p-1 fade-in"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-ink-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Searching cities…
            </p>
          ) : null}
          {!loading && results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-ink-3">No matching cities found.</p>
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
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    index === active ? "bg-canvas-2 text-ink" : "text-ink-2 hover:bg-canvas-2"
                  } ${loc.id === location.id ? "font-semibold text-ink" : ""}`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      loc.id === location.id ? "text-accent" : "text-ink-3"
                    }`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block truncate leading-tight">{loc.name}</span>
                    <span className="block truncate text-[11px] text-ink-3 mt-0.5 font-normal">
                      {loc.region ? `${loc.region} · ` : ""}
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    </span>
                  </span>
                </button>
              ))
            : null}
          {error && !loading ? (
            <p className="px-3 py-2 text-xs text-danger-2 bg-danger-soft rounded-lg m-1">
              {error}
            </p>
          ) : null}
          {!loading && source && results.length > 0 ? (
            <p className="px-3 py-1.5 text-[10px] text-ink-3 border-t border-line-2 mt-1">
              {source.source} · {source.state === "live" ? "live geocoding" : "built-in list"}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
