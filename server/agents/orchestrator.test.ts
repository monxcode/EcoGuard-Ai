import { describe, expect, it } from "vitest";
import { classifyIntent, routeForIntent } from "./orchestrator";

describe("orchestrator intent routing", () => {
  it("routes a running question to air, weather and heat only", () => {
    const intent = classifyIntent("Can I go running this evening?");
    expect(intent).toBe("running");
    expect(routeForIntent(intent)).toEqual(["air-quality", "weather", "heat-risk"]);
  });

  it("routes a pollution question to air, weather and pollution analysis", () => {
    const intent = classifyIntent("Why is pollution increasing?");
    expect(intent).toBe("pollution");
    expect(routeForIntent(intent)).toEqual(["air-quality", "weather", "pollution-analysis"]);
  });

  it("routes a city-risk question to all domain risk agents but not waste/route", () => {
    const intent = classifyIntent("Is my city at environmental risk?");
    expect(intent).toBe("city-risk");
    const route = routeForIntent(intent);
    expect(route).toEqual([
      "air-quality",
      "heat-risk",
      "flood-risk",
      "wildfire-risk",
      "water-stress",
    ]);
    expect(route).not.toContain("waste-intelligence");
    expect(route).not.toContain("green-route");
  });

  it("routes heat questions before generic risk", () => {
    const intent = classifyIntent("Is there heat risk today?");
    expect(intent).toBe("heat");
    expect(routeForIntent(intent)).toEqual(["weather", "heat-risk"]);
  });

  it("falls back to general with a small agent subset", () => {
    const intent = classifyIntent("hello");
    expect(intent).toBe("general");
    expect(routeForIntent(intent)).toEqual(["air-quality", "weather", "heat-risk"]);
  });

  it("never routes to every agent for a single request", () => {
    for (const q of ["safe to run?", "why is aqi high", "flood risk?", "hot today?"]) {
      expect(routeForIntent(classifyIntent(q)).length).toBeLessThan(6);
    }
  });
});
