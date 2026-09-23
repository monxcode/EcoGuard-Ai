import { formatPercent } from "../../utils/format";

export function ConfidenceBar({ value, className = "" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tone = pct >= 75 ? "bg-[#2D7A54]" : pct >= 50 ? "bg-[#D97706]" : "bg-[#888888]";
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] text-[#666666] mb-1.5 uppercase tracking-[0.05em] font-medium">
        <span>Confidence</span>
        <span className="text-[#111111]">{formatPercent(value)}</span>
      </div>
      <div
        className="h-1 w-full bg-[#F0F0F0] rounded-full overflow-hidden"
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
