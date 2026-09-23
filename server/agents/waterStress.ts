import type { AgentResult } from "../../shared/types";
import { round1, sum, type DomainAgentDef } from "./base";

export const waterStressAgent: DomainAgentDef = {
  name: "Water Stress (WaterGuard)",
  run(ctx): AgentResult {
    const { daily, weather, rainfallHistory } = ctx.data;
    const hasInput = daily.length > 0 || rainfallHistory.days14.length > 0;
    if (!hasInput) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Water stress cannot be assessed — rainfall inputs are unavailable.",
        factors: [],
        evidence: [],
        recommendations: [],
        dataSources: [ctx.data.sources.forecast],
        limitations: ["No rainfall or forecast data available."],
      };
    }

    const rain14 = rainfallHistory.days14.length > 0 ? round1(sum(rainfallHistory.days14)) : null;
    const rain7 = round1(sum(daily.map((d) => d.precipitationMm)));
    const waterProxy = (rain14 ?? 0) + rain7 * 0.5;

    let riskLevel: AgentResult["riskLevel"];
    if (rain14 === null) {
      riskLevel = rain7 < 5 ? "high" : rain7 < 40 ? "moderate" : "low";
    } else if (waterProxy < 15) riskLevel = "high";
    else if (waterProxy < 50) riskLevel = "moderate";
    else riskLevel = "low";

    const factors = [
      rain14 !== null
        ? `14-day rainfall total ${rain14} mm — the dominant input to this water-stress screening.`
        : `14-day rainfall history unavailable; using 7-day forecast (${rain7} mm) only — lower confidence.`,
      `7-day forecast rainfall ${rain7} mm.`,
    ];
    if (weather) {
      factors.push(
        `Temperature ${weather.temperature} °C and humidity ${weather.humidity}% — evaporative demand is an associated factor when hot and dry.`,
      );
    }

    const recommendations =
      riskLevel === "high"
        ? [
            "Prioritize essential water use; defer non-essential outdoor washing and watering.",
            "Check municipal supply schedules and official conservation advisories.",
            "Consider rainwater harvesting for the coming monsoon season (general guidance, not an official scheme).",
          ]
        : riskLevel === "moderate"
          ? [
              "Keep an eye on supply announcements during the coming week.",
              "Fix visible leaks; small savings compound during dry stretches.",
            ]
          : ["Rainfall inputs do not indicate elevated water stress at present."];

    return {
      status: "success",
      riskLevel,
      confidence: rain14 !== null ? 0.7 : 0.5,
      summary: `Water-stress screening is ${riskLevel} (14-day rainfall ${rain14 !== null ? `${rain14} mm` : "unavailable"}, 7-day forecast ${rain7} mm).`,
      factors,
      evidence: [
        `14-day rainfall: ${rain14 !== null ? `${rain14} mm` : "unavailable"}.`,
        `7-day forecast rainfall: ${rain7} mm.`,
        weather ? `Current temperature ${weather.temperature} °C, humidity ${weather.humidity}%.` : "Weather unavailable.",
      ],
      recommendations,
      dataSources: [ctx.data.sources.forecast].concat(
        rain14 !== null ? [rainfallHistory.source] : [],
      ),
      limitations: [
        "No reservoir, groundwater, or drought-index data available for this location — assessment uses rainfall only.",
        rainfallHistory.days14.length === 0
          ? "14-day rainfall history not configured; forecast-only inputs lower confidence."
          : "Rainfall history is a regional proxy; local supply conditions vary.",
        ctx.data.states.forecast === "demo" ? "Based on demo fixture data." : "Not an official water-status declaration.",
      ],
    };
  },
};
