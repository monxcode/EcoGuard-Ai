import { z } from "zod";
import type { AppLocation, DailyPoint, LocationSearchPayload, WeatherReading } from "../../shared/types";
import { encodeCustomLocation, LOCATIONS } from "../../shared/locations";
import { config, openWeatherConfigured } from "../config/env";

export interface OpenWeatherResult<T> {
  data: T | null;
  state: "live" | "unavailable";
  source: string;
  error?: string;
}

export const OPENWEATHER_CURRENT_SOURCE = "OpenWeather Current Weather (Live)";
export const OPENWEATHER_FORECAST_SOURCE = "OpenWeather 5-Day Forecast (Live)";
export const OPENWEATHER_GEOCODING_SOURCE = "OpenWeather Geocoding (Live)";

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_BASE_URL = "https://api.openweathermap.org/geo/1.0";

/** Critical current-weather fields — absent ⇒ whole reading unavailable (never fabricated). */
const currentWeatherSchema = z.object({
  dt: z.number(),
  main: z.object({
    temp: z.number(),
    feels_like: z.number().optional(),
    humidity: z.number(),
    pressure: z.number().optional(),
  }),
  wind: z.object({
    speed: z.number(),
    deg: z.number().optional(),
  }),
  weather: z
    .array(
      z.object({
        main: z.string(),
        description: z.string(),
        icon: z.string(),
      }),
    )
    .min(1),
  clouds: z.object({ all: z.number() }).optional(),
  visibility: z.number().optional(),
  rain: z.object({ "1h": z.number().optional() }).optional(),
  snow: z.object({ "1h": z.number().optional() }).optional(),
});

const forecastSlotSchema = z.object({
  dt: z.number(),
  main: z.object({
    temp: z.number(),
    temp_min: z.number().optional(),
    temp_max: z.number().optional(),
    humidity: z.number(),
  }),
  wind: z.object({
    speed: z.number(),
    deg: z.number().optional(),
  }),
  weather: z
    .array(
      z.object({
        main: z.string(),
        description: z.string(),
        icon: z.string(),
      }),
    )
    .min(1),
  pop: z.number().optional(),
  rain: z.object({ "3h": z.number().optional() }).optional(),
  snow: z.object({ "3h": z.number().optional() }).optional(),
});

const forecastSchema = z.object({
  city: z.object({
    timezone: z.number(),
    name: z.string().optional(),
  }),
  list: z.array(forecastSlotSchema).min(1),
});

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** OpenWeather metric wind is m/s — internal wind speed is always km/h. */
export function metersPerSecondToKmh(ms: number): number {
  return round1(ms * 3.6);
}

/** Safe, user-facing HTTP error text. Never includes request URLs (they carry the key). */
export function openWeatherHttpError(status: number): string {
  if (status === 401) return "OpenWeather API key is invalid or expired.";
  if (status === 429) return "OpenWeather rate limit reached — try again shortly.";
  if (status === 400) return "OpenWeather rejected the request (invalid coordinates).";
  if (status === 404) return "OpenWeather could not find this location.";
  if (status >= 500) return "OpenWeather server error — try again shortly.";
  return "Weather provider request failed.";
}

export function openWeatherFailureMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Weather provider request timed out.";
    if (err.message === "malformed-response") {
      return "Weather provider returned an unexpected response.";
    }
    if (err.message.startsWith("http-")) {
      const status = Number(err.message.slice(5));
      if (Number.isFinite(status)) return openWeatherHttpError(status);
    }
    return "Could not reach the weather provider (network error).";
  }
  return "Weather provider request failed.";
}

function fail<T>(source: string, error: string): OpenWeatherResult<T> {
  return { data: null, state: "unavailable", source, error };
}

/**
 * Normalize a validated OpenWeather current-weather payload into WeatherReading.
 * Optional fields map to null when absent — never invented.
 */
export function normalizeCurrentWeather(raw: unknown): WeatherReading {
  const json = currentWeatherSchema.parse(raw);
  const condition = json.weather[0];
  return {
    temperature: round1(json.main.temp),
    apparentTemperature:
      typeof json.main.feels_like === "number" ? round1(json.main.feels_like) : null,
    humidity: Math.round(json.main.humidity),
    windSpeed: metersPerSecondToKmh(json.wind.speed),
    windDirection: typeof json.wind.deg === "number" ? Math.round(json.wind.deg) : null,
    precipitation: round1((json.rain?.["1h"] ?? 0) + (json.snow?.["1h"] ?? 0)),
    pressure: typeof json.main.pressure === "number" ? json.main.pressure : null,
    cloudiness: typeof json.clouds?.all === "number" ? json.clouds.all : null,
    visibility: typeof json.visibility === "number" ? json.visibility : null,
    weatherCondition: condition.main,
    weatherDescription: condition.description,
    icon: condition.icon,
    timestamp: new Date(json.dt * 1000).toISOString(),
  };
}

