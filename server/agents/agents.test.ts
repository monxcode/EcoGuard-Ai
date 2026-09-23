import { describe, expect, it } from "vitest";
import { buildDemoAir, buildDemoHourly, buildDemoDaily, buildDemoWeather } from "../tools/demoFixtures";
import { agentResultSchema } from "../schemas/agent";
import { airQualityAgent } from "./airQuality";
import { heatRiskAgent } from "./heatRisk";
import { loadEnvironmentalData } from "../tools/providers";
import { findLocation } from "../../shared/locations";

describe("demo mode determinism", () => {
  it("produces identical fixtures for repeated calls", () => {
    expect(buildDemoAir("udaipur")).toEqual(buildDemoAir("udaipur"));
    expect(buildDemoHourly("udaipur")).toEqual(buildDemoHourly("udaipur"));
    expect(buildDemoDaily("jaipur")).toEqual(buildDemoDaily("jaipur"));
    expect(buildDemoWeather("delhi")).toEqual(buildDemoWeather("delhi"));
  });

  it("hourly series ends exactly at the current AQI and is 24 points", () => {
    const hourly = buildDemoHourly("udaipur");
    expect(hourly).toHaveLength(24);
    expect(hourly[23].aqi).toBe(buildDemoAir("udaipur").aqi);
    expect(hourly[23].temperature).toBe(buildDemoWeather("udaipur").temperature);
  });

  it("loads environmental data with demo labels by default", async () => {
    const data = await loadEnvironmentalData(findLocation("udaipur"));
    expect(data.states.air).toBe("demo");
    expect(data.states.weather).toBe("demo");
    expect(data.sources.air).toContain("Demo Data");
    expect(data.air).not.toBeNull();
    expect(data.weather).not.toBeNull();
  });
});

describe("agent output validation", () => {
  it("air quality agent returns a schema-valid AgentResult with hedged factors", async () => {
    const data = await loadEnvironmentalData(findLocation("udaipur"));
    const result = await airQualityAgent.run({ data });
    const parsed = agentResultSchema.parse(result);
    expect(parsed.status).toBe("success");
    expect(parsed.dataSources.some((s) => s.includes("Demo Data"))).toBe(true);
    expect(parsed.summary.length).toBeGreaterThan(10);
    expect(parsed.limitations.length).toBeGreaterThan(0);
    for (const factor of parsed.factors) {
      expect(factor.toLowerCase()).toMatch(/possible|observed|associated|no dominant/);
      expect(factor.toLowerCase()).not.toMatch(/\bcaused by\b|\bwill definitely\b/);
    }
  });

  it("heat agent classifies demo Udaipur conditions", async () => {
    const data = await loadEnvironmentalData(findLocation("udaipur"));
    const result = await heatRiskAgent.run({ data });
    const parsed = agentResultSchema.parse(result);
    expect(parsed.status).toBe("success");
    expect(["moderate", "high", "severe"]).toContain(parsed.riskLevel);
    expect(parsed.recommendations.length).toBeGreaterThan(0);
  });

  it("agents report unavailable rather than inventing data when inputs are missing", async () => {
    const data = await loadEnvironmentalData(findLocation("udaipur"));
    const broken = { ...data, weather: null, air: null };
    const air = agentResultSchema.parse(await airQualityAgent.run({ data: broken }));
    const heat = agentResultSchema.parse(await heatRiskAgent.run({ data: broken }));
    expect(air.status).toBe("unavailable");
    expect(heat.status).toBe("unavailable");
    expect(air.riskLevel).toBe("unknown");
  });
});
