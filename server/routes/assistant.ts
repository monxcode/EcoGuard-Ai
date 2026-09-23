import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { assistantAskSchema } from "../schemas/api";
import type { AssistantResponse } from "../../shared/types";
import { orchestrate } from "../agents/orchestrator";
import { cap } from "../agents/base";

export const assistantRouter = Router();

assistantRouter.post(
  "/assistant/ask",
  asyncRoute(async (req, res) => {
    const { message, locationId } = assistantAskSchema.parse(req.body);
    const outcome = await orchestrate({ locationId, query: message });

    const payload: AssistantResponse = {
      reply: outcome.advisory.text,
      intent: outcome.intent,
      confidence: outcome.overallRun.result.confidence,
      agentsUsed: outcome.allRuns,
      evidence: cap(outcome.overallRun.result.evidence, 6),
      dataSources: cap(
        outcome.allRuns.flatMap((r) => r.result.dataSources),
        8,
      ),
      limitations: cap(
        [
          ...outcome.overallRun.result.limitations,
          ...outcome.domainRuns.flatMap((r) => r.result.limitations.slice(0, 1)),
        ],
        6,
      ),
      isAiInterpretation: outcome.advisory.isAiInterpretation,
      usedGemini: outcome.advisory.usedGemini,
      generatedAt: new Date().toISOString(),
    };
    res.json(payload);
  }),
);
