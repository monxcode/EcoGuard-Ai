import { ChevronDown } from "lucide-react";
import type { AgentRun } from "../../../shared/types";
import { Card, CardHeader } from "../ui/Card";
import { ConfidenceBar } from "../ui/ConfidenceBar";
import { RiskPill } from "../ui/RiskPill";
import { Chip } from "../ui/Button";

function BulletList({ items, tone = "accent" }: { items: string[]; tone?: "accent" | "plain" }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-[13px] text-ink-2 leading-relaxed">
          <span
            className={`mt-[7px] w-1 h-1 rounded-full shrink-0 ${
              tone === "accent" ? "bg-accent" : "bg-ink-3"
            }`}
            aria-hidden
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ColumnLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2">
      {children}
    </p>
  );
}

export function AgentResultCard({
  run,
  defaultOpenLimitations = false,
}: {
  run: AgentRun;
  defaultOpenLimitations?: boolean;
}) {
  const { result } = run;
  const unavailable = result.status !== "success";

  return (
    <Card as="article">
      <CardHeader
        title={run.agentName}
        action={<RiskPill level={result.riskLevel} />}
        subtitle={
          result.status === "unavailable"
            ? "Data unavailable for this assessment"
            : result.status === "error"
              ? "Agent error"
              : undefined
        }
      />
      <div className="px-5 pb-5 -mt-1 space-y-4">
        <p className="text-[14px] text-ink-2 leading-relaxed">{result.summary}</p>

        {!unavailable ? <ConfidenceBar value={result.confidence} /> : null}

        <div>
          <ColumnLabel>Recommended</ColumnLabel>
          {result.recommendations.length > 0 ? (
            <BulletList items={result.recommendations} />
          ) : (
            <p className="text-[13px] text-ink-3">No recommendations.</p>
          )}
        </div>

        <details className="group border-t border-line-2 pt-3">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
            <span>View analysis</span>
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-ink-3"
              aria-hidden
            />
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <ColumnLabel>Possible factors</ColumnLabel>
              <BulletList items={result.factors} tone="plain" />
              {result.factors.length === 0 ? (
                <p className="text-xs text-ink-3">No factors reported.</p>
              ) : null}
            </div>
            <div>
              <ColumnLabel>Observed evidence</ColumnLabel>
              <BulletList items={result.evidence} tone="plain" />
              {result.evidence.length === 0 ? (
                <p className="text-xs text-ink-3">No evidence available.</p>
              ) : null}
            </div>
          </div>
        </details>

        <details className="group border-t border-line-2 pt-3" open={defaultOpenLimitations}>
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
            <span>Sources &amp; limitations ({result.limitations.length})</span>
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-ink-3"
              aria-hidden
            />
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {result.dataSources.map((source) => (
                <Chip key={source}>{source}</Chip>
              ))}
            </div>
            <ul className="space-y-1 text-xs text-ink-3 list-disc pl-4">
              {result.limitations.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
              {result.limitations.length === 0 ? <li>None declared.</li> : null}
            </ul>
          </div>
        </details>
      </div>
    </Card>
  );
}

export function CompactAgentSummary({ run }: { run: AgentRun }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm text-ink-2 line-clamp-3">{run.result.summary}</p>
      <RiskPill level={run.result.riskLevel} size="sm" />
    </div>
  );
}
