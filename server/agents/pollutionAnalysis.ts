import { z } from "zod";
import { generateValidatedJson } from "../tools/gemini";
import type { AgentResult } from "../../shared/types";
import { cap, round1, sum, type AgentContext, type DomainAgentDef } from "./base";

const interpretationSchema = z.object({
  interpretation: z.array(z.string().min(10).max(300)).min(1).max(6),
});

function localInterpretation(ctx: AgentContext): string[] {
  const { hourly, weather, rainfallHistory } = ctx.data;
  const out: string[] = [];
  if (hourly.length >= 2) {
    const delta = hourly[hourly.length - 1].aqi - hourly[0].aqi;
    if (delta >= 8) {
      out.push(
        `AQI rose ${delta} points over the last 24 hours (observed). The increase is observed during afternoon-to-evening hours, which often overlap with traffic activity — a possible contributor, though no traffic data was available.`,
      );
    } else if (delta <= -8) {
      out.push(
        `AQI fell ${Math.abs(delta)} points over the last 24 hours (observed), a change that may be associated with dispersion conditions — a possible influence, not a confirmed cause.`,
      );
    } else {
      out.push(
        "AQI was broadly stable over the last 24 hours (observed), with no sustained direction that the available inputs can explain.",
      );
    }
  }
    if (weather) {
      if (weather.windSpeed < 12) {
        out.push(
          `Light winds (${weather.windSpeed} km/h) were observed alongside the elevated readings — reduced dispersion is a possible influence.`,
        );
      } else if (weather.windSpeed > 20) {
      out.push(
        `Wind at ${weather.windSpeed} km/h was observed alongside the readings — enhanced dispersion is a possible influence on the trend.`,
      );
    }
    if (weather.humidity >= 70) {
      out.push(
        "Higher humidity was observed alongside the pollution levels — humid, stagnant conditions are often associated with slower particulate clearance.",
      );
    }
    if (weather.cloudiness !== null && weather.cloudiness >= 80) {
      out.push(
        `Heavy cloud cover (${weather.cloudiness}%) was observed alongside the readings — overcast, low-mixing conditions are a possible contributor.`,
      );
    }
    if (weather.precipitation > 0) {
      out.push(
        `Precipitation (${weather.precipitation} mm in the last hour) was observed — washout is a possible influence on particulate levels.`,
      );
    }
    if (weather.humidity <= 35 && rainfallHistory.days14.length > 0) {
      const past14 = sum(rainfallHistory.days14);
      if (past14 < 5) {
        out.push(
          `Only ${past14} mm of rain was recorded in the 14-day demo history — the absence of washout is a possible contributor to retained particulates.`,
        );
      }
    }
  }
  return out;
}

/** "Pollution Source Detective" — hedged possible contributors only, never definite causes. */
export const pollutionAnalysisAgent: DomainAgentDef = {
  name: "Pollution Analysis",
  async run(ctx): Promise<AgentResult> {
    const air = ctx.data.air;
    if (!air || ctx.data.hourly.length < 2) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "Not enough air-quality history to analyse pollution changes.",
        factors: [],
        evidence: [],
        recommendations: [],
        dataSources: [ctx.data.sources.air, ctx.data.sources.airTrend],
        limitations: ["Trend data unavailable for this request."],
      };
    }

    const observed = [
      `24-hour AQI moved from ${ctx.data.hourly[0].aqi} to ${ctx.data.hourly[ctx.data.hourly.length - 1].aqi}.`,
      ctx.data.weather
        ? `Wind ${ctx.data.weather.windSpeed} km/h${
            ctx.data.weather.windDirection !== null
              ? ` from ${Math.round(ctx.data.weather.windDirection)}°`
              : ""
          }, humidity ${ctx.data.weather.humidity}%, temperature ${ctx.data.weather.temperature} °C${
            ctx.data.weather.cloudiness !== null ? `, cloud cover ${ctx.data.weather.cloudiness}%` : ""
          }, precipitation ${ctx.data.weather.precipitation} mm during this window.`
        : "Weather data unavailable for this window.",
      `14-day rainfall total: ${
        ctx.data.rainfallHistory.days14.length > 0
          ? `${sum(ctx.data.rainfallHistory.days14)} mm`
          : "unavailable"
      }.`,
    ];

    const ai = await generateValidatedJson(
      [
        "You are the Pollution Analysis agent of an environmental intelligence system.",
        "Identify POSSIBLE contributing factors to the observed air-quality change.",
        "Never assert definite causes. Use hedged language: 'possible contributor',",
        "'observed alongside', 'likely influence', 'associated factor'.",
        "",
        `Location: ${ctx.data.location.name} (${ctx.data.location.region})`,
        `Observed data: ${observed.join(" | ")}`,
        `Hourly AQI series: ${ctx.data.hourly.map((h) => h.aqi).join(",")}`,
        ctx.data.weather
          ? `Weather: temp ${ctx.data.weather.temperature}C, humidity ${ctx.data.weather.humidity}%, wind ${ctx.data.weather.windSpeed} km/h${
              ctx.data.weather.windDirection !== null
                ? ` (direction ${Math.round(ctx.data.weather.windDirection)}°)`
                : ""
            }, precipitation ${ctx.data.weather.precipitation} mm${
              ctx.data.weather.cloudiness !== null
                ? `, cloudiness ${ctx.data.weather.cloudiness}%`
                : ""
            }`
          : "Weather: unavailable",
        "",
        'Return JSON: {"interpretation": ["...", ...]} with 2-4 hedged statements.',
      ].join("\n"),
      interpretationSchema,
    );

    const interpretation = ai.data?.interpretation?.length
      ? cap(ai.data.interpretation.map((s) => s.trim()), 5)
      : localInterpretation(ctx);
    if (ctx.flags) ctx.flags.usedGemini = ai.usedGemini && Boolean(ai.data);

    const corroborating = interpretation.length;
    const confidence = round1(Math.min(0.7, 0.35 + corroborating * 0.08) * 100) / 100;

    const limitations = [
      "No traffic-count data available for this location — traffic influence cannot be verified.",
      "No industrial-emission or satellite aerosol data available — source apportionment is not possible.",
      "These are possible contributors observed alongside the data, not confirmed causes.",
    ];
    if (ctx.data.states.air === "demo") {
      limitations.push("Based on demo fixture data, not live measurements.");
    }

    return {
      status: "success",
      riskLevel: "unknown",
      confidence,
      summary: `Analysis of the 24-hour AQI change identified ${interpretation.length} possible contributing factor(s). No definite cause can be assigned from the available inputs.`,
      factors: interpretation,
      evidence: observed,
      recommendations: [
        "Check whether the pattern repeats on similar weather days before drawing conclusions.",
        "For source-level answers, consult official emission inventories — this tool only reasons over observed conditions.",
      ],
      dataSources: [ctx.data.sources.air, ctx.data.sources.airTrend, ctx.data.sources.weather],
      limitations,
    };
  },
};
