import { ChevronDown, Database, Lightbulb, ListChecks, TriangleAlert } from "lucide-react";
import type { AgentRun } from "../../../shared/types";
import { Card, CardHeader } from "../ui/Card";
import { ConfidenceBar } from "../ui/ConfidenceBar";
import { RiskPill } from "../ui/RiskPill";

function BulletList({ items, icon: Icon, tone }: { items: string[]; icon: typeof Database; tone: string }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-700">
          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} aria-hidden />
          <span>{item}</span>
        </li>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              <Lightbulb className="w-3.5 h-3.5" aria-hidden />
              Factors (hedged)
            </h3>
            <BulletList items={result.factors} icon={Lightbulb} tone="text-amber-500" />
            {result.factors.length === 0 ? (
              <p className="text-xs text-slate-400">No factors reported.</p>
            ) : null}
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
              <Database className="w-3.5 h-3.5" aria-hidden />
              Evidence (observed data)
            </h3>
            <BulletList items={result.evidence} icon={Database} tone="text-slate-400" />
            {result.evidence.length === 0 ? (
              <p className="text-xs text-slate-400">No evidence available.</p>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            <ListChecks className="w-3.5 h-3.5" aria-hidden />
            Recommendations
          </h3>
          <BulletList items={result.recommendations} icon={ListChecks} tone="text-emerald-600" />
          {result.recommendations.length === 0 ? (
            <p className="text-xs text-slate-400">No recommendations.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {result.dataSources.map((source) => (
            <span
              key={source}
              className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 rounded"
            >
              {source}
            </span>
          ))}
        </div>

        <details className="group" open={defaultOpenLimitations}>
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" aria-hidden />
            Limitations ({result.limitations.length})
          </summary>
          <div className="mt-2 flex gap-2">
            <TriangleAlert className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden />
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
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{run.agentName}</p>
        <p className="mt-1 text-sm text-slate-700 line-clamp-2">{run.result.summary}</p>
      </div>
      <RiskPill level={run.result.riskLevel} size="sm" />
    </div>
  );
}
