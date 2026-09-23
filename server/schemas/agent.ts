import { z } from "zod";
import type { AgentResult } from "../../shared/types";

const riskLevelSchema = z.enum(["low", "moderate", "high", "severe", "unknown"]);
const agentStatusSchema = z.enum(["success", "unavailable", "error"]);

export const agentResultSchema: z.ZodType<AgentResult> = z.object({
  status: agentStatusSchema,
  riskLevel: riskLevelSchema,
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(2000),
  factors: z.array(z.string()).max(20),
  evidence: z.array(z.string()).max(30),
  recommendations: z.array(z.string()).max(20),
  dataSources: z.array(z.string()).max(20),
  limitations: z.array(z.string()).max(20),
});

/**
 * Validate an agent result before it reaches any API consumer.
 * Throws ZodError on malformed output (caught by route validation handling).
 */
export function parseAgentResult(value: unknown): AgentResult {
  return agentResultSchema.parse(value);
}

export function safeParseAgentResult(value: unknown): {
  success: boolean;
  data?: AgentResult;
  error?: string;
} {
  const parsed = agentResultSchema.safeParse(value);
  if (parsed.success) return { success: true, data: parsed.data };
  return {
    success: false,
    error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  };
}
