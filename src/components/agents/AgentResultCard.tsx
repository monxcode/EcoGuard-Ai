import { ChevronDown } from "lucide-react";
import type { AgentRun } from "../../../shared/types";
import { Card, CardHeader } from "../ui/Card";
import { ConfidenceBar } from "../ui/ConfidenceBar";
import { RiskPill } from "../ui/RiskPill";

function BulletList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm text-slate-700 list-disc pl-4">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
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
      <div className="px-5 pb-5 pt-1 space-y-4">
        <p className="text-sm text-slate-700 leading-relaxed">{result.summary}</p>

        {!unavailable ? <ConfidenceBar value={result.confidence} /> : null}

        <div>
          <h3 className="text-xs font-semibold text-slate-500 mb-1.5">Recommended</h3>
          {result.recommendations.length > 0 ? (
            <BulletList items={result.recommendations} />
          ) : (
            <p className="text-xs text-slate-400">No recommendations.</p>
          )}
        </div>

        <details className="group border-t border-slate-100 pt-3">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-800">
            <span>View analysis</span>
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-xs font-medium text-slate-500 mb-1.5">Possible factors</h4>
              <BulletList items={result.factors} />
              {result.factors.length === 0 ? (
                <p className="text-xs text-slate-400">No factors reported.</p>
              ) : null}
            </div>
            <div>
              <h4 className="text-xs font-medium text-slate-500 mb-1.5">Observed evidence</h4>
              <BulletList items={result.evidence} />
              {result.evidence.length === 0 ? (
                <p className="text-xs text-slate-400">No evidence available.</p>
              ) : null}
            </div>
          </div>
        </details>

        <details className="group border-t border-slate-100 pt-3" open={defaultOpenLimitations}>
          <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-800">
            <span>Sources &amp; limitations ({result.limitations.length})</span>
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {result.dataSources.map((source) => (
                <span
                  key={source}
                  className="px-2 py-0.5 text-[11px] bg-slate-50 text-slate-500 border border-slate-200 rounded"
                >
                  {source}
                </span>
              ))}
            </div>
            <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
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
      <p className="text-sm text-slate-600 line-clamp-3">{run.result.summary}</p>
      <RiskPill level={run.result.riskLevel} size="sm" />
    </div>
  );
}