/** Calendar date (YYYY-MM-DD) of a Unix time shifted into the location's UTC offset. */
export function localDateKey(unixSec: number, tzOffsetSec: number): string {
  return new Date((unixSec + tzOffsetSec) * 1000).toISOString().slice(0, 10);
}

function daysBetween(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00.000Z`);
  const to = Date.parse(`${toKey}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}

export function dayLabelFor(dateKey: string, todayKey: string): string {
  const diff = daysBetween(todayKey, dateKey);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `+${diff}d`;
}

export interface ForecastDayDraft {
  dateKey: string;
  label: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  precipitationMm: number;
  windSpeed: number;
  precipProbability: number;
}

/**
 * Group the 5-day / 3-hour forecast into calendar days in the location's timezone.
 * Weather fields only — daily `aqi` is merged later from the air-quality provider.
 */
export function normalizeForecastDaily(raw: unknown, nowSec = Math.floor(Date.now() / 1000)): ForecastDayDraft[] {
  const json = forecastSchema.parse(raw);
  const tz = json.city.timezone;
  const todayKey = localDateKey(nowSec, tz);

  const byDay = new Map<
    string,
    {
      tempMax: number;
      tempMin: number;
      humiditySum: number;
      humidityCount: number;
      precipitationMm: number;
      windMaxMs: number;
      pop: number;
    }
  >();

  for (const slot of json.list) {
    const key = localDateKey(slot.dt, tz);
    const entry =
      byDay.get(key) ??
      {
        tempMax: -Infinity,
        tempMin: Infinity,
        humiditySum: 0,
        humidityCount: 0,
        precipitationMm: 0,
        windMaxMs: -Infinity,
        pop: 0,
      };
    entry.tempMax = Math.max(entry.tempMax, slot.main.temp_max ?? slot.main.temp);
    entry.tempMin = Math.min(entry.tempMin, slot.main.temp_min ?? slot.main.temp);
    entry.humiditySum += slot.main.humidity;
    entry.humidityCount += 1;
    entry.precipitationMm += (slot.rain?.["3h"] ?? 0) + (slot.snow?.["3h"] ?? 0);
    entry.windMaxMs = Math.max(entry.windMaxMs, slot.wind.speed);
    entry.pop = Math.max(entry.pop, slot.pop ?? 0);
    byDay.set(key, entry);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, e]) => ({
      dateKey,
      label: dayLabelFor(dateKey, todayKey),
      tempMax: round1(e.tempMax),
      tempMin: round1(e.tempMin),
      humidity: Math.round(e.humiditySum / Math.max(1, e.humidityCount)),
      precipitationMm: round1(e.precipitationMm),
      windSpeed: metersPerSecondToKmh(Math.max(0, e.windMaxMs)),
      precipProbability: Math.round(e.pop * 100) / 100,
    }));
}

