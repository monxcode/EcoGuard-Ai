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
      ? "h-9 w-40 sm:w-64 bg-white border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 placeholder:text-slate-400 hover:border-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
      : "mt-1.5 w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

  return (
    <div
      ref={rootRef}
      className={`relative ${variant === "header" ? "hidden sm:block" : "block"}`}
    >
      {variant === "header" ? (
        <span className="sr-only">{label}</span>
      ) : (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className={variant === "header" ? "flex items-center gap-1.5" : ""}>
        {variant === "header" ? (
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
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
          className="absolute left-0 right-0 z-40 mt-1 min-w-56 max-h-64 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
        >
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              Searching cities…
            </p>
          ) : null}
          {!loading && results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No matching cities found.</p>
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
                  className={`w-full flex items-start gap-2 px-3 py-2 text-left text-sm ${
                    index === active
                      ? "bg-emerald-50 text-emerald-900"
                      : "text-slate-700 hover:bg-slate-50"
                  } ${loc.id === location.id ? "font-semibold" : ""}`}
                >
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate">{loc.name}</span>
                    {loc.region ? (
                      <span className="block truncate text-xs text-slate-500">{loc.region}</span>
                    ) : null}
                  </span>
                </button>
              ))
            : null}
          {error && !loading ? (
            <p className="border-t border-slate-100 px-3 py-2 text-xs text-amber-700 bg-amber-50">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
