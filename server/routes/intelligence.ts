import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { locationQuerySchema } from "../schemas/api";
import type {
  AirPayload,
  ClimateInsight,
  ClimatePayload,
  DisasterPayload,
  PollutionAnalysisPayload,
  WaterPayload,
} from "../../shared/types";
import type { AgentRun, EnvironmentalData } from "../../shared/types";
import { loadEnvironmentalData } from "../tools/providers";
import { findLocation } from "../../shared/locations";
import { runAgents } from "../agents/orchestrator";
import { pollutantRatios } from "../agents/airQuality";
import { round1, sum } from "../agents/base";
import { generateText } from "../tools/gemini";

export const intelligenceRouter = Router();

/** Data-grounded fallback when Gemini is unavailable — measured/forecast labelled. */
function climateFallbackInsight(
  data: EnvironmentalData,
  runs: AgentRun[],
): string {
  const wx = data.weather;
  const heat = runs.find((r) => r.agentId === "heat-risk");
  if (!wx) {
    return "Weather data is unavailable — no climate insight can be generated for this location right now.";
  }
  const parts: string[] = [
    `Measured now: ${wx.temperature} °C, humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h.`,
  ];
  if (data.daily.length > 0) {
    const highs = data.daily.map((d) => d.tempMax);
    const rain3 = round1(sum(data.daily.slice(0, 3).map((d) => d.precipitationMm)));
    parts.push(
      `Forecast: highs ${highs.join("/")} °C over ${data.daily.length} days, about ${rain3} mm rain expected in the next 3 days.`,
    );
  } else {
    parts.push("Forecast unavailable.");
  }
  if (heat) parts.push(heat.result.summary);
  if (data.states.weather === "demo") {
    parts.push("Based on demo fixture data, not live measurements.");
  }
  return parts.join(" ");
}

intelligenceRouter.get(
  "/air",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const data = await loadEnvironmentalData(findLocation(locationId));
    const [agentRun] = await runAgents(["air-quality"], data);

    const payload: AirPayload = {
      location: data.location,
      generatedAt: new Date().toISOString(),
      air: data.air,
      hourly: data.hourly,
      daily: data.daily,
      pollutants: data.air ? pollutantRatios(data.air) : [],
      states: data.states,
      sources: data.sources,
      agentRun,
      errors: data.errors,
    };
    res.json(payload);
  }),
);

intelligenceRouter.get(
  "/air/analysis",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const data = await loadEnvironmentalData(findLocation(locationId));
    const flags = { usedGemini: false };
    const [agentRun] = await runAgents(["pollution-analysis"], data, { flags });

    const payload: PollutionAnalysisPayload = {
      observed: agentRun.result.evidence,
      interpretation: agentRun.result.factors,
      confidence: agentRun.result.confidence,
      hedged: true,
      dataSources: agentRun.result.dataSources,
      limitations: agentRun.result.limitations,
      usedGemini: flags.usedGemini,
      agentRun,
    };
    res.json(payload);
  }),
);

intelligenceRouter.get(
  "/climate",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const data = await loadEnvironmentalData(findLocation(locationId));
    const agentRuns = await runAgents(["weather", "heat-risk"], data);

    // Climate Intelligence — concise insight from the actual collected data only.
    const wx = data.weather;
    const heatRun = agentRuns.find((r) => r.agentId === "heat-risk");
    const weatherRun = agentRuns.find((r) => r.agentId === "weather");
    const facts = [
      `Location: ${data.location.name} (${data.location.region})`,
      wx
        ? `Measured now: temperature ${wx.temperature} °C, humidity ${wx.humidity}%, wind ${wx.windSpeed} km/h, condition ${wx.weatherDescription ?? wx.weatherCondition ?? "unavailable"}.`
        : "Measured now: weather data unavailable.",
      data.daily.length > 0
        ? `Forecast (not measured): highs ${data.daily.map((d) => d.tempMax).join("/")} °C, lows ${data.daily.map((d) => d.tempMin).join("/")} °C, 3-day rain ${round1(sum(data.daily.slice(0, 3).map((d) => d.precipitationMm)))} mm.`
        : "Forecast: unavailable.",
      weatherRun ? `Weather assessment: ${weatherRun.result.summary}` : "",
      heatRun ? `Heat assessment: ${heatRun.result.summary}` : "",
      `Data states: weather=${data.states.weather}, forecast=${data.states.forecast}.`,
    ].filter(Boolean);
    const ai = await generateText(
      [
        "You are the Climate Intelligence agent of EcoGuard AI.",
        "Write a concise 2-3 sentence insight from the provided data — trends worth noticing",
        "and one practical takeaway. Clearly treat forecast values as forecast; hedged language;",
        "if an input is unavailable, say so. Never invent measurements.",
        "",
        ...facts,
      ].join("\n"),
    );
    const usedGemini = ai.usedGemini && ai.text.length >= 40;
    const insight: ClimateInsight = {
      text: usedGemini ? ai.text.slice(0, 700) : climateFallbackInsight(data, agentRuns),
      usedGemini,
      error: usedGemini ? undefined : ai.error,
    };

    const payload: ClimatePayload = {
      location: data.location,
      generatedAt: new Date().toISOString(),
      weather: data.weather,
      daily: data.daily,
      states: data.states,
      sources: data.sources,
      agentRuns,
      insight,
      errors: data.errors,
    };
    res.json(payload);
  }),
);

intelligenceRouter.get(
  "/disaster",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const data = await loadEnvironmentalData(findLocation(locationId));
    const agentRuns = await runAgents(["flood-risk", "wildfire-risk"], data);

    const payload: DisasterPayload = {
      location: data.location,
      generatedAt: new Date().toISOString(),
      daily: data.daily,
      weather: data.weather,
      states: data.states,
      sources: data.sources,
      agentRuns,
      authoritativeFeedsConfigured: false,
      errors: data.errors,
    };
    res.json(payload);
  }),
);

intelligenceRouter.get(
  "/water",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const data = await loadEnvironmentalData(findLocation(locationId));
    const [agentRun] = await runAgents(["water-stress"], data);

    const payload: WaterPayload = {
      location: data.location,
      generatedAt: new Date().toISOString(),
      daily: data.daily,
      weather: data.weather,
      rainfallHistory: data.rainfallHistory,
      states: data.states,
      sources: data.sources,
      agentRun,
      errors: data.errors,
    };
    res.json(payload);
  }),
);
