import type {
  AirReading,
  AppLocation,
  DailyPoint,
  DataState,
  EnvironmentalData,
  HourlyPoint,
  WeatherReading,
} from "../../shared/types";
import { config } from "../config/env";
import { isDemoMode } from "./demoState";
import {
  buildDemoAir,
  buildDemoDaily,
  buildDemoHourly,
  buildDemoRainfallPast14,
  buildDemoWeather,
} from "./demoFixtures";
import {
  forecastDraftToDaily,
  loadOpenWeatherCurrent,
  loadOpenWeatherForecast,
  OPENWEATHER_FORECAST_SOURCE,
} from "./openweather";

export interface ToolResponse<T> {
  data: T | null;
  state: DataState;
  source: string;
  error?: string;
}

export interface EnvironmentalDataProvider {
  readonly id: string;
  getAirQuality(location: AppLocation): Promise<ToolResponse<AirReading>>;
  getHourly(location: AppLocation): Promise<ToolResponse<HourlyPoint[]>>;
}

const DEMO_AIR_SOURCE = "Demo Data — Air Quality Fixture Set";
const DEMO_WEATHER_SOURCE = "Demo Data — Weather Fixture Set";
const DEMO_TREND_SOURCE = "Demo Data — 24h Air Quality Fixture";
const DEMO_FORECAST_SOURCE = "Demo Data — 7-Day Forecast Fixture";

export class DemoEnvironmentalDataProvider implements EnvironmentalDataProvider {
  readonly id = "demo";

  async getAirQuality(location: AppLocation): Promise<ToolResponse<AirReading>> {
    return { data: buildDemoAir(location.id), state: "demo", source: DEMO_AIR_SOURCE };
  }

  async getHourly(location: AppLocation): Promise<ToolResponse<HourlyPoint[]>> {
    return { data: buildDemoHourly(location.id), state: "demo", source: DEMO_TREND_SOURCE };
  }
}

/**
 * Live air-quality provider using Open-Meteo's keyless Air Quality API:
 * - https://open-meteo.com/en/docs/air-quality-api
 * Weather (current + forecast) is provided by OpenWeather — see openweather.ts.
 * Failures surface as unavailable; demo fixtures only when Demo Mode is on.
 */
export class LiveOpenMeteoProvider implements EnvironmentalDataProvider {
  readonly id = "open-meteo";

  async getAirQuality(location: AppLocation): Promise<ToolResponse<AirReading>> {
    try {
      const url =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
        `&timezone=auto`;
      const json = (await fetchJson(url)) as {
        current?: Record<string, number | null>;
      };
      const cur = json.current ?? {};
      const pm25 = num(cur.pm2_5);
      const aqi = num(cur.us_aqi) ?? (pm25 !== null ? aqiFromPm25(pm25) : null);
      if (aqi === null) throw new Error("missing us_aqi/pm2_5 in response");
      return {
        data: {
          aqi: Math.round(aqi),
          pm25: round1(pm25 ?? 0),
          pm10: round1(num(cur.pm10) ?? 0),
          no2: round1(num(cur.nitrogen_dioxide) ?? 0),
          o3: round1(num(cur.ozone) ?? 0),
          co: Math.round(((num(cur.carbon_monoxide) ?? 0) / 1000) * 100) / 100,
          so2: round1(num(cur.sulphur_dioxide) ?? 0),
        },
        state: "live",
        source: "Open-Meteo Air Quality (Live)",
      };
    } catch (err) {
      return failed("Open-Meteo Air Quality (Live)", err);
    }
  }

