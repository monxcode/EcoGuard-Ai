import type { AgentResult } from "../../shared/types";
import { round1, sum, type DomainAgentDef } from "./base";

function windDirectionLabel(degrees: number | null): string {
  if (degrees === null || !Number.isFinite(degrees)) return "variable direction";
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return labels[Math.round(((degrees % 360) / 45)) % 8];
}

export const weatherAgent: DomainAgentDef = {
  name: "Weather",
  run(ctx): AgentResult {
    const wx = ctx.data.weather;
    if (!wx) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Weather data is unavailable for this location right now.",
        factors: [],
        evidence: [],
        recommendations: [],
        dataSources: [ctx.data.sources.weather],
        limitations: ["No weather provider returned data for this request."],
      };
    }

    const next3Rain = round1(sum(ctx.data.daily.slice(0, 3).map((d) => d.precipitationMm)));
    const rainNow =
      wx.precipitation > 0 ? `${wx.precipitation} mm in the last hour` : "none in the last hour";

    let riskLevel: AgentResult["riskLevel"] = "low";
    if (wx.temperature >= 42 || wx.windSpeed >= 60) riskLevel = "high";
    else if (wx.precipitation >= 40 || wx.windSpeed >= 45) riskLevel = "moderate";

    const condition = wx.weatherDescription ?? wx.weatherCondition;
    const observedAt = new Date(wx.timestamp);

    const evidence = [
      condition
        ? `Conditions: ${condition} (${wx.temperature} °C, feels like ${
            wx.apparentTemperature !== null ? `${wx.apparentTemperature} °C` : "n/a"
          }).`
        : `Temperature ${wx.temperature} °C (feels like ${
            wx.apparentTemperature !== null ? `${wx.apparentTemperature} °C` : "n/a"
          }).`,
      `Humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h from ${windDirectionLabel(
        wx.windDirection,
      )}.`,
      wx.pressure !== null ? `Pressure ${wx.pressure} hPa.` : "Pressure unavailable.",
      wx.cloudiness !== null ? `Cloud cover ${wx.cloudiness}%.` : "Cloud cover unavailable.",
      wx.visibility !== null
        ? `Visibility ${wx.visibility >= 1000 ? `${round1(wx.visibility / 1000)} km` : `${wx.visibility} m`}.`
        : "Visibility unavailable.",
      `Precipitation now: ${rainNow}. Forecast next 3 days: ${next3Rain} mm.`,
      ctx.data.daily.length > 0
        ? `Forecast outlook: highs ${ctx.data.daily.map((d) => d.tempMax).join("/")} °C.`
        : "Forecast outlook unavailable.",
      `Observation time: ${observedAt.toLocaleString()}.`,
    ];

    return {
      status: "success",
      riskLevel,
      confidence: ctx.data.states.weather === "live" ? 0.9 : 0.85,
      summary: condition
        ? `${condition}, ${wx.temperature} °C, humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h. Forecast rainfall next 3 days: ${next3Rain} mm.`
        : `${wx.temperature} °C, humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h. Forecast rainfall next 3 days: ${next3Rain} mm.`,
      factors: [
        "Observational only — risk interpretation belongs to the Heat, Flood and Wildfire agents.",
      ],
      evidence,
      recommendations: [
        "Check the daily forecast before planning extended time outdoors.",
      ],
      dataSources: [ctx.data.sources.weather, ctx.data.sources.forecast],
      limitations: [
        "Forecast skill decreases beyond 48 hours.",
        "UV index is not available from this provider and is not estimated here.",
        ctx.data.states.weather === "demo"
          ? "Demo fixture data — not a live observation."
          : "Point forecast for the area centre; local microclimates vary.",
      ],
    };
  },
};
