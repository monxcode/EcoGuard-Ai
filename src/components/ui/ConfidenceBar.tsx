import { formatPercent } from "../../utils/format";

export function ConfidenceBar({
  value,
  className = "",
  compact = false,
}: {
  value: number;
  className?: string;
  compact?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = pct >= 75 ? "bg-accent" : pct >= 50 ? "bg-ochre" : "bg-ink-3";
  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence ${pct} percent`}
      >
        <div className="h-1 w-16 bg-line rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-ink-3 tabular-nums">{formatPercent(value)}</span>
      </div>
    );
  }
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] text-ink-3 mb-1.5">
        <span className="font-medium">Confidence</span>
        <span className="text-ink font-medium tabular-nums">{formatPercent(value)}</span>
      </div>
      <div
        className="h-1 w-full bg-line rounded-full overflow-hidden"
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
