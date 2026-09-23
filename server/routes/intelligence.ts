import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { locationQuerySchema } from "../schemas/api";
import type {
  AirPayload,
  ClimatePayload,
  DisasterPayload,
  PollutionAnalysisPayload,
  WaterPayload,
} from "../../shared/types";
import { loadEnvironmentalData } from "../tools/providers";
import { findLocation } from "../../shared/locations";
import { runAgents } from "../agents/orchestrator";
import { pollutantRatios } from "../agents/airQuality";

export const intelligenceRouter = Router();

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

    const payload: ClimatePayload = {
      location: data.location,
      generatedAt: new Date().toISOString(),
      weather: data.weather,
      daily: data.daily,
      states: data.states,
      sources: data.sources,
      agentRuns,
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
