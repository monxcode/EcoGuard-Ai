import type { AgentResult, RiskLevel } from "../../shared/types";
import { round1, sum, type DomainAgentDef } from "./base";

/**
 * Flood risk from rainfall/forecast only. Never claims an area *will* flood —
 * and is capped at "high" because no river/water-level or terrain data exists.
 */
function riskFromRainfall(todayMm: number, forecast72hMm: number): RiskLevel {
  const score = todayMm + forecast72hMm * 0.6;
  if (score >= 90) return "high";
  if (score >= 45) return "high";
  if (score >= 15) return "moderate";
  if (score >= 5) return "moderate";
  return "low";
}

export const floodRiskAgent: DomainAgentDef = {
  name: "Flood Risk (FloodSense)",
  run(ctx): AgentResult {
    const { daily, weather, rainfallHistory } = ctx.data;
    const todayMm = weather?.precipitation ?? daily[0]?.precipitationMm ?? 0;
    const forecast72h = round1(sum(daily.slice(0, 3).map((d) => d.precipitationMm)));
    const forecast7d = round1(sum(daily.map((d) => d.precipitationMm)));
    const past14 = rainfallHistory.days14.length > 0 ? round1(sum(rainfallHistory.days14)) : null;

    const hasAnyRainInput = daily.length > 0 || weather !== null;
    if (!hasAnyRainInput) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Flood risk cannot be assessed — rainfall and forecast data are unavailable.",
        factors: [],
        evidence: [],
        recommendations: ["Follow official bulletins from local disaster-management authorities."],
        dataSources: [ctx.data.sources.forecast],
        limitations: [
          "No rainfall/forecast provider available.",
          "No authoritative real-time flood-warning feed is configured.",
        ],
      };
    }

    const riskLevel = riskFromRainfall(todayMm, forecast72h);

    const factors = [
      `Forecast rainfall next 72 hours: ${forecast72h} mm — the primary input to this screening assessment.`,
      `Rain today: ${todayMm} mm; 7-day forecast total: ${forecast7d} mm.`,
    ];
    if (past14 !== null) {
      factors.push(
        past14 < 10
          ? `Dry antecedent conditions: ${past14} mm in the demo 14-day history — ground may absorb early rain (possible influence).`
          : `Wet antecedent conditions: ${past14} mm in the demo 14-day history — reduced absorption is a possible influence.`,
      );
    }
    if (weather && weather.windSpeed > 40) {
      factors.push("Strong wind observed alongside rainfall — may accompany intense weather cells.");
    }

    const evidence = [
      `Rain today ${todayMm} mm; 72-hour forecast ${forecast72h} mm; 7-day forecast ${forecast7d} mm.`,
      `14-day rainfall history: ${past14 !== null ? `${past14} mm` : "unavailable"}.`,
      ctx.data.daily.length > 0
        ? `Daily forecast: ${ctx.data.daily.map((d) => `${d.day} ${d.precipitationMm}mm`).join(", ")}.`
        : "Daily forecast unavailable.",
    ];

    const recommendations =
      riskLevel === "low"
        ? ["No rainfall-driven flood concern indicated by the available inputs."]
        : [
            "Avoid low-lying roads and underpasses during heavy rain.",
            "Do not walk or drive through standing water of unknown depth.",
            "Follow official advisories from local disaster-management and meteorological authorities.",
          ];

    return {
      status: "success",
      riskLevel,
      confidence: daily.length > 0 ? 0.7 : 0.5,
      summary: `Rainfall-based flood risk is ${riskLevel} for the coming days (72-hour forecast: ${forecast72h} mm). This is a screening assessment, not an official flood warning.`,
      factors,
      evidence,
      recommendations,
      dataSources: [ctx.data.sources.forecast, ctx.data.sources.weather].concat(
        past14 !== null ? [rainfallHistory.source] : [],
      ),
      limitations: [
        "No river/water-level or terrain data available for this location — risk is derived from rainfall alone and capped at 'high'.",
        "No authoritative real-time flood-warning feed is configured; this must not be treated as an official warning.",
        ctx.data.states.forecast === "demo" ? "Based on demo fixture data." : "Point forecast uncertainty applies.",
      ],
    };
  },
};
