import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { locationQuerySchema } from "../schemas/api";
import { findLocation } from "../../shared/locations";
import type { DashboardPayload } from "../../shared/types";
import { orchestrate, runAgents, routeForIntent } from "../agents/orchestrator";
import { loadEnvironmentalData } from "../tools/providers";
import { buildAlerts } from "../services/alerts";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/dashboard",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const outcome = await orchestrate({ locationId, intent: "city-risk" });

    const payload: DashboardPayload = {
      location: outcome.data.location,
      generatedAt: new Date().toISOString(),
      air: outcome.data.air,
      weather: outcome.data.weather,
      hourly: outcome.data.hourly,
      daily: outcome.data.daily,
      states: outcome.data.states,
      sources: outcome.data.sources,
      agentRuns: outcome.domainRuns,
      overall: outcome.overallRun,
      advisory: outcome.advisory,
      alerts: outcome.alerts,
      errors: outcome.data.errors,
    };
    res.json(payload);
  }),
);

dashboardRouter.get(
  "/alerts",
  asyncRoute(async (req, res) => {
    const { locationId } = locationQuerySchema.parse(req.query);
    const location = findLocation(locationId);
    const data = await loadEnvironmentalData(location);
    const runs = await runAgents(routeForIntent("city-risk"), data);
    const alerts = buildAlerts(runs);
    res.json({ alerts, location });
  }),
);
