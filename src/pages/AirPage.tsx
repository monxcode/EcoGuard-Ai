import { useState } from "react";
import { Brain, Database, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { api, ApiClientError } from "../services/api";
import type { AirPayload, PollutionAnalysisPayload } from "../../shared/types";
import { aqiCategory } from "../../shared/aqi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { EmptyState, ErrorState, InlineError, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { AqiPmTrendChart, DailyAqiBarChart, PollutantRatioChart } from "../components/charts/Charts";

function ratioBarPct(ratio: number): number {
  return Math.min(100, Math.round((ratio / 2) * 100));
}

export default function AirPage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<AirPayload>(
    `/api/air?locationId=${settings.locationId}`,
  );
  const [analysis, setAnalysis] = useState<PollutionAnalysisPayload | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await api.getAirAnalysis(settings.locationId);
      setAnalysis(result);
    } catch (err) {
      setAnalysisError(
        err instanceof ApiClientError ? err.message : "Failed to run pollution analysis.",
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No air-quality data returned." onRetry={reload} />;

  const air = data.air;
  const category = air ? aqiCategory(air.aqi) : null;
  const trend =
    data.hourly.length >= 2 ? data.hourly[data.hourly.length - 1].aqi - data.hourly[0].aqi : 0;
  const trendLabel = trend >= 8 ? "rising" : trend <= -8 ? "falling" : "stable";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Air Quality Intelligence"
        subtitle={`${data.location.name} — ${data.location.region}`}
        actions={
          <div className="flex items-center gap-2">
            <DataStateBadge state={data.states.air} />
            <RiskPill level={data.agentRun.result.riskLevel} size="lg" />
          </div>
        }
      />

      {/* AQI hero + pollutant tiles */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current AQI (US scale)</p>
          {air && category ? (
            <>
              <p className="mt-2 text-6xl font-semibold tabular-nums text-slate-900 leading-none">
                {air.aqi}
              </p>
              <p className="mt-3 text-base font-medium text-slate-800">{category.label}</p>
              <p className="mt-1 text-sm text-slate-500">
                24-hour trend: {trendLabel} ({trend > 0 ? "+" : ""}
                {trend} points)
              </p>
              <div className="mt-3">
                <RiskPill level={category.risk} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Air-quality data unavailable.</p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Pollutants vs health guidelines" subtitle="Ratio to the relevant guideline reference" />
          <CardBody className="grid gap-3 sm:grid-cols-2 pt-2">
            {data.pollutants.map((p) => (
              <div key={p.key} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{p.label}</p>
                  <p className="text-lg font-semibold tabular-nums text-slate-900">
                    {p.key === "co" ? p.value.toFixed(1) : Math.round(p.value)}
                    <span className="ml-1 text-xs font-normal text-slate-500">{p.unit}</span>
                  </p>
                </div>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.ratio > 2 ? "bg-red-500" : p.ratio > 1 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${ratioBarPct(p.ratio)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {p.ratio.toFixed(1)}× {p.guidelineLabel}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="PM2.5 / PM10 trend (24h)"
            action={<DataStateBadge state={data.states.airTrend} />}
          />
          <CardBody className="pt-2">
            <AqiPmTrendChart data={data.hourly} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="AQI outlook (7 days)"
            action={<DataStateBadge state={data.states.forecast} />}
          />
          <CardBody className="pt-2">
            <DailyAqiBarChart data={data.daily} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pollutant comparison" subtitle="Each pollutant as a multiple of its guideline" />
          <CardBody className="pt-2">
            <PollutantRatioChart
              data={data.pollutants.map((p) => ({ label: p.label, ratio: p.ratio }))}
            />
          </CardBody>
        </Card>

        {/* Why is AQI changing? */}
        <Card>
          <CardHeader
            title="Why is AQI changing?"
            subtitle="Pollution Source Detective — observed data vs AI interpretation"
            action={
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analysisLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg"
              >
                {analysisLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="w-4 h-4" aria-hidden />
                )}
                {analysis ? "Re-run analysis" : "Run analysis"}
              </button>
            }
          />
          <CardBody className="pt-2 space-y-4">
            {analysisLoading && !analysis ? (
              <LoadingAnalysis />
            ) : analysisError ? (
              <InlineError message={analysisError} />
            ) : !analysis ? (
              <EmptyState
                title="Analysis not run yet"
                description="Run the analysis to see possible contributing factors to the observed AQI change — strictly hedged, evidence-linked interpretation."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 text-[11px] font-medium border border-slate-300 bg-white text-slate-600 rounded-full">
                    Observed data
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-medium border border-violet-200 bg-violet-50 text-violet-700 rounded-full">
                    AI interpretation {analysis.usedGemini ? "(Gemini)" : "(rules-based)"}
                  </span>
                  <span className="text-[11px] text-slate-400">hedged language only</span>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    <Database className="w-3.5 h-3.5" aria-hidden />
                    Observed data
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                    {analysis.observed.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                    <Brain className="w-3.5 h-3.5" aria-hidden />
                    Interpretation (possible contributors — not confirmed causes)
                  </h3>
                  <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                    {analysis.interpretation.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <ConfidenceBar value={analysis.confidence} />

                <div className="flex flex-wrap gap-1.5">
                  {analysis.dataSources.map((s) => (
                    <span key={s} className="px-2 py-0.5 text-[11px] bg-slate-100 border border-slate-200 rounded text-slate-600">
                      {s}
                    </span>
                  ))}
                </div>

                <details className="group">
                  <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500">
                    <TriangleAlert className="w-3.5 h-3.5" aria-hidden />
                    Limitations ({analysis.limitations.length})
                  </summary>
                  <ul className="mt-2 text-xs text-slate-600 list-disc pl-4 space-y-1">
                    {analysis.limitations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Full agent result */}
      <AgentResultCard run={data.agentRun} />
    </div>
  );
}

function LoadingAnalysis() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 py-4" role="status">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      Running pollution analysis…
    </div>
  );
}
