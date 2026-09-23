import type { DataState } from "../../../shared/types";
import { DATA_STATE_META } from "../../utils/dataState";

export function DataStateBadge({ state, className = "" }: { state: DataState; className?: string }) {
  const meta = DATA_STATE_META[state];
  return (
    <span
      title={meta.title}
      className={`inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.05em] border rounded-full whitespace-nowrap ${meta.className} ${className}`}
    >
      {state === "live" ? (
        <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
      ) : null}
      {meta.label}
    </span>
  );
}
