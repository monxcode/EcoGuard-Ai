import { heatRiskFromIndex } from "../../shared/aqi";
import type { AgentResult } from "../../shared/types";
import { round1, type DomainAgentDef } from "./base";
import { heatHiFromIndex } from "./heatMath";

const HOT_SPELL_THRESHOLD_C = 36;

function consecutiveHotDays(daily: { tempMax: number }[]): number {
  let best = 0;
  let current = 0;
  for (const day of daily) {
    if (day.tempMax >= HOT_SPELL_THRESHOLD_C) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

export const heatRiskAgent: DomainAgentDef = {
  name: "Heat Risk (HeatShield)",
  run(ctx): AgentResult {
    const wx = ctx.data.weather;
    if (!wx) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Heat risk cannot be assessed — weather data is unavailable.",
        factors: [],
        evidence: [],
        recommendations: ["Enable a weather provider or use Demo Mode in Settings."],
        dataSources: [ctx.data.sources.weather],
        limitations: ["No temperature/humidity inputs available."],
      };
    }

    const hi = round1(heatHiFromIndex(wx.apparentTemperature, wx.temperature, wx.humidity));
    const riskLevel = heatRiskFromIndex(hi);
    const hotDays = consecutiveHotDays(ctx.data.daily);
    const minTempTonight = ctx.data.daily.length > 0 ? ctx.data.daily[0].tempMin : null;

    const factors = [
      `Heat index ${hi} °C from ${wx.temperature} °C and ${wx.humidity}% humidity — thermal stress level: ${riskLevel}.`,
    ];
    if (hotDays >= 2) {
      factors.push(
        `Possible contributor: ${hotDays} consecutive forecast days at or above ${HOT_SPELL_THRESHOLD_C} °C (screening hot-spell indicator, not an official heatwave declaration).`,
      );
    }
    if (minTempTonight !== null && minTempTonight >= 24) {
      factors.push(
        `Associated factor: overnight minimum near ${minTempTonight} °C limits overnight recovery.`,
      );
    }
    if (wx.windSpeed >= 25) {
      factors.push(
        "Strong wind observed alongside the heat — may increase dehydration during outdoor effort.",
      );
    }

    const recommendations: string[] = [];
    if (riskLevel === "severe" || riskLevel === "high") {
      recommendations.push(
        "Avoid strenuous outdoor activity between 11:00 and 16:00; move exercise to early morning or evening.",
        "Drink water regularly even before feeling thirsty.",
        "Check on older adults, young children, and anyone without reliable cooling.",
      );
    } else if (riskLevel === "moderate") {
      recommendations.push(
        "Take breaks in shade during midday outdoor activity.",
        "Stay hydrated during sustained outdoor time.",
      );
    } else {
      recommendations.push("Conditions are within a comfortable thermal range for most people.");
    }
    recommendations.push("Follow official heat advisories issued by local authorities.");

    return {
      status: "success",
      riskLevel,
      confidence: ctx.data.states.weather === "live" ? 0.88 : 0.85,
      summary: `Heat index is ${hi} °C — ${riskLevel} heat risk. ${
        hotDays >= 2
          ? `${hotDays}-day hot spell in the forecast.`
          : "No extended hot spell detected."
      }`,
      factors,
      evidence: [
        `Temperature ${wx.temperature} °C, humidity ${wx.humidity}%, apparent temperature ${wx.apparentTemperature} °C.`,
        `Heat index (Rothfusz approximation): ${hi} °C.`,
        ctx.data.daily.length > 0
          ? `Forecast highs: ${ctx.data.daily.map((d) => `${d.day} ${d.tempMax}°`).join(", ")}.`
          : "Forecast unavailable.",
      ],
      recommendations,
      dataSources: [ctx.data.sources.weather, ctx.data.sources.forecast],
      limitations: [
        `Hot-spell detection uses a ${HOT_SPELL_THRESHOLD_C} °C screening threshold, not official meteorological heatwave criteria.`,
        "Heat index is an approximation; urban heat-island effects can make built-up areas hotter.",
        "Not an official health warning — follow guidance from local authorities.",
      ],
    };
  },
};
