import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { findLocation, LOCATIONS } from "../../shared/locations";
import type {
  DataSourcesPayload,
  HealthPayload,
  ProviderStatus,
} from "../../shared/types";
import { config, geminiConfigured } from "../config/env";
import { isDemoMode, setDemoMode } from "../tools/demoState";
import { demoToggleSchema, locationQuerySchema } from "../schemas/api";
import { DEMO_WASTE_SAMPLES } from "../tools/demoFixtures";
import { DEMO_SCENARIO } from "../services/demoScenario";

export const metaRouter = Router();

metaRouter.get("/health", (_req, res) => {
  const payload: HealthPayload = {
    ok: true,
    demoMode: isDemoMode(),
    preferredProvider: config.preferredProvider,
    geminiConfigured,
    version: config.version,
  };
  res.json(payload);
});

metaRouter.get("/locations", (_req, res) => {
  res.json(LOCATIONS);
});

metaRouter.get("/location", (req, res) => {
  const { locationId } = locationQuerySchema.parse(req.query);
  res.json(findLocation(locationId));
});

metaRouter.get("/data-sources", (_req, res) => {
  const demo = isDemoMode();
  const livePreferred = !demo && config.preferredProvider === "live";
  const state = (kind: "air" | "weather" | "derived" | "waste"): ProviderStatus["state"] => {
    if (kind === "waste") return geminiConfigured && livePreferred ? "live" : "demo";
    if (kind === "derived") return livePreferred ? "estimated" : "demo";
    return livePreferred ? "live" : "demo";
  };

  const providers: ProviderStatus[] = [
    {
      domain: "Air quality (AQI, PM, gases)",
      provider: livePreferred ? "Open-Meteo Air Quality" : "Demo air-quality fixtures",
      state: state("air"),
      notes: "US AQI scale. Falls back to demo fixtures if the live call fails.",
    },
    {
      domain: "Weather (temp, humidity, wind)",
      provider: livePreferred ? "Open-Meteo Forecast" : "Demo weather fixtures",
      state: state("weather"),
      notes: "Shared substrate for Heat, Flood and Wildfire agents.",
    },
    {
      domain: "24h AQI trend",
      provider: livePreferred ? "Open-Meteo Air Quality hourly" : "Demo 24h fixture",
      state: state("air"),
      notes: "Hourly series for trend charts and pollution analysis.",
    },
    {
      domain: "7-day forecast",
      provider: livePreferred ? "Open-Meteo Forecast daily" : "Demo forecast fixture",
      state: state("weather"),
      notes: "Feeds heat-spell, flood-rainfall and water-stress screening.",
    },
    {
      domain: "Flood risk",
      provider: "Derived from rainfall/forecast (FloodSense)",
      state: state("derived"),
      notes:
        "No river/water-level or terrain feed configured — rainfall-only screening, capped at 'high'. No authoritative warning feed.",
    },
    {
      domain: "Wildfire risk",
      provider: "Derived from weather proxies (WildfireWatch)",
      state: state("derived"),
      notes: "No vegetation or historical fire-incident feed configured — weather-based proxy only.",
    },
    {
      domain: "Water stress",
      provider: "Derived from rainfall history + forecast (WaterGuard)",
      state: demo ? "demo" : "estimated",
      notes: "No reservoir/groundwater/drought-index feed configured.",
    },
    {
      domain: "Waste classification",
      provider: geminiConfigured ? "Gemini vision" : "Demo classification fixtures",
      state: geminiConfigured ? "live" : "demo",
      notes: geminiConfigured
        ? "Server-side vision classification; hazardous guidance always uses canned safe text."
        : "Set GEMINI_API_KEY server-side to enable AI vision classification.",
    },
    {
      domain: "Routing / geospatial",
      provider: "Demo route fixtures",
      state: "demo",
      notes: "Routing provider not configured — route options are demo fixtures; exposure is always ESTIMATED.",
    },
    {
      domain: "AI reasoning (advisory, interpretation)",
      provider: geminiConfigured ? config.geminiModel : "Rules-based local fallback",
      state: geminiConfigured ? "live" : "unavailable",
      notes: geminiConfigured
        ? "Gemini calls happen server-side only; output is schema-validated."
        : "Without GEMINI_API_KEY the app uses deterministic rules-based phrasing and labels it as such.",
    },
  ];

  const payload: DataSourcesPayload = {
    globalDemoMode: demo,
    preferredProvider: config.preferredProvider,
    geminiConfigured,
    providers,
  };
  res.json(payload);
});

metaRouter.post(
  "/demo",
  asyncRoute(async (req, res) => {
    const { enabled } = demoToggleSchema.parse(req.body);
    const demoMode = setDemoMode(enabled);
    res.json({ demoMode });
  }),
);

metaRouter.get("/demo/scenario", (_req, res) => {
  res.json(DEMO_SCENARIO);
});

metaRouter.get("/waste/samples", (_req, res) => {
  res.json(DEMO_WASTE_SAMPLES);
});
