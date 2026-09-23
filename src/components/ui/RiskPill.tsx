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
      ? "px-3 py-1.5 text-sm"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[11px]"
        : "px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-medium capitalize ${sizeClass} ${meta.pillClass} ${className}`}
      aria-label={`Risk level: ${meta.label}`}
    >
      <Icon className={size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5"} aria-hidden />
      {meta.label}
    </span>
  );
}
