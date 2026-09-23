import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { DataState } from "../../../shared/types";
import { DataStateBadge } from "./DataStateBadge";

export function StatTile({
  label,
  value,
  unit,
  sub,
  icon: Icon,
  dataState,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  icon?: LucideIcon;
  dataState?: DataState;
  className?: string;
}) {
  return (
    <div className={`px-5 py-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-ink-3 tracking-wide uppercase">{label}</p>
        {dataState ? <DataStateBadge state={dataState} /> : null}
      </div>
      <div className="mt-2 flex items-end gap-2">
        {Icon ? <Icon className="w-4 h-4 text-ink-3 mb-1.5" aria-hidden /> : null}
        <p className="text-[26px] font-semibold text-ink tabular-nums leading-none tracking-[-0.02em]">
          {value}
          {unit ? <span className="ml-1 text-[13px] font-medium text-ink-3">{unit}</span> : null}
        </p>
      </div>
      {sub ? <div className="mt-1.5 text-xs text-ink-3">{sub}</div> : null}
    </div>
  );
}

/**
 * A single panel of related metrics divided by hairlines — used instead of
 * scattering every metric into its own card.
 */
export function MetricPanel({
  children,
  className = "",
  columns = "grid-cols-2 sm:grid-cols-4",
}: {
  children: ReactNode;
  className?: string;
  columns?: string;
}) {
  return (
    <div
      className={`bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(26,29,26,0.03)] overflow-hidden ${className}`}
    >
      <div className={`grid divide-y sm:divide-y-0 sm:divide-x divide-line ${columns}`}>
        {children}
      </div>
    </div>
  );
}
