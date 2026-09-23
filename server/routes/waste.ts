import { Router } from "express";
import { asyncRoute } from "../middleware/errorHandler";
import { wasteClassifySchema } from "../schemas/api";
import type { WasteClassification } from "../../shared/types";
import { loadEnvironmentalData } from "../tools/providers";
import { findLocation } from "../../shared/locations";
import { runAgents } from "../agents/orchestrator";
import type { AgentRunFlags } from "../agents/base";

export const wasteRouter = Router();

wasteRouter.post(
  "/waste/classify",
  asyncRoute(async (req, res) => {
    const parsed = wasteClassifySchema.parse(req.body ?? {});
    if (parsed.dataUrl && !/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(parsed.dataUrl)) {
      res.status(400).json({
        error: { code: "bad_request", message: "Only png, jpeg, webp or gif images are supported." },
      });
      return;
    }

    const data = await loadEnvironmentalData(findLocation(undefined));
    const flags: AgentRunFlags = { usedGemini: false };
    const [agentRun] = await runAgents(["waste-intelligence"], data, {
      extra: {
        kind: "waste",
        sampleId: parsed.sampleId,
        fileName: parsed.fileName,
        dataUrl: parsed.dataUrl,
      },
      flags,
    });

    const c = flags.classification;
    const payload: WasteClassification = c
      ? { ...c, agentRun }
      : {
          category: "unknown",
          label: "Unclassified",
          confidence: 0,
          disposalGuidance: agentRun.result.recommendations,
          environmentalImpact: "No environmental impact assessment — classification unavailable.",
          isDemo: true,
          usedGemini: false,
          limitations: agentRun.result.limitations,
          agentRun,
        };
    res.json(payload);
  }),
);
