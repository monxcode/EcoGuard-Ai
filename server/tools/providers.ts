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

export interface ToolResponse<T> {
  data: T | null;
  state: DataState;
  source: string;
  error?: string;
}

export interface EnvironmentalDataProvider {
  readonly id: string;
  getAirQuality(location: AppLocation): Promise<ToolResponse<AirReading>>;
  getWeather(location: AppLocation): Promise<ToolResponse<WeatherReading>>;
  getHourly(location: AppLocation): Promise<ToolResponse<HourlyPoint[]>>;
  getDaily(location: AppLocation): Promise<ToolResponse<DailyPoint[]>>;
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

  async getWeather(location: AppLocation): Promise<ToolResponse<WeatherReading>> {
    return { data: buildDemoWeather(location.id), state: "demo", source: DEMO_WEATHER_SOURCE };
  }

  async getHourly(location: AppLocation): Promise<ToolResponse<HourlyPoint[]>> {
    return { data: buildDemoHourly(location.id), state: "demo", source: DEMO_TREND_SOURCE };
  }

  async getDaily(location: AppLocation): Promise<ToolResponse<DailyPoint[]>> {
    return { data: buildDemoDaily(location.id), state: "demo", source: DEMO_FORECAST_SOURCE };
  }
}

/**
 * Live provider using Open-Meteo (documented, keyless public APIs):
 * - https://open-meteo.com/en/docs/forecast-api
 * - https://open-meteo.com/en/docs/air-quality-api
 * Any failure is surfaced as `error` and the caller falls back to demo fixtures.
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

  async getWeather(location: AppLocation): Promise<ToolResponse<WeatherReading>> {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m` +
        `&timezone=auto`;
      const json = (await fetchJson(url)) as { current?: Record<string, number | null> };
      const cur = json.current ?? {};
      const temperature = num(cur.temperature_2m);
      if (temperature === null) throw new Error("missing temperature_2m");
      const humidity = num(cur.relative_humidity_2m) ?? 50;
      return {
        data: {
          temperature: round1(temperature),
          apparentTemperature: round1(num(cur.apparent_temperature) ?? temperature),
          humidity: Math.round(humidity),
          windSpeed: round1(num(cur.wind_speed_10m) ?? 0),
          windDirection: Math.round(num(cur.wind_direction_10m) ?? 0),
          precipitation: round1(num(cur.precipitation) ?? 0),
        },
        state: "live",
        source: "Open-Meteo Forecast (Live)",
      };
    } catch (err) {
      return failed("Open-Meteo Forecast (Live)", err);
    }
  }

  async getHourly(location: AppLocation): Promise<ToolResponse<HourlyPoint[]>> {
    try {
      const airUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&hourly=us_aqi,pm2_5,pm10&past_days=1&forecast_days=1&timezone=auto`;
      const wxUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&hourly=temperature_2m,relative_humidity_2m&past_days=1&forecast_days=1&timezone=auto`;
      const [airJson, wxJson] = (await Promise.all([fetchJson(airUrl), fetchJson(wxUrl)])) as [
        HourlyAirJson,
        HourlyWxJson,
      ];
      const air = normalizeHourlyAir(airJson);
      const wx = normalizeHourlyWx(wxJson);
      const merged: HourlyPoint[] = air.map((point) => {
        const match = wx.get(point.hour);
        return {
          ...point,
          temperature: match?.temperature ?? point.temperature,
          humidity: match?.humidity ?? point.humidity,
        };
      });
      const window = merged.slice(-24);
      if (window.length === 0) throw new Error("no hourly data");
      return { data: window, state: "live", source: "Open-Meteo Air Quality hourly (Live)" };
    } catch (err) {
      return failed("Open-Meteo Air Quality hourly (Live)", err);
    }
  }

  async getDaily(location: AppLocation): Promise<ToolResponse<DailyPoint[]>> {
    try {
      const wxUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
        `&hourly=wind_speed_10m,relative_humidity_2m&forecast_days=7&timezone=auto`;
      const airUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${location.lat}&longitude=${location.lon}` +
        `&hourly=us_aqi,pm2_5&forecast_days=7&timezone=auto`;
      const [wxJson, airJson] = (await Promise.all([fetchJson(wxUrl), fetchJson(airUrl)])) as [
        DailyWxJson,
        HourlyAirJson,
      ];
      const daily = wxJson.daily;
      if (!daily?.time?.length) throw new Error("no daily data");
      const aqiByDay = dayAverageAqi(airJson);
      const humByDay = dayAverageField(wxJson.hourly, "relative_humidity_2m");
      const windByDay = dayMaxField(wxJson.hourly, "wind_speed_10m");
      const points: DailyPoint[] = daily.time.map((day, i) => ({
        day: dayLabel(i),
        tempMax: round1(daily.temperature_2m_max?.[i] ?? 0),
        tempMin: round1(daily.temperature_2m_min?.[i] ?? 0),
        humidity: Math.round(humByDay.get(day) ?? 50),
        precipitationMm: round1(daily.precipitation_sum?.[i] ?? 0),
        aqi: aqiByDay.get(day) ?? 0,
        windSpeed: round1(windByDay.get(day) ?? 0),
      }));
      if (points.length === 0) throw new Error("empty daily data");
      return { data: points.slice(0, 7), state: "live", source: "Open-Meteo Forecast (Live)" };
    } catch (err) {
      return failed("Open-Meteo Forecast (Live)", err);
    }
  }
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

function dayLabel(index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return `+${index}d`;
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
  hourly?: { time?: string[]; us_aqi?: (number | null)[]; pm2_5?: (number | null)[]; pm10?: (number | null)[] };
}

interface HourlyWxJson {
  hourly?: { time?: string[]; temperature_2m?: (number | null)[]; relative_humidity_2m?: (number | null)[] };
}

interface DailyWxJson {
  daily?: {
    time?: string[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
  };
  hourly?: { time?: string[]; relative_humidity_2m?: (number | null)[]; wind_speed_10m?: (number | null)[] };
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
      temperature: 0,
      humidity: 50,
    };
  });
}

function normalizeHourlyWx(json: HourlyWxJson): Map<string, { temperature: number; humidity: number }> {
  const map = new Map<string, { temperature: number; humidity: number }>();
  const h = json.hourly;
  if (!h?.time?.length) return map;
  h.time.forEach((time, i) => {
    map.set(time.slice(11, 16), {
      temperature: round1(h.temperature_2m?.[i] ?? 0),
      humidity: Math.round(h.relative_humidity_2m?.[i] ?? 50),
    });
  });
  return map;
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

function dayAverageField(
  hourly: { time?: string[]; [key: string]: (number | null)[] | string[] | undefined } | undefined,
  field: string,
): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  const times = hourly?.time;
  const values = hourly?.[field] as (number | null)[] | undefined;
  if (!times || !values) return new Map();
  times.forEach((time, i) => {
    const value = values[i];
    if (typeof value !== "number") return;
    const day = time.slice(0, 10);
    const entry = sums.get(day) ?? { total: 0, count: 0 };
    entry.total += value;
    entry.count += 1;
    sums.set(day, entry);
  });
  const result = new Map<string, number>();
  for (const [day, entry] of sums) result.set(day, entry.total / Math.max(1, entry.count));
  return result;
}

function dayMaxField(
  hourly: { time?: string[]; [key: string]: (number | null)[] | string[] | undefined } | undefined,
  field: string,
): Map<string, number> {
  const maxes = new Map<string, number>();
  const times = hourly?.time;
  const values = hourly?.[field] as (number | null)[] | undefined;
  if (!times || !values) return new Map();
  times.forEach((time, i) => {
    const value = values[i];
    if (typeof value !== "number") return;
    const day = time.slice(0, 10);
    maxes.set(day, Math.max(maxes.get(day) ?? -Infinity, value));
  });
  return maxes;
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

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const value = await loader();
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}

async function resolve<T>(
  key: string,
  live: () => Promise<ToolResponse<T>>,
  demo: () => Promise<ToolResponse<T>>,
): Promise<ToolResponse<T>> {
  return cached(key, async () => {
    const demoMode = isDemoMode();
    const preferLive = !demoMode && config.preferredProvider === "live";
    if (!preferLive) return demo();
    const result = await live();
    if (result.data !== null) return result;
    const fallback = await demo();
    return {
      ...fallback,
      error: result.error
        ? `Live provider unavailable (${result.error}); showing demo data instead.`
        : undefined,
    };
  });
}

/** Loads environmental data for a location with caching, demo fallback, and source labeling. */
export async function loadEnvironmentalData(location: AppLocation): Promise<EnvironmentalData> {
  const demo = new DemoEnvironmentalDataProvider();
  const live = new LiveOpenMeteoProvider();
  const suffix = location.id;

  const [air, weather, hourly, daily] = await Promise.all([
    resolve(`air:${suffix}`, () => live.getAirQuality(location), () => demo.getAirQuality(location)),
    resolve(`wx:${suffix}`, () => live.getWeather(location), () => demo.getWeather(location)),
    resolve(`hourly:${suffix}`, () => live.getHourly(location), () => demo.getHourly(location)),
    resolve(`daily:${suffix}`, () => live.getDaily(location), () => demo.getDaily(location)),
  ]);

  const errors: string[] = [];
  for (const part of [air, weather, hourly, daily]) {
    if (part.error) errors.push(`${part.source}: ${part.error}`);
    if (part.data === null) errors.push(`${part.source}: data unavailable.`);
  }

  // Same preference rule as resolve(): demo fixtures unless live is preferred.
  const preferLiveRainfall = !isDemoMode() && config.preferredProvider === "live";

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
