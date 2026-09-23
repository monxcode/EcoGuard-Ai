import type { AgentResult, RiskLevel } from "../../shared/types";
import { sum, type DomainAgentDef } from "./base";

/** Weather-based fire-risk screening (no vegetation/historical fire data). */
function fireWeatherScore(input: {
  temp: number;
  humidity: number;
  wind: number;
  rain3d: number;
  rain14: number | null;
}): number {
  let score = 0;
  if (input.temp >= 38) score += 2;
  else if (input.temp >= 35) score += 1;
  if (input.humidity <= 25) score += 2;
  else if (input.humidity <= 40) score += 1;
  if (input.wind >= 40) score += 2;
  else if (input.wind >= 25) score += 1;
  if (input.rain3d <= 0) score += 1;
  if (input.rain14 !== null && input.rain14 < 10) score += 1;
  return score;
}

function scoreToRisk(score: number): RiskLevel {
  if (score >= 6) return "severe";
  if (score >= 4) return "high";
  if (score >= 2) return "moderate";
  return "low";
}

export const wildfireRiskAgent: DomainAgentDef = {
  name: "Wildfire Risk (WildfireWatch)",
  run(ctx): AgentResult {
    const wx = ctx.data.weather;
    const { daily, rainfallHistory } = ctx.data;
    if (!wx) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Fire risk cannot be assessed — weather data is unavailable.",
        factors: [],
        evidence: [],
        recommendations: ["Follow official updates from forest and fire authorities."],
        dataSources: [ctx.data.sources.weather],
        limitations: ["No temperature/humidity/wind inputs available."],
      };
    }

    const rain3d = sum(daily.slice(0, 3).map((d) => d.precipitationMm));
    const rain14 = rainfallHistory.days14.length > 0 ? sum(rainfallHistory.days14) : null;
    const score = fireWeatherScore({
      temp: wx.temperature,
      humidity: wx.humidity,
      wind: wx.windSpeed,
      rain3d,
      rain14,
    });
    const riskLevel = scoreToRisk(score);

    const factors = [
      `Temperature ${wx.temperature} °C and humidity ${wx.humidity}% — heat/dryness pairing observed alongside this score.`,
      `3-day forecast rainfall ${rain3d} mm; recent dryness is a possible contributor when rainfall is near zero.`,
      wx.windSpeed >= 25
        ? `Wind at ${wx.windSpeed} km/h would support fire spread — an associated risk factor.`
        : `Wind ${wx.windSpeed} km/h — limited wind-driven spread signal currently.`,
    ];
    if (rain14 !== null) {
      factors.push(`14-day rainfall ${rain14} mm — dryness proxy from available rainfall history.`);
    }

    const recommendations =
      riskLevel === "low"
        ? ["No elevated fire-weather signal from current conditions."]
        : [
            "Avoid open flames and outdoor burning in dry conditions.",
            "Follow official advisories from forest-department and fire-authority channels.",
            "Report smoke or fire sightings to local emergency services — do not attempt to intervene.",
          ];

    return {
      status: "success",
      riskLevel,
      confidence: 0.6,
      summary: `Weather-based fire-risk screening is ${riskLevel} (score ${score}/8). This is a proxy from temperature, humidity, wind and rainfall — not an official fire warning.`,
      factors,
      evidence: [
        `Temperature ${wx.temperature} °C, humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h.`,
        `3-day rainfall ${rain3d} mm; 14-day rainfall ${rain14 !== null ? `${rain14} mm` : "unavailable"}.`,
        ctx.data.daily.length > 0
          ? `Forecast highs: ${ctx.data.daily.map((d) => `${d.day} ${d.tempMax}°`).join(", ")}.`
          : "Forecast unavailable.",
      ],
      recommendations,
      dataSources: [ctx.data.sources.weather, ctx.data.sources.forecast].concat(
        rain14 !== null ? [rainfallHistory.source] : [],
      ),
      limitations: [
        "No vegetation-dryness, land-cover, or historical fire-incident data available for this location.",
        "No authoritative real-time wildfire-warning feed is configured; this is not an official warning.",
        ctx.data.states.weather === "demo" ? "Based on demo fixture data." : "Weather-based proxy only.",
      ],
    };
  },
};
