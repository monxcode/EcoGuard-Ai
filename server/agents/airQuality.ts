import { aqiCategory, aqiRisk } from "../../shared/aqi";
import type { AgentResult, PollutantReading } from "../../shared/types";
import { round1, type AgentContext, type DomainAgentDef } from "./base";

const WHO_GUIDELINES = {
  pm25: { value: 15, label: "WHO 24-hour guideline for PM2.5 (15 µg/m³)" },
  pm10: { value: 45, label: "WHO 24-hour guideline for PM10 (45 µg/m³)" },
  no2: { value: 25, label: "WHO 24-hour guideline for NO2 (25 µg/m³)" },
  o3: { value: 100, label: "WHO 8-hour guideline for O3 (100 µg/m³)" },
  so2: { value: 40, label: "WHO 24-hour guideline for SO2 (40 µg/m³)" },
  co: { value: 4, label: "WHO 24-hour guideline for CO (4 mg/m³)" },
} as const;

export function pollutantRatios(air: {
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
}): PollutantReading[] {
  const entries: Array<{
    key: keyof typeof WHO_GUIDELINES;
    label: string;
    unit: string;
    value: number;
  }> = [
    { key: "pm25", label: "PM2.5", unit: "µg/m³", value: air.pm25 },
    { key: "pm10", label: "PM10", unit: "µg/m³", value: air.pm10 },
    { key: "no2", label: "NO2", unit: "µg/m³", value: air.no2 },
    { key: "o3", label: "O3", unit: "µg/m³", value: air.o3 },
    { key: "co", label: "CO", unit: "mg/m³", value: air.co },
    { key: "so2", label: "SO2", unit: "µg/m³", value: air.so2 },
  ];
  return entries.map((entry) => {
    const guideline = WHO_GUIDELINES[entry.key];
    return {
      key: entry.key,
      label: entry.label,
      value: entry.value,
      unit: entry.unit,
      guideline: guideline.value,
      guidelineLabel: guideline.label,
      ratio: guideline.value > 0 ? round1(entry.value / guideline.value) : 0,
    };
  });
}

function trendDelta(ctx: AgentContext): { delta: number; direction: "rising" | "falling" | "stable" } {
  const h = ctx.data.hourly;
  if (h.length < 2) return { delta: 0, direction: "stable" };
  const delta = h[h.length - 1].aqi - h[0].aqi;
  if (delta >= 8) return { delta, direction: "rising" };
  if (delta <= -8) return { delta, direction: "falling" };
  return { delta, direction: "stable" };
}

function recommendationsFor(category: string): string[] {
  switch (category) {
    case "Good":
      return ["Conditions are suitable for normal outdoor activity."];
    case "Moderate":
      return [
        "Unusually sensitive people may prefer to reduce prolonged intense outdoor exertion.",
      ];
    case "Unhealthy for Sensitive Groups":
      return [
        "Sensitive groups (children, older adults, people with heart or lung conditions) should reduce prolonged outdoor exertion.",
        "Consider moving intense exercise to the morning or evening when AQI is typically lower.",
      ];
    case "Unhealthy":
      return [
        "Everyone should reduce prolonged or heavy outdoor exertion.",
        "Keep outdoor sessions short; consider indoor alternatives for hard training.",
        "Close windows during peak pollution hours if practicable.",
      ];
    default:
      return [
        "Avoid outdoor exertion where possible, especially for sensitive groups.",
        "Follow official local air-quality advisories for your area.",
      ];
  }
}

export const airQualityAgent: DomainAgentDef = {
  name: "Air Quality",
  run(ctx): AgentResult {
    const air = ctx.data.air;
    if (!air) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Air quality data is unavailable for this location right now.",
        factors: [],
        evidence: [],
        recommendations: ["Try again later or switch to Demo Mode in Settings."],
        dataSources: [ctx.data.sources.air],
        limitations: ["No air-quality provider returned data for this request."],
      };
    }

    const category = aqiCategory(air.aqi);
    const risk = aqiRisk(air.aqi);
    const { delta, direction } = trendDelta(ctx);
    const ratios = pollutantRatios(air);
    const dominant = [...ratios].sort((a, b) => b.ratio - a.ratio)[0];

    const factors: string[] = [];
    if (dominant && dominant.ratio > 1) {
      factors.push(
        `Possible contributor: ${dominant.label} is at ${dominant.value} ${dominant.unit}, about ${dominant.ratio}× the ${dominant.guidelineLabel}.`,
      );
    }
    if (direction !== "stable") {
      factors.push(
        `Observed alongside a ${direction} 24-hour AQI trend (${delta > 0 ? "+" : ""}${delta} points).`,
      );
    }
    if (ctx.data.weather) {
      if (ctx.data.weather.windSpeed < 12) {
        factors.push(
          "Light winds observed alongside the current AQI — weak dispersion is a possible influence.",
        );
      } else if (ctx.data.weather.windSpeed > 25) {
        factors.push(
          "Stronger winds observed alongside the current AQI — enhanced dispersion is a possible influence.",
        );
      }
    }
    if (factors.length === 0) factors.push("No dominant driver identified from available inputs.");

    const evidence = [
      `Current AQI ${air.aqi} (${category.label}, US AQI scale).`,
      `PM2.5 ${air.pm25} µg/m³, PM10 ${air.pm10} µg/m³, NO2 ${air.no2} µg/m³, O3 ${air.o3} µg/m³.`,
      `CO ${air.co} mg/m³, SO2 ${air.so2} µg/m³.`,
      `24-hour AQI trend: ${direction} (${delta > 0 ? "+" : ""}${delta} points).`,
    ];
    if (ctx.data.weather) {
      evidence.push(
        `Wind ${ctx.data.weather.windSpeed} km/h, humidity ${ctx.data.weather.humidity}%.`,
      );
    }

    return {
      status: "success",
      riskLevel: risk,
      confidence: ctx.data.states.air === "live" ? 0.9 : 0.85,
      summary: `AQI is ${air.aqi} — ${category.label}. ${dominant ? `${dominant.label} is the highest pollutant relative to health guidelines.` : ""}`.trim(),
      factors,
      evidence,
      recommendations: recommendationsFor(category.label),
      dataSources: [ctx.data.sources.air, ctx.data.sources.airTrend],
      limitations: [
        "Area-level model estimates rather than a specific neighbourhood sensor.",
        "Deeper source attribution is the job of the Pollution Analysis agent.",
      ],
    };
  },
};
