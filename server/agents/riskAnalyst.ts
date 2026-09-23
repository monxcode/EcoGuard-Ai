import type { AgentResult, RiskLevel, AgentRun } from "../../shared/types";
import { RISK_ORDER } from "../../shared/aqi";
import { cap } from "./base";

function worstOf(runs: AgentRun[]): RiskLevel {
  let worst: RiskLevel = "unknown";
  for (const run of runs) {
    if (RISK_ORDER[run.result.riskLevel] > RISK_ORDER[worst]) worst = run.result.riskLevel;
  }
  return worst;
}

/**
 * Risk Analyst Agent — combines domain AgentResults into one overall assessment
 * (this is where combined/cascading risk recognition lives).
 */
export function runRiskAnalyst(runs: AgentRun[]): AgentResult {
  const successful = runs.filter((r) => r.result.status === "success");
  if (successful.length === 0) {
    return {
      status: "unavailable",
      riskLevel: "unknown",
      confidence: 0,
      summary: "No domain assessments were available to combine.",
      factors: [],
      evidence: [],
      recommendations: [],
      dataSources: [],
      limitations: ["All contributing agents were unavailable for this request."],
    };
  }

  const overall = worstOf(successful);
  const elevated = successful.filter(
    (r) => r.result.riskLevel === "high" || r.result.riskLevel === "severe",
  );
  const confidence =
    Math.round(Math.min(...successful.map((r) => r.result.confidence)) * 0.95 * 100) / 100;

  const factors = successful.map(
    (r) => `${r.agentName}: ${r.result.riskLevel} — ${r.result.summary}`,
  );

  if (elevated.length >= 2) {
    factors.push(
      `Combined signal: ${elevated.length} domains show elevated risk simultaneously (${elevated
        .map((r) => r.agentName)
        .join(", ")}) — co-occurring factors can amplify each other's health and safety impacts.`,
    );
  }

  const evidence = cap(
    successful.flatMap((r) => r.result.evidence.slice(0, 2).map((e) => `[${r.agentName}] ${e}`)),
    8,
  );
  const recommendations = cap(successful.flatMap((r) => r.result.recommendations), 6);
  const dataSources = cap(
    successful.flatMap((r) => r.result.dataSources),
    8,
  );
  const limitations = cap(
    successful.flatMap((r) => r.result.limitations.slice(0, 1)),
    5,
  ).concat([
    "Overall risk is a screening combination of the contributing agent assessments, not an official index.",
  ]);

  const summary =
    elevated.length >= 2
      ? `Overall environmental risk is ${overall}, with ${elevated.length} domains elevated at once (${elevated
          .map((r) => r.agentName.replace(/\s*\(.*\)$/, ""))
          .join(", ")}). Conditions should be treated as a combined concern, not isolated issues.`
      : `Overall environmental risk is ${overall} across ${successful.length} assessed domain(s).`;

  return {
    status: "success",
    riskLevel: overall,
    confidence,
    summary,
    factors,
    evidence,
    recommendations,
    dataSources,
    limitations,
  };
}
