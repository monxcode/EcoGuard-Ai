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
    pillClass: "bg-[#F5F9F6] text-[#2D7A54] border-[#DFF0E6]",
    dotClass: "bg-[#2D7A54]",
    icon: ShieldCheck,
    barClass: "bg-[#2D7A54]",
  },
  moderate: {
    label: "Moderate",
    pillClass: "bg-[#FFF9F2] text-[#B76F1D] border-[#FDEBCE]",
    dotClass: "bg-[#D97706]",
    icon: TriangleAlert,
    barClass: "bg-[#D97706]",
  },
  high: {
    label: "High",
    pillClass: "bg-[#FFF4F2] text-[#C0492E] border-[#FCDED8]",
    dotClass: "bg-[#E5484D]",
    icon: ShieldAlert,
    barClass: "bg-[#E5484D]",
  },
  severe: {
    label: "Severe",
    pillClass: "bg-[#FAF0F3] text-[#A61C41] border-[#F2D1DC]",
    dotClass: "bg-[#CE2C31]",
    icon: Flame,
    barClass: "bg-[#CE2C31]",
  },
  unknown: {
    label: "Unknown",
    pillClass: "bg-[#FAFAFA] text-[#666666] border-[#EAEAEA]",
    dotClass: "bg-[#888888]",
    icon: CircleHelp,
    barClass: "bg-[#888888]",
  },
};
