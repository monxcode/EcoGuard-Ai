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
  return units === "imperial" ? `${Math.round(kmh * 0.621)} mph` : `${Math.round(kmh)} km/h`;
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

/** Short clock time (e.g. "14:30") from an ISO timestamp — for provider observation times. */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
