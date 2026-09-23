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
  pillClass: string;
  dotClass: string;
  icon: LucideIcon;
  barClass: string;
}

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  low: {
    label: "Low",
    pillClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
    icon: ShieldCheck,
    barClass: "bg-emerald-500",
  },
  moderate: {
    label: "Moderate",
    pillClass: "bg-amber-50 text-amber-900 border-amber-200",
    dotClass: "bg-amber-500",
    icon: TriangleAlert,
    barClass: "bg-amber-500",
  },
  high: {
    label: "High",
    pillClass: "bg-orange-50 text-orange-900 border-orange-300",
    dotClass: "bg-orange-500",
    icon: ShieldAlert,
    barClass: "bg-orange-500",
  },
  severe: {
    label: "Severe",
    pillClass: "bg-red-50 text-red-900 border-red-300",
    dotClass: "bg-red-600",
    icon: Flame,
    barClass: "bg-red-600",
  },
  unknown: {
    label: "Unknown",
    pillClass: "bg-slate-100 text-slate-600 border-slate-300",
    dotClass: "bg-slate-400",
    icon: CircleHelp,
    barClass: "bg-slate-400",
  },
};
