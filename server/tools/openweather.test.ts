import { describe, expect, it } from "vitest";
import {
  forecastDraftToDaily,
  localDateKey,
  metersPerSecondToKmh,
  normalizeCurrentWeather,
  normalizeForecastDaily,
  normalizeGeocodeResults,
  openWeatherHttpError,
  dayLabelFor,
} from "./openweather";
import { decodeCustomLocation, findLocation } from "../../shared/locations";

const currentFixture = {
  dt: 1_758_600_000,
  main: {
    temp: 31.4,
    feels_like: 34.2,
    humidity: 62,
    pressure: 1007,
  },
  wind: { speed: 5.5, deg: 210 },
  weather: [{ main: "Clouds", description: "scattered clouds", icon: "03d" }],
  clouds: { all: 40 },
  visibility: 9000,
  rain: { "1h": 0.4 },
};

const forecastFixture = {
  city: { timezone: 19800, name: "Udaipur" },
  list: [
    {
      dt: 1_758_600_000,
      main: { temp: 32, temp_min: 30, temp_max: 33, humidity: 60 },
      wind: { speed: 4, deg: 200 },
      weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
      pop: 0.2,
      rain: { "3h": 1.2 },
    },
    {
      dt: 1_758_610_800,
      main: { temp: 29, temp_min: 28, temp_max: 34, humidity: 65 },
      wind: { speed: 6, deg: 210 },
      weather: [{ main: "Rain", description: "light rain", icon: "10d" }],
      pop: 0.8,
      rain: { "3h": 2.4 },
    },
    // Next calendar day (local, UTC+5:30)
    {
      dt: 1_758_680_000,
      main: { temp: 30, temp_min: 27, temp_max: 35, humidity: 55 },
      wind: { speed: 3, deg: 190 },
      weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
      pop: 0.1,
    },
  ],
};

describe("OpenWeather normalizers", () => {
  it("normalizes current weather with m/s → km/h conversion and optional nulls", () => {
    const reading = normalizeCurrentWeather(currentFixture);
    expect(reading.temperature).toBe(31.4);
    expect(reading.apparentTemperature).toBe(34.2);
    expect(reading.windSpeed).toBe(metersPerSecondToKmh(5.5));
    expect(reading.windSpeed).toBeCloseTo(19.8, 5);
    expect(reading.windDirection).toBe(210);
    expect(reading.precipitation).toBe(0.4);
    expect(reading.pressure).toBe(1007);
    expect(reading.cloudiness).toBe(40);
    expect(reading.visibility).toBe(9000);
    expect(reading.weatherCondition).toBe("Clouds");
    expect(reading.weatherDescription).toBe("scattered clouds");
    expect(reading.icon).toBe("03d");
    expect(reading.timestamp).toBe(new Date(currentFixture.dt * 1000).toISOString());
    // Payload has no city/coord/timezone block — mapped to null, never invented.
    expect(reading.timezoneOffset).toBeNull();
    expect(reading.providerCityName).toBeNull();
    expect(reading.providerCountry).toBeNull();
    expect(reading.providerLat).toBeNull();
    expect(reading.providerLon).toBeNull();
  });

  it("maps provider city, grid coordinates and timezone from the full payload", () => {
    const reading = normalizeCurrentWeather({
      ...currentFixture,
      name: "London",
      timezone: 3600,
      coord: { lat: 51.5074, lon: -0.1278 },
      sys: { country: "GB" },
    });
    expect(reading.providerCityName).toBe("London");
    expect(reading.providerCountry).toBe("GB");
    expect(reading.providerLat).toBe(51.5074);
    expect(reading.providerLon).toBe(-0.1278);
    expect(reading.timezoneOffset).toBe(3600);
  });

  it("preserves provider precision — no pre-rounding of temp/feels (API is source of truth)", () => {
    const reading = normalizeCurrentWeather({
      dt: 1_758_600_000,
      main: { temp: 17.11, feels_like: 17.04, humidity: 73 },
      wind: { speed: 1.64, deg: 200 },
      weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
      name: "Udaipur",
      timezone: 19800,
      coord: { lat: 24.5859, lon: 73.7127 },
      sys: { country: "IN" },
    });
    expect(reading.temperature).toBe(17.11);
    expect(reading.apparentTemperature).toBe(17.04);
    expect(reading.humidity).toBe(73);
    expect(reading.windDirection).toBe(200);
    // m/s → km/h is the only conversion (1.64 * 3.6 = 5.904 → 5.9)
    expect(reading.windSpeed).toBeCloseTo(5.9, 5);
    expect(reading.timezoneOffset).toBe(19800);
  });

  it("maps missing optional current-weather fields to null (never fabricates)", () => {
    const reading = normalizeCurrentWeather({
      dt: 1_758_600_000,
      main: { temp: 20, humidity: 50 },
      wind: { speed: 2 },
      weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
    });
    expect(reading.apparentTemperature).toBeNull();
    expect(reading.windDirection).toBeNull();
    expect(reading.pressure).toBeNull();
    expect(reading.cloudiness).toBeNull();
    expect(reading.visibility).toBeNull();
    expect(reading.precipitation).toBe(0);
  });

  it("throws on malformed current weather (missing critical fields)", () => {
    expect(() => normalizeCurrentWeather({ main: {} })).toThrow();
    expect(() =>
      normalizeCurrentWeather({
        dt: 1,
        main: { temp: 1, humidity: 1 },
        wind: { speed: 1 },
        weather: [],
      }),
    ).toThrow();
  });

  it("groups the 3-hourly forecast into local calendar days with labels", () => {
    const drafts = normalizeForecastDaily(forecastFixture, 1_758_600_000);
    expect(drafts.length).toBeGreaterThanOrEqual(2);
    expect(drafts[0].label).toBe("Today");
    expect(drafts[1].label).toBe("Tomorrow");
    expect(drafts[0].precipitationMm).toBeCloseTo(3.6, 5);
    expect(drafts[0].tempMax).toBe(34);
    expect(drafts[0].tempMin).toBe(28);
    expect(drafts[0].precipProbability).toBe(0.8);
    expect(drafts[0].windSpeed).toBe(metersPerSecondToKmh(6));
  });

  it("converts forecast drafts to DailyPoint with aqi left for the caller", () => {
    const drafts = normalizeForecastDaily(forecastFixture, 1_758_600_000);
    const point = forecastDraftToDaily(drafts[0], 142);
    expect(point.day).toBe("Today");
    expect(point.aqi).toBe(142);
    const withoutAqi = forecastDraftToDaily(drafts[0], null);
    expect(withoutAqi.aqi).toBeNull();
  });
});

