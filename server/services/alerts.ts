import type { AgentRun, AgentResult, AlertItem, RiskLevel } from "../../shared/types";

const SEVERITY_THRESHOLD: Record<RiskLevel, number> = {
  unknown: -1,
  low: 0,
  moderate: 1,
  high: 2,
  severe: 3,
};

/** Build in-app alerts from agent runs at or above the given severity. */
export function buildAlerts(
  runs: AgentRun[],
  options: { minSeverity?: RiskLevel; createdAt?: string } = {},
): AlertItem[] {
  const min = options.minSeverity ?? "high";
  const createdAt = options.createdAt ?? new Date().toISOString();
  const alerts: AlertItem[] = [];
  for (const run of runs) {
    if (run.result.status !== "success") continue;
    if (SEVERITY_THRESHOLD[run.result.riskLevel] < SEVERITY_THRESHOLD[min]) continue;
    alerts.push({
      id: `${run.agentId}-${run.result.riskLevel}`,
      title: `${run.agentName}: ${run.result.riskLevel} risk`,
      severity: run.result.riskLevel,
      message: run.result.summary,
      agentName: run.agentName,
      createdAt,
    });
  }
  return alerts;
}

export function overallFromRuns(runs: AgentRun[]): AgentResult | null {
  const analyst = runs.find((r) => r.agentId === "risk-analyst");
  return analyst?.result ?? null;
}
