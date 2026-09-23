import type {
  AgentRun,
  AdvisoryPayload,
  AgentResult,
} from "../../shared/types";
import { generateText } from "../tools/gemini";
import { cap } from "./base";

interface AdvisoryInput {
  locationName: string;
  overall: AgentResult;
  domainRuns: AgentRun[];
  query?: string;
}

function templateText(input: AdvisoryInput): string {
  const { locationName, overall, domainRuns, query } = input;
  const parts: string[] = [];
  if (query) {
    parts.push(`Regarding "${query.trim()}" in ${locationName}:`);
  } else {
    parts.push(`${locationName} environmental brief:`);
  }
  parts.push(overall.summary);

  const air = domainRuns.find((r) => r.agentId === "air-quality");
  if (air) parts.push(`Air quality: ${air.result.summary}`);
  const heat = domainRuns.find((r) => r.agentId === "heat-risk");
  if (heat) parts.push(`Heat: ${heat.result.summary}`);
  const flood = domainRuns.find((r) => r.agentId === "flood-risk");
  if (flood) parts.push(`Flood: ${flood.result.summary}`);
  const wildfire = domainRuns.find((r) => r.agentId === "wildfire-risk");
  if (wildfire) parts.push(`Fire weather: ${wildfire.result.summary}`);
  const water = domainRuns.find((r) => r.agentId === "water-stress");
  if (water) parts.push(`Water: ${water.result.summary}`);

  const recs = cap(domainRuns.flatMap((r) => r.result.recommendations), 2);
  if (recs.length > 0) parts.push(`Recommended: ${recs.join(" ")}`);

  parts.push("Interpretation is generated from the data shown — not an official advisory.");
  return parts.join(" ");
}

/**
 * Environmental Advisory Agent — turns structured results into the final
 * user-facing prose. Uses Gemini when configured, deterministic template otherwise.
 */
export async function runAdvisory(input: AdvisoryInput): Promise<AdvisoryPayload> {
  const agentsUsed = ["Risk Analyst", ...input.domainRuns.map((r) => r.agentName)];
  const facts = [
    `Location: ${input.locationName}`,
    `Overall: ${input.overall.riskLevel} (confidence ${input.overall.confidence}) — ${input.overall.summary}`,
    ...input.domainRuns.map((r) => `${r.agentName}: ${r.result.riskLevel} — ${r.result.summary}`),
    `Top evidence: ${cap(input.overall.evidence, 3).join(" | ")}`,
    `Recommendations: ${cap(input.overall.recommendations, 3).join(" | ")}`,
  ];

  const ai = await generateText(
    [
      "You are the Environmental Advisory agent of EcoGuard AI.",
      "Write a concise, friendly 3-6 sentence briefing for a general audience.",
      "Rules: be factual and cautious; use hedged language for causes (possible contributor,",
      "observed alongside); never invent data; never claim official status; never mention",
      "chain-of-thought. Only use the facts provided.",
      "",
      input.query ? `User question: ${input.query}` : "Context: dashboard briefing request.",
      ...facts,
    ].join("\n"),
  );

  const template = templateText(input);
  const text = ai && ai.text.length >= 40 ? ai.text.slice(0, 1200) : template;

  const limitations = [
    ai && ai.text.length >= 40
      ? "AI-generated interpretation of the data shown — not an official government or agency advisory."
      : "Rules-based interpretation of the data shown (Gemini not configured) — not an official advisory.",
    ...cap(input.overall.limitations, 2),
  ];

  return {
    text,
    agentsUsed,
    isAiInterpretation: true,
    usedGemini: Boolean(ai && ai.text.length >= 40),
    limitations,
  };
}
