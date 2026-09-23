import { aqiRisk } from "../../shared/aqi";
import type { AgentResult, RouteOption } from "../../shared/types";
import { round1, type DomainAgentDef } from "./base";

const INCONCLUSIVE_BAND = 0.1;

export const greenRouteAgent: DomainAgentDef = {
  name: "Green Route (GreenRoute)",
  run(ctx): AgentResult {
    const extra = ctx.extra;
    if (!extra || extra.kind !== "route" || extra.routes.length < 2) {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "At least two routes are required for a comparison.",
        factors: [],
        evidence: [],
        recommendations: [],
        dataSources: ["GreenRoute"],
        limitations: ["No routes provided."],
      };
    }

    const routes: RouteOption[] = extra.routes;
    const exposures = routes.map((r) => r.exposureIndex);
    const min = Math.min(...exposures);
    const max = Math.max(...exposures);
    const spread = max > 0 ? (max - min) / max : 0;
    const best = routes[exposures.indexOf(min)];
    const worst = routes[exposures.indexOf(max)];
    const meanAqi = round1(routes.reduce((acc, r) => acc + r.avgAqi, 0) / routes.length);
    const riskLevel = aqiRisk(meanAqi);

    const inconclusive = spread <= INCONCLUSIVE_BAND;
    const summary = inconclusive
      ? `Estimated exposures across the selected routes are within ${Math.round(
          INCONCLUSIVE_BAND * 100,
        )}% of each other — the available data does not support declaring one route lower-exposure.`
      : `${best.name} shows the lowest estimated exposure index (${min}) versus ${worst.name} (${max}) — an estimate, not a measurement.`;

    const factors = routes.map(
      (r) =>
        `Estimated exposure ${r.exposureIndex} for ${r.name} (avg AQI ${r.avgAqi}, ${r.durationMin} min, ${round1(
          r.greenFraction * 100,
        )}% green cover on route).`,
    );
    factors.push(
      "Exposure index = route-average AQI × duration × green-cover adjustment — an ESTIMATED proxy, not a dose measurement.",
    );

    const recommendations = inconclusive
      ? [
          "Choose based on distance, safety and comfort — exposure differences are not meaningful at this margin.",
          "If air quality matters to you, check the current AQI and pick cooler, shaded hours.",
        ]
      : [
          `Consider ${best.name} when lower estimated exposure is the priority — estimate only, verify conditions on the day.`,
          "Travel in off-peak hours when traffic-related pollution is typically lower.",
        ];

    return {
      status: "success",
      riskLevel,
      confidence: 0.55,
      summary,
      factors,
      evidence: routes.map(
        (r) => `${r.name}: ${round1(r.distanceKm)} km, ~${r.durationMin} min, avg AQI ${r.avgAqi}, exposure ${r.exposureIndex}.`,
      ),
      recommendations,
      dataSources: [
        ctx.data.sources.air,
        "Demo Data — Route Fixtures (routing provider not configured)",
        "Estimated from AQI + route profile (no direct source)",
      ],
      limitations: [
        "All exposure values are ESTIMATES layered on area-level AQI — no along-route sensors were consulted.",
        "Routing provider not configured; route geometries are demo fixtures.",
        "No traffic, elevation, indoor-air or personal-sensitivity data included — estimates are not health guarantees.",
        inconclusive
          ? "Comparison result: inconclusive — differences fall within the noise band."
          : "Comparison relies on estimated exposure differences exceeding 10% to be meaningful.",
      ],
    };
  },
};
