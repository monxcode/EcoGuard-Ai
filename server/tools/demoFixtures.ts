import type {
  AirReading,
  DailyPoint,
  DemoWasteSample,
  HourlyPoint,
  RouteOption,
  WeatherReading,
} from "../../shared/types";
import { findLocation } from "../../shared/locations";
import { heatIndexCelsius } from "../../shared/aqi";
import { hashString, noise } from "./noise";

interface LocationProfile {
  aqiNow: number;
  trend: "rising" | "falling" | "stable";
  pmRatio: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
  temp: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  cloudiness: number;
  visibility: number;
  weatherCondition: string;
  weatherDescription: string;
  weatherIcon: string;
  tmax: number[];
  tmin: number[];
  rain: number[];
  pop: number[];
  aqiDays: number[];
  humidityDays: number[];
  windDays: number[];
  rainfallPast14: number[];
}

const DAY_LABELS = ["Today", "Tomorrow", "+2d", "+3d", "+4d", "+5d", "+6d"];

const PROFILES: Record<string, LocationProfile> = {
  udaipur: {
    aqiNow: 142,
    trend: "rising",
    pmRatio: 1.75,
    no2: 38,
    o3: 74,
    co: 0.9,
    so2: 14,
    temp: 36.4,
    humidity: 38,
    windSpeed: 14,
    windDirection: 245,
    precipitation: 0,
    pressure: 1008,
    cloudiness: 15,
    visibility: 8000,
    weatherCondition: "Clear",
    weatherDescription: "clear sky",
    weatherIcon: "01d",
    tmax: [36, 37, 38, 37, 34, 33, 34],
    tmin: [24, 25, 25, 26, 24, 23, 23],
    rain: [0, 0, 0, 2, 18, 6, 1],
    pop: [0.05, 0.05, 0.1, 0.4, 0.7, 0.5, 0.25],
    aqiDays: [128, 135, 142, 148, 130, 118, 122],
    humidityDays: [38, 36, 35, 44, 62, 58, 50],
    windDays: [14, 15, 13, 18, 22, 16, 14],
    rainfallPast14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  jaipur: {
    aqiNow: 168,
    trend: "rising",
    pmRatio: 1.9,
    no2: 46,
    o3: 82,
    co: 1.2,
    so2: 18,
    temp: 39.1,
    humidity: 30,
    windSpeed: 11,
    windDirection: 260,
    precipitation: 0,
    pressure: 1006,
    cloudiness: 10,
    visibility: 6000,
    weatherCondition: "Clear",
    weatherDescription: "clear sky",
    weatherIcon: "01d",
    tmax: [39, 40, 40, 38, 36, 35, 36],
    tmin: [26, 27, 27, 26, 25, 24, 25],
    rain: [0, 0, 0, 4, 12, 3, 0],
    pop: [0.05, 0.05, 0.1, 0.45, 0.65, 0.4, 0.1],
    aqiDays: [152, 160, 168, 174, 150, 138, 144],
    humidityDays: [30, 28, 28, 36, 52, 48, 42],
    windDays: [11, 12, 10, 16, 20, 14, 12],
    rainfallPast14: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  delhi: {
    aqiNow: 186,
    trend: "rising",
    pmRatio: 2.1,
    no2: 62,
    o3: 68,
    co: 1.6,
    so2: 22,
    temp: 33.2,
    humidity: 55,
    windSpeed: 9,
    windDirection: 290,
    precipitation: 0,
    pressure: 1004,
    cloudiness: 45,
    visibility: 4000,
    weatherCondition: "Haze",
    weatherDescription: "haze",
    weatherIcon: "50d",
    tmax: [33, 34, 34, 32, 31, 32, 33],
    tmin: [25, 26, 26, 25, 24, 25, 25],
    rain: [0, 0, 6, 14, 2, 0, 0],
    pop: [0.05, 0.1, 0.5, 0.7, 0.3, 0.1, 0.05],
    aqiDays: [170, 178, 186, 175, 158, 164, 172],
    humidityDays: [55, 56, 58, 66, 70, 62, 58],
    windDays: [9, 8, 10, 14, 12, 9, 8],
    rainfallPast14: [0, 0, 3, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0],
  },
  mumbai: {
    aqiNow: 72,
    trend: "falling",
    pmRatio: 1.6,
    no2: 28,
    o3: 44,
    co: 0.6,
    so2: 10,
    temp: 30.8,
    humidity: 78,
    windSpeed: 26,
    windDirection: 250,
    precipitation: 12,
    pressure: 1010,
    cloudiness: 85,
    visibility: 5000,
    weatherCondition: "Rain",
    weatherDescription: "moderate rain",
    weatherIcon: "10d",
    tmax: [31, 30, 29, 30, 31, 31, 30],
    tmin: [26, 26, 25, 26, 26, 26, 25],
    rain: [46, 58, 22, 6, 2, 8, 30],
    pop: [0.85, 0.9, 0.7, 0.5, 0.35, 0.55, 0.75],
    aqiDays: [88, 80, 72, 64, 58, 66, 74],
    humidityDays: [78, 82, 80, 76, 74, 78, 82],
    windDays: [26, 30, 24, 20, 18, 22, 28],
    rainfallPast14: [12, 30, 8, 0, 42, 55, 18, 0, 6, 24, 38, 10, 2, 20],
  },
};

const PM25_BREAKPOINTS: Array<[number, number]> = [
  [0, 0],
  [50, 12],
  [100, 35.5],
  [150, 55.5],
  [200, 125.5],
  [300, 250.5],
  [500, 500.5],
];

export function pm25FromAqi(aqi: number): number {
  const a = Math.max(0, Math.min(500, aqi));
  for (let i = 1; i < PM25_BREAKPOINTS.length; i += 1) {
    const [aqiHigh, concHigh] = PM25_BREAKPOINTS[i];
    const [aqiLow, concLow] = PM25_BREAKPOINTS[i - 1];
    if (a <= aqiHigh) {
      const span = aqiHigh - aqiLow;
      const conc = concLow + ((a - aqiLow) / span) * (concHigh - concLow);
      return Math.round(conc * 10) / 10;
    }
  }
  return concRefLast();
}

function concRefLast(): number {
  return 500.5;
}

function profileFor(locationId: string): LocationProfile {
  return PROFILES[locationId] ?? PROFILES.udaipur;
}

export function buildDemoAir(locationId: string): AirReading {
  const p = profileFor(locationId);
  const pm25 = pm25FromAqi(p.aqiNow);
  return {
    aqi: p.aqiNow,
    pm25,
    pm10: Math.round(pm25 * p.pmRatio * 10) / 10,
    no2: p.no2,
    o3: p.o3,
    co: p.co,
    so2: p.so2,
  };
}

export function buildDemoWeather(locationId: string): WeatherReading {
  const p = profileFor(locationId);
  const loc = findLocation(locationId);
  return {
    temperature: p.temp,
    apparentTemperature: Math.round(heatIndexCelsius(p.temp, p.humidity) * 10) / 10,
    humidity: p.humidity,
    windSpeed: p.windSpeed,
    windDirection: p.windDirection,
    precipitation: p.precipitation,
    pressure: p.pressure,
    cloudiness: p.cloudiness,
    visibility: p.visibility,
    weatherCondition: p.weatherCondition,
    weatherDescription: p.weatherDescription,
    icon: p.weatherIcon,
    timestamp: demoWeatherTimestamp(),
    // Demo anchor is today 12:00 UTC — offset 0 keeps displayed time aligned with that anchor.
    timezoneOffset: 0,
    providerCityName: loc.name,
    providerCountry: null,
    providerLat: loc.lat,
    providerLon: loc.lon,
  };
}

/** Deterministic demo observation anchor: today at 12:00 UTC (stable within a day). */
function demoWeatherTimestamp(): string {
  const now = new Date();
  const anchor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
  return new Date(anchor).toISOString();
}

/** Last 24 hours, ending at 16:00 local (fixed demo anchor). Deterministic. */
export function buildDemoHourly(locationId: string): HourlyPoint[] {
  const p = profileFor(locationId);
  const seed = hashString(locationId);
  const trendDelta = p.trend === "rising" ? 32 : p.trend === "falling" ? -32 : 6;
  const diurnal = (hour: number): number =>
    8 * Math.sin(((hour - 8) / 24) * 2 * Math.PI) + (hour >= 18 && hour <= 21 ? 6 : 0);
  const refNoise = noise(seed, 23);
  const refDiurnal = diurnal(16);
  const refTempPhase = Math.sin(((16 - 14) / 12) * Math.PI);
  const refHumPhase = refTempPhase;

  const points: HourlyPoint[] = [];
  for (let i = 0; i < 24; i += 1) {
    const hour = (((16 - 23 + i) % 24) + 24) % 24;
    const base = p.aqiNow - (trendDelta * (23 - i)) / 23;
    const d = diurnal(hour) - refDiurnal;
    const n = (noise(seed, i) - refNoise) * 8;
    const aqi = Math.max(5, Math.min(500, Math.round(base + d + n)));
    const pm25 = pm25FromAqi(aqi);
    const tempPhase = Math.sin(((hour - 14) / 12) * Math.PI);
    const temperature =
      Math.round((p.temp + 4 * (tempPhase - refTempPhase)) * 10) / 10;
    const humidity = Math.max(
      10,
      Math.min(95, Math.round(p.humidity - 12 * (tempPhase - refHumPhase))),
    );
    points.push({
      hour: `${String(hour).padStart(2, "0")}:00`,
      aqi,
      pm25,
      pm10: Math.round(pm25 * p.pmRatio * 10) / 10,
      temperature,
      humidity,
    });
  }
  return points;
}

export function buildDemoDaily(locationId: string): DailyPoint[] {
  const p = profileFor(locationId);
  return DAY_LABELS.map((day, i) => ({
    day,
    tempMax: p.tmax[i],
    tempMin: p.tmin[i],
    humidity: p.humidityDays[i],
    precipitationMm: p.rain[i],
    aqi: p.aqiDays[i],
    windSpeed: p.windDays[i],
    precipProbability: p.pop[i],
  }));
}

export function buildDemoRainfallPast14(locationId: string): number[] {
  return profileFor(locationId).rainfallPast14;
}

const ROUTE_TEMPLATES: Record<
  string,
  Array<Omit<RouteOption, "avgAqi" | "exposureIndex"> & { aqiDelta: number }>
> = {
  udaipur: [
    { id: "green-lake", name: "Lake Palace Rd (garden stretch)", distanceKm: 5.2, durationMin: 21, greenFraction: 0.65, aqiDelta: -14 },
    { id: "city-core", name: "City Core (dense roads)", distanceKm: 4.1, durationMin: 24, greenFraction: 0.2, aqiDelta: 16 },
    { id: "bypass", name: "NH-48 Bypass (fast, arterial)", distanceKm: 7.4, durationMin: 18, greenFraction: 0.1, aqiDelta: 24 },
  ],
  jaipur: [
    { id: "green-park", name: "Central Park perimeter", distanceKm: 6.0, durationMin: 25, greenFraction: 0.6, aqiDelta: -12 },
    { id: "city-core", name: "Pink City core", distanceKm: 4.6, durationMin: 27, greenFraction: 0.18, aqiDelta: 18 },
    { id: "bypass", name: "Outer Ring Road", distanceKm: 8.2, durationMin: 21, greenFraction: 0.12, aqiDelta: 20 },
  ],
  delhi: [
    { id: "green-park", name: "Park + internal roads", distanceKm: 5.8, durationMin: 26, greenFraction: 0.55, aqiDelta: -16 },
    { id: "city-core", name: "Main avenue corridor", distanceKm: 4.4, durationMin: 23, greenFraction: 0.22, aqiDelta: 14 },
    { id: "bypass", name: "Ring Road express stretch", distanceKm: 7.9, durationMin: 19, greenFraction: 0.08, aqiDelta: 26 },
  ],
  mumbai: [
    { id: "green-park", name: "Coastal promenade", distanceKm: 5.5, durationMin: 24, greenFraction: 0.5, aqiDelta: -8 },
    { id: "city-core", name: "Inland arterial", distanceKm: 4.8, durationMin: 26, greenFraction: 0.2, aqiDelta: 10 },
    { id: "bypass", name: "Highway connector", distanceKm: 8.0, durationMin: 20, greenFraction: 0.1, aqiDelta: 16 },
  ],
};

/** Exposure index: estimated AQI-weighted dose proxy — always label as ESTIMATED. */
export function estimateExposure(avgAqi: number, durationMin: number, greenFraction: number): number {
  const hours = durationMin / 60;
  const index = avgAqi * hours * (1 + (1 - greenFraction) * 0.5);
  return Math.round(index * 10) / 10;
}

export function buildDemoRoutes(locationId: string): RouteOption[] {
  const p = profileFor(locationId);
  const templates = ROUTE_TEMPLATES[locationId] ?? ROUTE_TEMPLATES.udaipur;
  return templates.map((t) => {
    const avgAqi = Math.max(5, Math.min(500, Math.round(p.aqiNow + t.aqiDelta)));
    const { aqiDelta: _delta, ...rest } = t;
    return {
      ...rest,
      avgAqi,
      exposureIndex: estimateExposure(avgAqi, t.durationMin, t.greenFraction),
    };
  });
}

export const DEMO_WASTE_SAMPLES: DemoWasteSample[] = [
  { id: "sample-bottle", name: "Plastic water bottle", hint: "Clear PET bottle with cap", category: "plastic" },
  { id: "sample-newspaper", name: "Old newspaper", hint: "Stack of dry newsprint", category: "paper" },
  { id: "sample-can", name: "Aluminium beverage can", hint: "Crushed drink can", category: "metal" },
  { id: "sample-peel", name: "Fruit peel scraps", hint: "Kitchen organic scraps", category: "organic" },
  { id: "sample-battery", name: "Used batteries", hint: "Household AA batteries", category: "hazardous" },
  { id: "sample-phone", name: "Old circuit board", hint: "Broken electronic board", category: "e-waste" },
];

export function demoLocationName(locationId: string): string {
  return findLocation(locationId).name;
}
