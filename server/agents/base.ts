import type {
  AgentId,
  AgentResult,
  AgentRun,
  EnvironmentalData,
  RouteOption,
} from "../../shared/types";
import type { WasteClassificationOutput } from "../tools/wasteClassifier";

export type DomainAgentId = Exclude<AgentId, "orchestrator" | "risk-analyst" | "advisory">;

export type AgentExtra =
  | { kind: "waste"; sampleId?: string; fileName?: string; dataUrl?: string }
  | { kind: "route"; routes: RouteOption[] };

export interface AgentContext {
  data: EnvironmentalData;
  query?: string;
  extra?: AgentExtra;
  /** Mutable flags agents may set for payload metadata (e.g. usedGemini). */
  flags?: AgentRunFlags;
}

export interface AgentRunFlags {
  usedGemini: boolean;
  classification?: WasteClassificationOutput;
}

export interface DomainAgentDef {
  name: string;
  run: (ctx: AgentContext) => AgentResult | Promise<AgentResult>;
}

export function toRun(agentId: DomainAgentId, name: string, result: AgentResult): AgentRun {
  return { agentId, agentName: name, result };
}

export function cap<T>(items: T[], max: number): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    const key = typeof item === "string" ? item : item;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
