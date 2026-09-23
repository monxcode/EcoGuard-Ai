import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { routeCompareSchema } from "../schemas/api";
import type { RouteComparisonPayload, RouteOption } from "../../shared/types";
import { findLocation } from "../../shared/locations";
import { buildDemoRoutes } from "../tools/demoFixtures";
import { loadEnvironmentalData } from "../tools/providers";
import { runAgents } from "../agents/orchestrator";

export const routesRouter = Router();

routesRouter.get(
  "/routes",
  asyncRoute(async (req, res) => {
    const { locationId } = routeCompareSchema.parse(req.query);
    const location = findLocation(locationId);
    const routes = buildDemoRoutes(location.id);
    res.json({
      location,
      routes,
      dataState: "demo",
      note: "Routing provider not configured — route options are demo fixtures.",
    });
  }),
);

routesRouter.post(
  "/routes/compare",
  asyncRoute(async (req, res) => {
    const { locationId, routeIds } = routeCompareSchema.parse(req.body ?? {});
    const location = findLocation(locationId);
    const all: RouteOption[] = buildDemoRoutes(location.id);
    const selected = routeIds?.length
      ? all.filter((r) => routeIds.includes(r.id))
      : all.slice(0, 3);
    if (selected.length < 2) {
      res.status(400).json({
        error: { code: "bad_request", message: "Select at least two routes to compare." },
      });
      return;
    }

    const data = await loadEnvironmentalData(location);
    const [agentRun] = await runAgents(["green-route"], data, {
      extra: { kind: "route", routes: selected },
    });

    const payload: RouteComparisonPayload = {
      location,
      generatedAt: new Date().toISOString(),
      routes: selected,
      selectedIds: selected.map((r) => r.id),
      agentRun,
      dataState: "estimated",
    };
    res.json(payload);
  }),
);
