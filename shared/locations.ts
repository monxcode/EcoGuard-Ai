import type { AppLocation } from "./types";

/** Known locations selectable across the app. Demo fixtures are keyed by id. */
export const LOCATIONS: AppLocation[] = [
  { id: "udaipur", name: "Udaipur", region: "Rajasthan, India", lat: 24.5854, lon: 73.7125 },
  { id: "jaipur", name: "Jaipur", region: "Rajasthan, India", lat: 26.9124, lon: 75.7873 },
  { id: "delhi", name: "Delhi", region: "NCT, India", lat: 28.6139, lon: 77.209 },
  { id: "mumbai", name: "Mumbai", region: "Maharashtra, India", lat: 19.076, lon: 72.8777 },
];

export const DEFAULT_LOCATION_ID = "udaipur";

export function findLocation(id: string | undefined | null): AppLocation {
  return LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0];
}
