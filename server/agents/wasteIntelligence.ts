import type { AgentResult } from "../../shared/types";
import { classifyWasteWithImage, classifyWaste } from "../tools/wasteClassifier";
import { geminiConfigured } from "../config/env";
import { generateValidatedJsonWithImage } from "../tools/gemini";
import { type DomainAgentDef } from "./base";

export const wasteIntelligenceAgent: DomainAgentDef = {
  name: "Waste Intelligence (WasteWise)",
  async run(ctx): Promise<AgentResult> {
    const extra = ctx.extra;
    if (!extra || extra.kind !== "waste") {
      return {
        status: "unavailable",
        riskLevel: "unknown",
        confidence: 0,
        summary: "No waste sample or image was provided for classification.",
        factors: [],
        evidence: [],
        recommendations: [],
        dataSources: ["WasteWise"],
        limitations: ["Provide an image or pick a demo sample first."],
      };
    }

    const classification = extra.dataUrl
      ? await classifyWasteWithImage({
          dataUrl: extra.dataUrl,
          fileName: extra.fileName,
          generateJsonWithImage: generateValidatedJsonWithImage,
          geminiConfigured,
        })
      : await classifyWaste({
          sampleId: extra.sampleId,
          fileName: extra.fileName,
          geminiConfigured,
        });

    if (ctx.flags) {
      ctx.flags.usedGemini = classification.usedGemini;
      ctx.flags.classification = classification;
    }

    const riskLevel: AgentResult["riskLevel"] =
      classification.category === "hazardous"
        ? "high"
        : classification.category === "e-waste"
          ? "moderate"
          : classification.category === "unknown"
            ? "unknown"
            : "low";

    return {
      status: classification.category === "unknown" && classification.confidence === 0 ? "unavailable" : "success",
      riskLevel,
      confidence: classification.confidence,
      summary: `${classification.isDemo ? "Demo classification" : "AI classification"}: ${classification.label} (${Math.round(
        classification.confidence * 100,
      )}% confidence).`,
      factors: [
        classification.category === "hazardous"
          ? "Hazardous category — cautious handling guidance applied by default."
          : `Category "${classification.label}" mapped to standard disposal guidance.`,
      ],
      evidence: [
        `Source: ${classification.isDemo ? "demo fixture / deterministic demo match" : "Gemini vision classification"}.`,
        `Environmental note: ${classification.environmentalImpact}`,
      ],
      recommendations: classification.disposalGuidance,
      dataSources: [
        classification.usedGemini
          ? `Gemini vision (${classification.isDemo ? "Demo" : "Live"})`
          : "Demo Data — Waste Classification Fixtures",
      ],
      limitations: classification.limitations,
    };
  },
};
