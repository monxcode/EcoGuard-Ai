import type {
  AgentResult,
  AgentRun,
  AdvisoryPayload,
  AlertItem,
  AppLocation,
  EnvironmentalData,
} from "../../shared/types";
import { findLocation } from "../../shared/locations";
import { loadEnvironmentalData } from "../tools/providers";
import { buildAlerts } from "../services/alerts";
import { safeParseAgentResult } from "../schemas/agent";
import { runRiskAnalyst } from "./riskAnalyst";
import { runAdvisory } from "./advisory";
import { domainAgents } from "./registry";
import type { AgentContext, AgentExtra, AgentRunFlags, DomainAgentId } from "./base";

export type Intent =
  | "running"
  | "pollution"
  | "flood"
  | "wildfire"
  | "water"
  | "heat"
  | "report"
  | "city-risk"
  | "general";

/** Deterministic keyword routing — exported for tests. Order matters: first match wins. */
const INTENT_RULES: Array<[Intent, RegExp]> = [
  ["running", /\b(run|running|jog|jogging|exercise|workout|outside|outdoor|walk the dog|picnic)\b/],
  ["pollution", /\b(pollution|pollutant|smog|why is (the )?aqi|aqi\s*(is\s*)?(rising|increasing|high|changing|worse)|getting worse|air quality (is )?(bad|worse|poor))\b/],
  ["flood", /\b(flood|flooding|rainfall|waterlog|inundat|heavy rain)\b/],
  ["wildfire", /\b(wildfire|wild fire|forest fire|fire risk|bushfire|smoke)\b/],
  ["water", /\b(water (stress|scarcity|supply|shortage|level)|drought|reservoir)\b/],
  ["heat", /\b(heat|heatwave|hot|temperature|warm|sun)\b/],
  ["report", /\b(report|full assessment|comprehensive|overall summary)\b/],
  ["city-risk", /\b(risk|risks|safe|danger|overall|city|environment|environmental|condition|today|assessment|watch)\b/],
];

export function classifyIntent(query: string): Intent {
  const q = query.toLowerCase();
  for (const [intent, pattern] of INTENT_RULES) {
    if (pattern.test(q)) return intent;
  }
  return "general";
}

/** Which domain agents each intent invokes — must stay selective (AGENTS.md). */
const ROUTING: Record<Intent, DomainAgentId[]> = {
  running: ["air-quality", "weather", "heat-risk"],
  pollution: ["air-quality", "weather", "pollution-analysis"],
  flood: ["weather", "flood-risk"],
  wildfire: ["weather", "wildfire-risk"],
  water: ["weather", "water-stress"],
  heat: ["weather", "heat-risk"],
  report: ["air-quality", "weather", "heat-risk", "flood-risk", "wildfire-risk", "water-stress"],
  "city-risk": ["air-quality", "heat-risk", "flood-risk", "wildfire-risk", "water-stress"],
  general: ["air-quality", "weather", "heat-risk"],
};

export function routeForIntent(intent: Intent): DomainAgentId[] {
  return [...ROUTING[intent]];
}

function errorResult(message: string): AgentResult {
  return {
    status: "error",
    riskLevel: "unknown",
    confidence: 0,
    summary: "This agent failed to produce a valid assessment.",
    factors: [],
    evidence: [],
    recommendations: [],
    dataSources: [],
    limitations: [message],
  };
}

function validate(result: AgentResult, agentId: string): AgentResult {
  const parsed = safeParseAgentResult(result);
  if (parsed.success && parsed.data) return parsed.data;
  console.warn(`[ecoguard] invalid AgentResult from ${agentId}:`, parsed.error);
  return errorResult(parsed.error ?? "schema validation failed");
}

/**
 * Run a specific subset of domain agents against loaded environmental data —
 * used by page-specific endpoints that don't need the full orchestration flow.
 */
export async function runAgents(
  agentIds: DomainAgentId[],
  data: EnvironmentalData,
  options: { query?: string; extra?: AgentExtra; flags?: AgentRunFlags } = {},
): Promise<AgentRun[]> {
  return Promise.all(
    agentIds.map(async (agentId): Promise<AgentRun> => {
      const def = domainAgents[agentId];
      const ctx: AgentContext = {
        data,
        query: options.query,
        extra: options.extra,
        flags: options.flags,
      };
      try {
        const raw = await def.run(ctx);
        return { agentId, agentName: def.name, result: validate(raw, agentId) };
      } catch (err) {
        console.warn(`[ecoguard] agent ${agentId} threw:`, err);
        return {
          agentId,
          agentName: def.name,
          result: errorResult(err instanceof Error ? err.message : "unexpected agent error"),
        };
      }
    }),
  );
}

export interface OrchestrateOptions {
  locationId?: string;
  query?: string;
  intent?: Intent;
  extra?: AgentExtra;
}

export interface OrchestrateOutcome {
  intent: Intent;
  data: EnvironmentalData;
  domainRuns: AgentRun[];
  allRuns: AgentRun[];
  overallRun: AgentRun;
  advisory: AdvisoryPayload;
  alerts: AlertItem[];
}

/**
 * Environmental Orchestrator — loads shared data, routes to the relevant subset
 * of agents (in parallel), combines via Risk Analyst, phrases via Advisory.
 */
export async function orchestrate(options: OrchestrateOptions): Promise<OrchestrateOutcome> {
  const location: AppLocation = findLocation(options.locationId);
  const intent = options.intent ?? (options.query ? classifyIntent(options.query) : "general");
  const agentIds = routeForIntent(intent);
  const flags = { usedGemini: false };

  const data = await loadEnvironmentalData(location);
  const domainRuns = await runAgents(agentIds, data, {
    query: options.query,
    extra: options.extra,
    flags,
  });

  const overallRaw = runRiskAnalyst(domainRuns);
  const overallRun: AgentRun = {
    agentId: "risk-analyst",
    agentName: "Risk Analyst",
    result: validate(overallRaw, "risk-analyst"),
  };

  const advisory = await runAdvisory({
    locationName: location.name,
    overall: overallRun.result,
    domainRuns,
    query: options.query,
  });

  const alerts = buildAlerts([overallRun, ...domainRuns]);

  return {
    intent,
    data,
    domainRuns,
    allRuns: [...domainRuns, overallRun],
    overallRun,
    advisory,
    alerts,
  };
}
