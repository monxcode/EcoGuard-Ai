import type { AppLocation } from "./types";

/** Known seed locations (defaults + demo fixture keys). Searchable cities are not limited to this list. */
export const LOCATIONS: AppLocation[] = [
  { id: "udaipur", name: "Udaipur", region: "Rajasthan, India", lat: 24.5854, lon: 73.7125 },
  { id: "jaipur", name: "Jaipur", region: "Rajasthan, India", lat: 26.9124, lon: 75.7873 },
  { id: "delhi", name: "Delhi", region: "NCT, India", lat: 28.6139, lon: 77.209 },
  { id: "mumbai", name: "Mumbai", region: "Maharashtra, India", lat: 19.076, lon: 72.8777 },
];

export const DEFAULT_LOCATION_ID = "udaipur";

const CUSTOM_PREFIX = "c.";

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(encoded: string): string | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Encode any searched city into a self-contained location id (`c.<base64url JSON>`).
 * Keeps name/region/lat/lon with the id so no server-side session or parallel registry is needed.
 */
export function encodeCustomLocation(loc: {
  name: string;
  region: string;
  lat: number;
  lon: number;
}): string {
  const json = JSON.stringify([loc.name, loc.region, loc.lat, loc.lon]);
  return CUSTOM_PREFIX + base64UrlEncode(json);
}

/** Decode a custom id produced by encodeCustomLocation. Returns null if invalid. */
export function decodeCustomLocation(id: string): AppLocation | null {
  if (!id.startsWith(CUSTOM_PREFIX)) return null;
  const json = base64UrlDecode(id.slice(CUSTOM_PREFIX.length));
  if (json === null) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length !== 4) return null;
    const [name, region, lat, lon] = parsed as [unknown, unknown, unknown, unknown];
    if (typeof name !== "string" || name.trim() === "") return null;
    if (typeof region !== "string") return null;
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return { id, name, region, lat, lon };
  } catch {
    return null;
  }
}

/** True for a known seed id, a valid custom id, or empty/undefined (means default). */
export function isValidLocationId(id: string | undefined | null): boolean {
  if (!id) return true;
  return LOCATIONS.some((l) => l.id === id) || decodeCustomLocation(id) !== null;
}

/** Resolve any valid locationId (seed or searched city). Unknown ids fall back to the default. */
export function findLocation(id: string | undefined | null): AppLocation {
  if (id) {
    const known = LOCATIONS.find((l) => l.id === id);
    if (known) return known;
    const custom = decodeCustomLocation(id);
    if (custom) return custom;
  }
  return LOCATIONS[0];
}
