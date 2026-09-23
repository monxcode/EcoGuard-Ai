import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { reportCreateSchema } from "../schemas/api";
import type { EnvironmentalReport, ReportSection } from "../../shared/types";
import { cap } from "../agents/base";
import { orchestrate } from "../agents/orchestrator";
import type { AgentRun } from "../../shared/types";

export const reportsRouter = Router();

function sectionFromRuns(id: string, title: string, runs: AgentRun[]): ReportSection | null {
  if (runs.length === 0) return null;
  return {
    id,
    title,
    observed: cap(
      runs.flatMap((r) => r.result.evidence),
      6,
    ),
    interpretation: cap(
      runs.flatMap((r) => r.result.factors),
      5,
    ),
    recommendations: cap(
      runs.flatMap((r) => r.result.recommendations),
      4,
    ),
  };
}

reportsRouter.post(
  "/reports",
  asyncRoute(async (req, res) => {
    const { locationId, title, include } = reportCreateSchema.parse(req.body ?? {});
    const outcome = await orchestrate({ locationId, intent: "report" });
    const runs = outcome.domainRuns;
    const byId = (ids: string[]): AgentRun[] =>
      runs.filter((r) => ids.includes(r.agentId));

    const candidates: Array<ReportSection | null> = [
      {
        id: "summary",
        title: "Executive Summary",
        observed: cap(outcome.overallRun.result.evidence, 4),
        interpretation: [outcome.overallRun.result.summary, outcome.advisory.text],
        recommendations: cap(outcome.overallRun.result.recommendations, 3),
      },
      sectionFromRuns("air", "Air Quality", byId(["air-quality"])),
      sectionFromRuns("climate", "Climate & Heat", byId(["weather", "heat-risk"])),
      sectionFromRuns("disaster", "Disaster Risk", byId(["flood-risk", "wildfire-risk"])),
      sectionFromRuns("water", "Water Status", byId(["water-stress"])),
    ];

    const sections = candidates.filter((s): s is ReportSection => {
      if (!s) return false;
      if (include && include.length > 0) return include.includes(s.id);
      return true;
    });

    const report: EnvironmentalReport = {
      id: `rpt-${Date.now().toString(36)}`,
      title: title?.trim() || `Environmental Assessment — ${outcome.data.location.name}`,
      location: outcome.data.location,
      generatedAt: new Date().toISOString(),
      overallRisk: outcome.overallRun.result.riskLevel,
      isAiInterpretation: true,
      sections,
      keyFindings: cap(
        outcome.domainRuns.map((r) => `${r.agentName}: ${r.result.riskLevel} — ${r.result.summary}`),
        6,
      ),
      dataSources: cap(
        outcome.allRuns.flatMap((r) => r.result.dataSources),
        10,
      ),
      limitations: cap(
        outcome.allRuns.flatMap((r) => r.result.limitations),
        8,
      ),
      agentsUsed: outcome.allRuns.map((r) => r.agentName),
    };
    res.json(report);
  }),
);
