import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Loader2, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { api, ApiClientError } from "../services/api";
import type { AirPayload, PollutionAnalysisPayload } from "../../shared/types";
import { AQI_CATEGORIES, aqiCategory } from "../../shared/aqi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { Button, Chip } from "../components/ui/Button";
import { EmptyState, ErrorState, InlineError, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { AqiPmTrendChart, DailyAqiBarChart } from "../components/charts/Charts";
import { RISK_META } from "../utils/risk";

const BAND_COLORS: Record<string, string> = {
  low: "#2e6b4f",
  moderate: "#a96e15",
  high: "#bc4b32",
  severe: "#a32a31",
  unknown: "#9aa19b",
};

function AqiScale({ aqi }: { aqi: number }) {
  const idx = Math.max(
    0,
    AQI_CATEGORIES.findIndex((c) => aqi >= c.min && aqi <= c.max),
  );
  const cat = AQI_CATEGORIES[idx] ?? AQI_CATEGORIES[0];
  const frac = Math.min(1, Math.max(0, (aqi - cat.min) / Math.max(1, cat.max - cat.min)));
  const pos = Math.min(98, Math.max(2, ((idx + frac) / AQI_CATEGORIES.length) * 100));
  return (
    <div className="mt-4" aria-hidden>
      <div className="flex gap-[3px] h-[5px]">
        {AQI_CATEGORIES.map((c, i) => (
          <span
            key={c.label}
            className="flex-1 rounded-full"
            style={{ backgroundColor: BAND_COLORS[c.risk], opacity: i === idx ? 1 : 0.28 }}
          />
        ))}
      </div>
      <div className="relative h-0">
        <span
          className="absolute -top-[3.5px] w-2.5 h-2.5 rounded-full bg-ink ring-2 ring-white shadow-sm"
          style={{ left: `calc(${pos}% - 5px)` }}
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
}) {
  return (
    <div className="p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <p className="mt-1.5 text-[22px] font-semibold text-ink tabular-nums tracking-[-0.02em] leading-none">
        {value}
      </p>
      {sub ? <div className="mt-1.5 text-[11px] text-ink-3">{sub}</div> : null}
    </div>
  );
}

export default function AirPage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<AirPayload>(
    `/api/air?locationId=${settings.locationId}`,
  );
  const [analysis, setAnalysis] = useState<PollutionAnalysisPayload | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const locIdRef = useRef(settings.locationId);

  useEffect(() => {
    if (locIdRef.current === settings.locationId) return;
    locIdRef.current = settings.locationId;
    setAnalysis(null);
    setAnalysisError(null);
    setAnalysisLoading(false);
  }, [settings.locationId]);

  const runAnalysis = async () => {
    const forLocation = settings.locationId;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await api.getAirAnalysis(forLocation);
      if (locIdRef.current !== forLocation) return;
      setAnalysis(result);
    } catch (err) {
      if (locIdRef.current !== forLocation) return;
      setAnalysisError(
        err instanceof ApiClientError ? err.message : "Failed to run pollution analysis.",
      );
    } finally {
      if (locIdRef.current === forLocation) setAnalysisLoading(false);
    }
  };

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No air-quality data returned." onRetry={reload} />;

  const air = data.air;
  const category = air ? aqiCategory(air.aqi) : null;
  const trend =
    data.hourly.length >= 2 ? data.hourly[data.hourly.length - 1].aqi - data.hourly[0].aqi : 0;
  const trendDir = trend >= 8 ? "rising" : trend <= -8 ? "falling" : "stable";
  const pollutants = data.pollutants.filter((p) => p.key !== "aqi");
  const primary = [...pollutants].sort((a, b) => b.ratio - a.ratio)[0];
  const pm25 = pollutants.find((p) => p.key === "pm25");
  const pm10 = pollutants.find((p) => p.key === "pm10");

  const ratioTone = (ratio: number) =>
    ratio > 2 ? "bg-danger" : ratio > 1 ? "bg-ochre" : "bg-accent";

  const trendChip =
    trendDir === "falling" ? (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-accent">
        <TrendingDown className="w-4 h-4" aria-hidden /> Falling {Math.abs(trend)} pts · 24h
      </span>
    ) : trendDir === "rising" ? (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-danger">
        <TrendingUp className="w-4 h-4" aria-hidden /> Rising {trend} pts · 24h
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-3">
        <Minus className="w-4 h-4" aria-hidden /> Stable · 24h
      </span>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Air Quality"
        subtitle={`${data.location.name}, ${data.location.region}`}
        actions={
          <div className="flex items-center gap-2">
            <DataStateBadge state={data.states.air} />
            <RiskPill level={data.agentRun.result.riskLevel} size="lg" />
          </div>
        }
      />

      {data.errors.length > 0 ? (
        <div className="rounded-lg bg-ochre-soft border border-ochre-line text-ochre-2 px-3.5 py-2.5 text-[13px] leading-relaxed">
          <ul className="list-disc pl-4">
            {data.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── AQI hero ──────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1.15fr_1.35fr] bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(26,29,26,0.03)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Air quality index · US scale
          </p>
          {air && category ? (
            <>
              <div className="mt-2.5 flex items-baseline gap-3">
                <span className="text-[60px] sm:text-[68px] font-semibold tracking-[-0.03em] text-ink tabular-nums leading-none">
                  {air.aqi}
                </span>
                <span className={`text-[16px] font-medium ${RISK_META[category.risk].textClass}`}>
                  {category.label}
                </span>
              </div>
              <AqiScale aqi={air.aqi} />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <RiskPill level={category.risk} />
                {trendChip}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-3">Air-quality data unavailable.</p>
          )}
        </div>
        <div className="border-t lg:border-t-0 lg:border-l border-line grid grid-cols-2 divide-y divide-x divide-line-2">
          <MetricCell
            label="PM2.5"
            value={air ? String(air.pm25) : "—"}
            sub={pm25 ? `${pm25.ratio.toFixed(1)}× ${pm25.guidelineLabel}` : "µg/m³"}
          />
          <MetricCell
            label="PM10"
            value={air ? String(air.pm10) : "—"}
            sub={pm10 ? `${pm10.ratio.toFixed(1)}× ${pm10.guidelineLabel}` : "µg/m³"}
          />
          <MetricCell
            label="Primary pollutant"
            value={primary ? primary.label : "—"}
            sub={primary ? `${primary.ratio.toFixed(1)}× guideline` : undefined}
          />
          <MetricCell
            label="7-day outlook"
            value={
              data.daily.filter((d) => d.aqi !== null).length > 0
                ? String(data.daily.filter((d) => d.aqi !== null)[0].aqi)
                : "—"
            }
            sub="next-day forecast AQI"
          />
        </div>
      </div>

      {/* ── Trends ────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="PM2.5 / PM10 · 24 hours"
            action={<DataStateBadge state={data.states.airTrend} />}
          />
          <CardBody className="pt-1">
            <AqiPmTrendChart data={data.hourly} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="AQI outlook · 7 days"
            action={<DataStateBadge state={data.states.forecast} />}
          />
          <CardBody className="pt-1">
            <DailyAqiBarChart data={data.daily} />
          </CardBody>
        </Card>
      </div>

      {/* ── Pollutants vs guidelines ──────────────────────── */}
      <Card>
        <CardHeader
          title="Pollutants vs health guidelines"
          subtitle="Measured concentration relative to the relevant guideline"
        />
        <div className="divide-y divide-line-2 border-t border-line-2">
          {pollutants.map((p) => (
            <div key={p.key} className="flex items-center gap-3 sm:gap-5 px-5 py-3.5">
              <div className="w-24 sm:w-36 shrink-0 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{p.label}</p>
                <p className="text-[11px] text-ink-3 truncate">{p.guidelineLabel}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="h-1.5 w-full bg-line rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${ratioTone(p.ratio)}`}
                    style={{ width: `${Math.min(100, (p.ratio / 2) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="w-20 sm:w-28 shrink-0 text-right">
                <span className="text-[14px] font-semibold text-ink tabular-nums">
                  {p.key === "co" ? p.value.toFixed(1) : Math.round(p.value)}
                </span>
                <span className="ml-1 text-[10px] text-ink-3">{p.unit}</span>
              </div>
              <div className="w-14 shrink-0 text-right hidden sm:block">
                <span
                  className={`text-[12px] font-medium tabular-nums ${
                    p.ratio > 2 ? "text-danger" : p.ratio > 1 ? "text-ochre" : "text-accent"
                  }`}
                >
                  {p.ratio.toFixed(1)}×
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Health & exposure guidance ────────────────────── */}
      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent mb-1">
              Guidance
            </p>
            <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
              Health &amp; exposure assessment
            </h2>
          </div>
        </div>
        <AgentResultCard run={data.agentRun} />
      </div>

      {/* ── Why is AQI changing? ──────────────────────────── */}
      <Card>
        <CardHeader
          title="Why is AQI changing?"
          subtitle="Observed data vs AI interpretation"
          action={
            <Button variant="primary" size="sm" onClick={runAnalysis} disabled={analysisLoading}>
              {analysisLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
              )}
              {analysis ? "Re-run" : "Run analysis"}
            </Button>
          }
        />
        <CardBody className="pt-1 border-t border-line-2">
          {analysisLoading && !analysis ? (
            <div
              className="flex items-center gap-2 text-sm text-ink-3 py-6"
              role="status"
            >
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Running pollution analysis…
            </div>
          ) : analysisError ? (
            <div className="pt-4">
              <InlineError message={analysisError} />
            </div>
          ) : !analysis ? (
            <EmptyState
              icon={Sparkles}
              title="Analysis not run yet"
              description="Run the analysis to see possible contributing factors — hedged, evidence-linked interpretation."
            />
          ) : (
            <div className="pt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="neutral">Observed data</Chip>
                <Chip tone="blue">
                  AI interpretation {analysis.usedGemini ? "(Gemini)" : "(rules-based)"}
                </Chip>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-line bg-surface-2 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2.5">
                    Observed
                  </p>
                  <ul className="space-y-2">
                    {analysis.observed.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-[13px] text-ink-2 leading-relaxed"
                      >
                        <span
                          className="mt-[7px] w-1 h-1 rounded-full bg-ink-3 shrink-0"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-blue-line bg-blue-soft p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-2 mb-2.5">
                    Possible contributors — not confirmed causes
                  </p>
                  <ul className="space-y-2">
                    {analysis.interpretation.map((item, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-[13px] text-ink-2 leading-relaxed"
                      >
                        <span
                          className="mt-[7px] w-1 h-1 rounded-full bg-blue shrink-0"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <ConfidenceBar value={analysis.confidence} />

              <div className="flex flex-wrap gap-1.5">
                {analysis.dataSources.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>

              <details className="group border-t border-line-2 pt-3">
                <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
                  <span>Limitations ({analysis.limitations.length})</span>
                  <ChevronDown
                    className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-ink-3"
                    aria-hidden
                  />
                </summary>
                <ul className="mt-2 text-xs text-ink-3 list-disc pl-4 space-y-1">
                  {analysis.limitations.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