describe("OpenWeather error mapping (no URLs/keys in messages)", () => {
  it("maps HTTP statuses to safe user-facing messages", () => {
    expect(openWeatherHttpError(401)).toBe("OpenWeather API key is invalid or expired.");
    expect(openWeatherHttpError(429)).toMatch(/rate limit/i);
    expect(openWeatherHttpError(400)).toMatch(/invalid coordinates/i);
    expect(openWeatherHttpError(404)).toMatch(/could not find/i);
    expect(openWeatherHttpError(500)).toMatch(/server error/i);
    for (const status of [400, 401, 404, 429, 500, 503]) {
      expect(openWeatherHttpError(status)).not.toMatch(/api\.openweathermap|appid|http/i);
    }
  });
});

describe("day labels and date keys", () => {
  it("shifts unix times into the location timezone for date keys", () => {
    // 2025-09-23 12:00 UTC — in UTC+5:30 this is still the 23rd; in UTC-12 it is the 22nd.
    const noonUtc = Math.floor(Date.UTC(2025, 8, 23, 12) / 1000);
    expect(localDateKey(noonUtc, 19800)).toBe("2025-09-23");
    expect(localDateKey(noonUtc, -43200)).toBe("2025-09-23");
    const earlyUtc = Math.floor(Date.UTC(2025, 8, 23, 2) / 1000);
    expect(localDateKey(earlyUtc, 19800)).toBe("2025-09-23");
    expect(localDateKey(earlyUtc, -36000)).toBe("2025-09-22");
  });

  it("labels days Today/Tomorrow/+Nd relative to today", () => {
    expect(dayLabelFor("2025-09-23", "2025-09-23")).toBe("Today");
    expect(dayLabelFor("2025-09-24", "2025-09-23")).toBe("Tomorrow");
    expect(dayLabelFor("2025-09-26", "2025-09-23")).toBe("+3d");
  });
});

describe("OpenWeather geocoding normalizer", () => {
  it("maps geocode hits to AppLocation with decodable self-contained ids", () => {
    const results = normalizeGeocodeResults([
      { name: "Paris", lat: 48.8566, lon: 2.3522, country: "FR", state: "Île-de-France" },
      { name: "Tokyo", lat: 35.6895, lon: 139.6917, country: "JP" },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      name: "Paris",
      region: "Île-de-France, FR",
      lat: 48.8566,
      lon: 2.3522,
    });
    expect(decodeCustomLocation(results[0].id)?.lat).toBe(48.8566);
    expect(results[1].region).toBe("JP");
    // Selected custom id must resolve through the shared location architecture.
    expect(findLocation(results[1].id).name).toBe("Tokyo");
  });

  it("respects the result limit and throws on malformed payloads", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `City ${i}`,
      lat: 10 + i,
      lon: 20 + i,
      country: "XX",
    }));
    expect(normalizeGeocodeResults(many, 6)).toHaveLength(6);
    expect(() => normalizeGeocodeResults([{ lat: 1 }])).toThrow();
    expect(() => normalizeGeocodeResults("nope")).toThrow();
  });
});
