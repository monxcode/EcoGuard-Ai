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
    <div className={`bg-white border border-[#EAEAEA] rounded-[14px] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.04em] font-semibold text-[#666666]">{label}</p>
        {dataState ? <DataStateBadge state={dataState} /> : null}
      </div>
      <div className="mt-3 flex items-end gap-2">
        {Icon ? <Icon className="w-5 h-5 text-[#888888] mb-1" aria-hidden /> : null}
        <p className="text-3xl font-semibold text-[#111111] tabular-nums leading-none tracking-tight">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-[#888888]">{unit}</span> : null}
        </p>
      </div>
      {sub ? <div className="mt-2.5 text-xs text-[#888888] font-medium">{sub}</div> : null}
    </div>
  );
}
