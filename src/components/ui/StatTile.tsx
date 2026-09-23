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
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {dataState ? <DataStateBadge state={dataState} /> : null}
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        {Icon ? <Icon className="w-5 h-5 text-slate-400 mb-1" aria-hidden /> : null}
        <p className="text-2xl font-semibold text-slate-900 tabular-nums leading-none">
          {value}
          {unit ? <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span> : null}
        </p>
      </div>
      {sub ? <div className="mt-2 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}
