import type { LucideIcon } from "lucide-react";
import {
  CircleHelp,
  Flame,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import type { RiskLevel } from "../../shared/types";

export interface RiskMeta {
  label: string;
  /** Full pill styling (background, text, border) for badges. */
  pillClass: string;
  /** Inline text color for risk words in headlines. */
  textClass: string;
  /** Soft background for risk-tinted panels. */
  softClass: string;
  dotClass: string;
  icon: LucideIcon;
  barClass: string;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  low: {
    label: "Low",
    pillClass: "bg-accent-soft text-accent-2 border-accent-line",
    textClass: "text-accent",
    softClass: "bg-accent-soft",
    dotClass: "bg-accent",
    icon: ShieldCheck,
    barClass: "bg-accent",
  },
  moderate: {
    label: "Moderate",
    pillClass: "bg-ochre-soft text-ochre-2 border-ochre-line",
    textClass: "text-ochre",
    softClass: "bg-ochre-soft",
    dotClass: "bg-ochre",
    icon: TriangleAlert,
    barClass: "bg-ochre",
  },
  high: {
    label: "High",
    pillClass: "bg-danger-soft text-danger-2 border-danger-line",
    textClass: "text-danger",
    softClass: "bg-danger-soft",
    dotClass: "bg-danger",
    icon: ShieldAlert,
    barClass: "bg-danger",
  },
  severe: {
    label: "Severe",
    pillClass: "bg-critical-soft text-critical border-critical-line",
    textClass: "text-critical",
    softClass: "bg-critical-soft",
    dotClass: "bg-critical",
    icon: Flame,
    barClass: "bg-critical",
  },
  unknown: {
    label: "Unknown",
    pillClass: "bg-surface-2 text-ink-3 border-line",
    textClass: "text-ink-3",
    softClass: "bg-surface-2",
    dotClass: "bg-ink-3",
    icon: CircleHelp,
    barClass: "bg-ink-3",
  },
};
