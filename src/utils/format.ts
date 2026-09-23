import type { Units } from "../context/AppContext";

export function toFahrenheit(celsius: number): number {
  return celsius * 1.8 + 32;
}

export function formatTemp(celsius: number | null | undefined, units: Units): string {
  if (celsius === null || celsius === undefined || !Number.isFinite(celsius)) return "—";
  return units === "imperial" ? `${Math.round(toFahrenheit(celsius))}°F` : `${Math.round(celsius)}°C`;
}

export function formatTempFull(celsius: number | null | undefined, units: Units): string {
  if (celsius === null || celsius === undefined || !Number.isFinite(celsius)) return "—";
  return units === "imperial"
    ? `${toFahrenheit(celsius).toFixed(1)} °F`
    : `${celsius.toFixed(1)} °C`;
}

export function formatWind(kmh: number | null | undefined, units: Units): string {
  if (kmh === null || kmh === undefined || !Number.isFinite(kmh)) return "—";
  return units === "imperial" ? `${(kmh * 0.621).toFixed(1)} mph` : `${kmh.toFixed(1)} km/h`;
}

export function formatDistance(km: number, units: Units): string {
  return units === "imperial" ? `${(km * 0.621).toFixed(1)} mi` : `${km.toFixed(1)} km`;
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human label for a UTC offset in seconds, e.g. 19800 → "UTC+5:30". */
export function formatUtcOffset(offsetSec: number | null | undefined): string {
  if (offsetSec === null || offsetSec === undefined || !Number.isFinite(offsetSec)) return "UTC";
  if (offsetSec === 0) return "UTC";
  const sign = offsetSec > 0 ? "+" : "-";
  const abs = Math.abs(offsetSec);
  const hours = Math.floor(abs / 3600);
  const minutes = Math.floor((abs % 3600) / 60);
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Full timestamp rendered in the location's timezone (offset from the provider).
 * Falls back to UTC when no offset is known. Independent of the browser timezone,
 * so "Last updated" matches OpenWeather's city-local time.
 */
export function formatTimestampInOffset(
  iso: string | null | undefined,
  offsetSec: number | null | undefined,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const shifted = new Date(date.getTime() + (offsetSec ?? 0) * 1000);
  return shifted.toLocaleString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short clock time in the location's timezone (offset from the provider). */
export function formatTimeInOffset(
  iso: string | null | undefined,
  offsetSec: number | null | undefined,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const shifted = new Date(date.getTime() + (offsetSec ?? 0) * 1000);
  return shifted.toLocaleTimeString(undefined, {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
