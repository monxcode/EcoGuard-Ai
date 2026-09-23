import type { RiskLevel } from "../../../shared/types";
import { RISK_META } from "../../utils/risk";

export function RiskPill({
  level,
  size = "md",
  className = "",
}: {
  level: RiskLevel;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const meta = RISK_META[level];
  const Icon = meta.icon;
  const sizeClass =
    size === "lg"
      ? "px-3 py-1.5 text-[13px] gap-1.5"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[11px] gap-1"
        : "px-2 py-1 text-xs gap-1";
  const iconSize = size === "lg" ? "w-4 h-4" : "w-3 h-3";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize border ${sizeClass} ${meta.pillClass} ${className}`}
      aria-label={`Risk level: ${meta.label}`}
    >
      <Icon className={iconSize} aria-hidden />
      {meta.label}
    </span>
  );
}
