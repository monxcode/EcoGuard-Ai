import { airQualityAgent } from "./airQuality";
import { pollutionAnalysisAgent } from "./pollutionAnalysis";
import { weatherAgent } from "./weather";
import { heatRiskAgent } from "./heatRisk";
import { floodRiskAgent } from "./floodRisk";
import { wildfireRiskAgent } from "./wildfireRisk";
import { waterStressAgent } from "./waterStress";
import { wasteIntelligenceAgent } from "./wasteIntelligence";
import { greenRouteAgent } from "./greenRoute";
import type { DomainAgentId, DomainAgentDef } from "./base";

/** Registry of domain agents — add new agents here and to routing (orchestrator). */
export const domainAgents: Record<DomainAgentId, DomainAgentDef> = {
  "air-quality": airQualityAgent,
  "pollution-analysis": pollutionAnalysisAgent,
  weather: weatherAgent,
  "heat-risk": heatRiskAgent,
  "flood-risk": floodRiskAgent,
  "wildfire-risk": wildfireRiskAgent,
  "water-stress": waterStressAgent,
  "waste-intelligence": wasteIntelligenceAgent,
  "green-route": greenRouteAgent,
};

export const AGENT_NAMES: Record<DomainAgentId, string> = Object.fromEntries(
  Object.entries(domainAgents).map(([id, def]) => [id, def.name]),
) as Record<DomainAgentId, string>;
