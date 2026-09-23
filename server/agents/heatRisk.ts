import { z } from "zod";
import { heatRiskFromIndex } from "../../shared/aqi";
import type { AgentResult } from "../../shared/types";
import { generateValidatedJson } from "../tools/gemini";
import { cap, round1, type DomainAgentDef } from "./base";
import { heatHiFromIndex } from "./heatMath";

const HOT_SPELL_THRESHOLD_C = 36;

const heatNarrativeSchema = z.object({
  explanation: z.string().min(20).max(500),
  recommendations: z.array(z.string().min(10).max(220)).min(1).max(5),
});

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
  async run(ctx): Promise<AgentResult> {
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

    let factors = [
      `Heat index ${hi} °C from ${wx.temperature} °C and ${wx.humidity}% humidity — EcoGuard's thermal-stress assessment level: ${riskLevel}.`,
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

    let recommendations: string[] = [];
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

    // AI risk explanation + recommendations — interprets the measured values
    // above only; deterministic fallback preserved on any failure.
    const ai = await generateValidatedJson(
      [
        "You are the Heat Risk agent (HeatShield) of an environmental intelligence system.",
        "Explain the heat risk in 1 short paragraph and give 2-4 practical recommendations,",
        "based ONLY on the facts below. Hedged language; no invented numbers; never claim",
        "official warning status — this is a screening assessment.",
        "",
        `Location: ${ctx.data.location.name} (${ctx.data.location.region})`,
        `Measured: temperature ${wx.temperature} °C, humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h${
          wx.apparentTemperature !== null
            ? `, apparent temperature ${wx.apparentTemperature} °C`
            : ", apparent temperature unavailable"
        }.`,
        `Heat index (EcoGuard derived, Rothfusz): ${hi} °C — assessment level: ${riskLevel}.`,
        ctx.data.daily.length > 0
          ? `Forecast (not measured): highs ${ctx.data.daily.map((d) => `${d.day} ${d.tempMax}°C`).join(", ")}; consecutive days ≥ ${HOT_SPELL_THRESHOLD_C} °C: ${hotDays}.`
          : "Forecast: unavailable.",
        ctx.data.daily.length > 0 && minTempTonight !== null
          ? `Forecast overnight minimum: ${minTempTonight} °C.`
          : "Overnight minimum: unavailable.",
        `Weather data state: ${ctx.data.states.weather}${ctx.data.states.weather === "demo" ? " (demo fixture — not a live observation)" : " (live observation)"}.`,
        "",
        'Return JSON: {"explanation": "1 short paragraph", "recommendations": ["...", ...]}.',
      ].join("\n"),
      heatNarrativeSchema,
    );

    if (ai.usedGemini && ai.data) {
      if (ctx.flags) ctx.flags.usedGemini = true;
      const explanation = ai.data.explanation.trim();
      if (explanation) factors = [factors[0], explanation, ...factors.slice(1)];
      recommendations = cap(
        [...ai.data.recommendations.map((r) => r.trim()).filter(Boolean), ...recommendations],
        5,
      );
    }

    return {
      status: "success",
      riskLevel,
      confidence: ctx.data.states.weather === "live" ? 0.88 : 0.85,
      summary: `Heat index is ${hi} °C — ${riskLevel} heat risk (EcoGuard assessment, not an official warning). ${
        hotDays >= 2
          ? `${hotDays}-day hot spell in the forecast.`
          : "No extended hot spell detected."
      }`,
      factors,
      evidence: [
        `Provider measurements: temperature ${wx.temperature} °C, humidity ${wx.humidity}%.`,
        wx.apparentTemperature !== null
          ? `Provider apparent temperature ${wx.apparentTemperature} °C.`
          : "Provider apparent temperature unavailable — heat index computed from temperature + humidity.",
        `Heat index (Rothfusz approximation): ${hi} °C — EcoGuard's derived assessment, not a government index.`,
        ctx.data.daily.length > 0
          ? `Forecast highs: ${ctx.data.daily.map((d) => `${d.day} ${d.tempMax}°`).join(", ")}.`
          : "Forecast unavailable.",
      ],
      recommendations,
      dataSources: [ctx.data.sources.weather, ctx.data.sources.forecast],
      limitations: [
        `Hot-spell detection uses a ${HOT_SPELL_THRESHOLD_C} °C screening threshold, not official meteorological heatwave criteria.`,
        "Heat index is an approximation; urban heat-island effects can make built-up areas hotter.",
        "This is EcoGuard's screening assessment — not an official health or government warning; follow guidance from local authorities.",
      ],
    };
  },
};