/** Finalize a forecast draft as a DailyPoint; `aqi` comes from the air-quality provider. */
export function forecastDraftToDaily(
  draft: ForecastDayDraft,
  aqi: number | null,
): DailyPoint {
  return {
    day: draft.label,
    tempMax: draft.tempMax,
    tempMin: draft.tempMin,
    humidity: draft.humidity,
    precipitationMm: draft.precipitationMm,
    aqi,
    windSpeed: draft.windSpeed,
    precipProbability: draft.precipProbability,
  };
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`http-${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

let lastSuccessAt: string | null = null;

export function getOpenWeatherLastSuccessAt(): string | null {
  return lastSuccessAt;
}

/** Live current conditions from OpenWeather. No demo fallback lives here — callers decide. */
export async function loadOpenWeatherCurrent(
  location: AppLocation,
): Promise<OpenWeatherResult<WeatherReading>> {
  const source = OPENWEATHER_CURRENT_SOURCE;
  if (!openWeatherConfigured) {
    return fail(source, "OpenWeather API key not configured.");
  }
  try {
    const url =
      `${BASE_URL}/weather?lat=${location.lat}&lon=${location.lon}` +
      `&units=metric&appid=${config.openWeatherApiKey}`;
    const raw = await fetchJson(url);
    const reading = normalizeCurrentWeather(raw);
    lastSuccessAt = new Date().toISOString();
    return { data: reading, state: "live", source };
  } catch (err) {
    return fail(source, openWeatherFailureMessage(err));
  }
}

/** Live 5-day / 3-hour forecast grouped to daily weather fields (aqi left null). */
export async function loadOpenWeatherForecast(
  location: AppLocation,
): Promise<OpenWeatherResult<ForecastDayDraft[]>> {
  const source = OPENWEATHER_FORECAST_SOURCE;
  if (!openWeatherConfigured) {
    return fail(source, "OpenWeather API key not configured.");
  }
  try {
    const url =
      `${BASE_URL}/forecast?lat=${location.lat}&lon=${location.lon}` +
      `&units=metric&appid=${config.openWeatherApiKey}`;
    const raw = await fetchJson(url);
    const drafts = normalizeForecastDaily(raw);
    if (drafts.length === 0) throw new Error("malformed-response");
    lastSuccessAt = new Date().toISOString();
    return { data: drafts, state: "live", source };
  } catch (err) {
    return fail(source, openWeatherFailureMessage(err));
  }
}

export interface OpenWeatherVerification {
  configured: boolean;
  verified: boolean;
  checkedAt: string | null;
  error?: string;
}

const VERIFY_TTL_MS = 60_000;
let verifyCache: { expires: number; value: OpenWeatherVerification } | null = null;

/** Drop the cached connection verification (called when Demo Mode is toggled). */
export function clearOpenWeatherVerifyCache(): void {
  verifyCache = null;
}

/**
 * Prove the OpenWeather connection with a real successful API request
 * (a configured key alone is not enough to claim "Connected").
 * Cached for 60 seconds.
 */
export async function verifyOpenWeather(location: AppLocation): Promise<OpenWeatherVerification> {
  if (verifyCache && verifyCache.expires > Date.now()) return verifyCache.value;

  let value: OpenWeatherVerification;
  if (!openWeatherConfigured) {
    value = {
      configured: false,
      verified: false,
      checkedAt: null,
      error: "OpenWeather API key not configured.",
    };
  } else {
    const result = await loadOpenWeatherCurrent(location);
    value = result.data
      ? { configured: true, verified: true, checkedAt: new Date().toISOString() }
      : { configured: true, verified: false, checkedAt: null, error: result.error };
  }
  verifyCache = { expires: Date.now() + VERIFY_TTL_MS, value };
  return value;
}

const geocodeItemSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lon: z.number(),
  country: z.string().optional(),
  state: z.string().optional(),
});

const geocodeSchema = z.array(geocodeItemSchema);

/** Normalize OpenWeather Geocoding results into AppLocation with self-contained ids. */
export function normalizeGeocodeResults(raw: unknown, limit = 6): AppLocation[] {
  const items = geocodeSchema.parse(raw);
  return items.slice(0, limit).map((item) => {
    const region = [item.state, item.country].filter(Boolean).join(", ").slice(0, 100);
    const base = {
      name: item.name.slice(0, 100),
      region,
      lat: item.lat,
      lon: item.lon,
    };
    return { id: encodeCustomLocation(base), ...base };
  });
}

function seedCityMatches(query: string): AppLocation[] {
  const q = query.toLowerCase();
  return LOCATIONS.filter(
    (l) => l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q),
  );
}

/**
 * City search → coordinates for every downstream OpenWeather request.
 * Uses OpenWeather Geocoding when a key is configured; otherwise (or on failure)
 * degrades gracefully to the built-in seed list with a disclosed error.
 * Never includes request URLs (they carry the key) in returned errors.
 */
export async function searchOpenWeatherLocations(
  query: string,
  limit = 6,
): Promise<LocationSearchPayload> {
  const trimmed = query.trim();
  if (!openWeatherConfigured) {
    return {
      results: seedCityMatches(trimmed).slice(0, limit),
      state: "demo",
      source: "Built-in City List",
      error: "OpenWeather API key not configured — showing built-in cities only.",
    };
  }
  try {
    const url =
      `${GEO_BASE_URL}/direct?q=${encodeURIComponent(trimmed)}` +
      `&limit=${limit}&appid=${config.openWeatherApiKey}`;
    const raw = await fetchJson(url);
    const results = normalizeGeocodeResults(raw, limit);
    return { results, state: "live", source: OPENWEATHER_GEOCODING_SOURCE };
  } catch (err) {
    return {
      results: seedCityMatches(trimmed).slice(0, limit),
      state: "demo",
      source: "Built-in City List",
      error: openWeatherFailureMessage(err),
    };
  }
}