  /** Hourly AQI/PM trend from Open-Meteo air quality only (no weather merge in live mode). */
  async getHourly(location: AppLocation): Promise<ToolResponse<HourlyPoint[]>> {
    try {
      const airUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&hourly=us_aqi,pm2_5,pm10&past_days=1&forecast_days=1&timezone=auto`;
      const airJson = (await fetchJson(airUrl)) as HourlyAirJson;
      const points = normalizeHourlyAir(airJson);
      const window = points.slice(-24);
      if (window.length === 0) throw new Error("no hourly data");
      return { data: window, state: "live", source: "Open-Meteo Air Quality hourly (Live)" };
    } catch (err) {
      return failed("Open-Meteo Air Quality hourly (Live)", err);
    }
  }
}

/** Daily average US AQI by local calendar date (YYYY-MM-DD) from Open-Meteo air quality. */
async function fetchDailyAqiMap(location: AppLocation): Promise<Map<string, number>> {
  const airUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${location.lat}&longitude=${location.lon}` +
    `&hourly=us_aqi,pm2_5&forecast_days=7&timezone=auto`;
  const airJson = (await fetchJson(airUrl)) as HourlyAirJson;
  return dayAverageAqi(airJson);
}

function failed(source: string, err: unknown): ToolResponse<never> {
  const message = err instanceof Error ? err.message : String(err);
  return { data: null, state: "unavailable", source, error: message };
}

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

const PM25_BP: Array<[number, number]> = [
  [0, 0],
  [50, 12],
  [100, 35.5],
  [150, 55.5],
  [200, 125.5],
  [300, 250.5],
  [500, 500.5],
];

function aqiFromPm25(conc: number): number {
  for (let i = 1; i < PM25_BP.length; i += 1) {
    const [aqiHigh, concHigh] = PM25_BP[i];
    const [aqiLow, concLow] = PM25_BP[i - 1];
    if (conc <= concHigh) {
      return Math.round(aqiLow + ((conc - concLow) / (concHigh - concLow)) * (aqiHigh - aqiLow));
    }
  }
  return 500;
}

interface HourlyAirJson {
  hourly?: {
    time?: string[];
    us_aqi?: (number | null)[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
  };
}

function normalizeHourlyAir(json: HourlyAirJson): HourlyPoint[] {
  const h = json.hourly;
  if (!h?.time?.length) return [];
  const pm25Fallback = json.hourly?.pm2_5 ?? [];
  return h.time.map((time, i) => {
    const pm25 = pm25Fallback[i] ?? 0;
    const aqiRaw = h.us_aqi?.[i];
    const aqi = typeof aqiRaw === "number" ? aqiRaw : aqiFromPm25(pm25);
    return {
      hour: time.slice(11, 16),
      aqi: Math.round(aqi),
      pm25: round1(pm25),
      pm10: round1(h.pm10?.[i] ?? pm25 * 1.6),
      temperature: null,
      humidity: null,
    };
  });
}

function dayAverageAqi(json: HourlyAirJson): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  const h = json.hourly;
  if (!h?.time) return new Map();
  h.time.forEach((time, i) => {
    const day = time.slice(0, 10);
    const raw = h.us_aqi?.[i];
    const pm25 = h.pm2_5?.[i];
    const aqi =
      typeof raw === "number" ? raw : typeof pm25 === "number" ? aqiFromPm25(pm25) : null;
    if (aqi === null) return;
    const entry = sums.get(day) ?? { total: 0, count: 0 };
    entry.total += aqi;
    entry.count += 1;
    sums.set(day, entry);
  });
  const result = new Map<string, number>();
  for (const [day, entry] of sums) {
    result.set(day, Math.round(entry.total / Math.max(1, entry.count)));
  }
  return result;
}

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expires: number; value: unknown }>();

function preferLive(): boolean {
  return !isDemoMode() && config.preferredProvider === "live";
}

/** Mode-scoped cache key — live and demo payloads never share an entry. */
function scopedKey(key: string): string {
  return `${preferLive() ? "L" : "D"}:${key}`;
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const fullKey = scopedKey(key);
  const hit = cache.get(fullKey);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(fullKey, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}

/** Drop all cached provider payloads (called when Demo Mode is toggled). */
export function clearProviderCache(): void {
  cache.clear();
}

/**
 * Resolve a domain. When live is preferred, only `live` runs — a failure
 * surfaces as "unavailable" (never a silent demo fallback; Demo Mode must be
 * turned on explicitly to get fixtures). When live is not preferred, `demo`
 * is used directly (no external call).
 */
async function resolve<T>(
  key: string,
  live: () => Promise<ToolResponse<T>>,
  demo?: () => Promise<ToolResponse<T>>,
): Promise<ToolResponse<T>> {
  const livePreferred = preferLive();
  return cached(key, async () => {
    if (!livePreferred) {
      if (!demo) {
        return {
          data: null,
          state: "unavailable",
          source: "demo fixtures",
          error: "demo loader missing",
        };
      }
      return demo();
    }
    return await live();
  });
}

/**
 * Live daily forecast: OpenWeather 5-day/3-hour forecast for weather fields,
 * merged with Open-Meteo daily AQI (aqi stays null if the air call fails).
 * No demo fallback — forecast failure means the forecast is unavailable.
 */
async function loadLiveDaily(location: AppLocation): Promise<ToolResponse<DailyPoint[]>> {
  return cached(`daily:${location.id}`, async () => {
    const forecast = await loadOpenWeatherForecast(location);
    if (forecast.data === null) {
      return {
        data: null,
        state: "unavailable" as DataState,
        source: OPENWEATHER_FORECAST_SOURCE,
        error: forecast.error,
      };
    }
    let aqiByDay = new Map<string, number>();
    let aqiError: string | undefined;
    try {
      aqiByDay = await fetchDailyAqiMap(location);
    } catch (err) {
      aqiError =
        err instanceof Error && err.message.startsWith("HTTP")
          ? "air-quality provider error"
          : "air-quality provider unavailable";
    }
    const points: DailyPoint[] = forecast.data.map((draft) =>
      forecastDraftToDaily(draft, aqiByDay.get(draft.dateKey) ?? null),
    );
    return {
      data: points,
      state: "live" as DataState,
      source: OPENWEATHER_FORECAST_SOURCE,
      error: aqiError
        ? `Daily AQI overlay unavailable (${aqiError}); forecast shown without AQI.`
        : undefined,
    };
  });
}

/** Loads environmental data for a location with caching, source labeling, and honest states. */
export async function loadEnvironmentalData(location: AppLocation): Promise<EnvironmentalData> {
  const demo = new DemoEnvironmentalDataProvider();
  const live = new LiveOpenMeteoProvider();
  const suffix = location.id;

  const weatherPromise: Promise<ToolResponse<WeatherReading>> = preferLive()
    ? resolve(`wx:${suffix}`, () => loadOpenWeatherCurrent(location))
    : cached(`wx:${suffix}`, async () => ({
        data: buildDemoWeather(location.id),
        state: "demo" as DataState,
        source: DEMO_WEATHER_SOURCE,
      }));

  const dailyPromise: Promise<ToolResponse<DailyPoint[]>> = preferLive()
    ? loadLiveDaily(location)
    : cached(`daily:${suffix}`, async () => ({
        data: buildDemoDaily(location.id),
        state: "demo" as DataState,
        source: DEMO_FORECAST_SOURCE,
      }));

  const [air, weather, hourly, daily] = await Promise.all([
    resolve(`air:${suffix}`, () => live.getAirQuality(location), () => demo.getAirQuality(location)),
    weatherPromise,
    resolve(`hourly:${suffix}`, () => live.getHourly(location), () => demo.getHourly(location)),
    dailyPromise,
  ]);

  const errors: string[] = [];
  for (const part of [air, weather, hourly, daily]) {
    if (part.error) errors.push(`${part.source}: ${part.error}`);
    if (part.data === null) errors.push(`${part.source}: data unavailable.`);
  }

  // Same preference rule as resolve(): demo fixtures unless live is preferred.
  const preferLiveRainfall = preferLive();

  return {
    location,
    air: air.data,
    weather: weather.data,
    hourly: hourly.data ?? [],
    daily: daily.data ?? [],
    rainfallHistory: preferLiveRainfall
      ? {
          days14: [],
          state: "unavailable",
          source: "14-day rainfall history (not configured)",
        }
      : {
          days14: buildDemoRainfallPast14(location.id),
          state: "demo",
          source: "Demo Data — 14-Day Rainfall Fixture",
        },
    states: {
      air: air.data ? air.state : "unavailable",
      weather: weather.data ? weather.state : "unavailable",
      airTrend: hourly.data ? hourly.state : "unavailable",
      forecast: daily.data ? daily.state : "unavailable",
    },
    sources: {
      air: air.source,
      weather: weather.source,
      airTrend: hourly.source,
      forecast: daily.source,
    },
    errors,
    fetchedAt: new Date().toISOString(),
  };
}
