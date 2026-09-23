import { formatPercent } from "../../utils/format";

export function ConfidenceBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Confidence</span>
        <span className="font-medium text-slate-700">{formatPercent(value)}</span>
      </div>
      <div
        className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence ${pct} percent`}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
