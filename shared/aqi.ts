import type { RiskLevel } from "./types";

/** US AQI scale (matches Open-Meteo `us_aqi` and demo fixtures). */
export interface AqiCategory {
  label: string;
  min: number;
  max: number;
  risk: RiskLevel;
}

export const AQI_CATEGORIES: AqiCategory[] = [
  { label: "Good", min: 0, max: 50, risk: "low" },
  { label: "Moderate", min: 51, max: 100, risk: "moderate" },
  { label: "Unhealthy for Sensitive Groups", min: 101, max: 150, risk: "high" },
  { label: "Unhealthy", min: 151, max: 200, risk: "high" },
  { label: "Very Unhealthy", min: 201, max: 300, risk: "severe" },
  { label: "Hazardous", min: 301, max: 500, risk: "severe" },
];

export function aqiCategory(aqi: number): AqiCategory {
  const value = Number.isFinite(aqi) ? Math.max(0, Math.min(500, aqi)) : 0;
  return (
    AQI_CATEGORIES.find((c) => value >= c.min && value <= c.max) ??
    AQI_CATEGORIES[AQI_CATEGORIES.length - 1]
  );
}

export function aqiRisk(aqi: number): RiskLevel {
  return aqiCategory(aqi).risk;
}

export const RISK_ORDER: Record<RiskLevel, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
  unknown: -1,
};

export function maxRisk(...levels: RiskLevel[]): RiskLevel {
  let best: RiskLevel = "unknown";
  for (const level of levels) {
    if (RISK_ORDER[level] > RISK_ORDER[best]) best = level;
  }
  return best;
}

/**
 * Rothfusz heat index (NWS). Input metric Celsius + relative humidity %,
 * output Celsius. Below 27 °C / 40 % RH the simple approximation is used.
 */
export function heatIndexCelsius(celsius: number, humidity: number): number {
  const tF = celsius * 1.8 + 32;
  const rh = Math.max(1, Math.min(100, humidity));
  if (tF < 80 || rh < 40) {
    const hiF =
      0.5 * (tF + 61.0 + ((tF - 68.0) * 1.2) + (rh * 0.094));
    return (hiF - 32) / 1.8;
  }
  const hiF =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * rh -
    0.22475541 * tF * rh -
    0.00683783 * tF * tF -
    0.05481717 * rh * rh +
    0.00122874 * tF * tF * rh +
    0.00085282 * tF * rh * rh -
    0.00000199 * tF * tF * rh * rh;
  return (hiF - 32) / 1.8;
}

export function heatRiskFromIndex(hiCelsius: number): RiskLevel {
  if (!Number.isFinite(hiCelsius)) return "unknown";
  if (hiCelsius < 28) return "low";
  if (hiCelsius < 33) return "moderate";
  if (hiCelsius < 40) return "high";
  return "severe";
}
