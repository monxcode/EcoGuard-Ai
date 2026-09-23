import type { DataState } from "../../../shared/types";
import { DATA_STATE_META } from "../../utils/dataState";

export function DataStateBadge({ state, className = "" }: { state: DataState; className?: string }) {
  const meta = DATA_STATE_META[state];
  return (
    <span
      title={meta.title}
      className={`inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-medium border rounded-full ${meta.className} ${className}`}
    >
      {state === "live" ? <span className="w-1 h-1 rounded-full bg-emerald-500" aria-hidden /> : null}
      {meta.label}
    </span>
  );
}
