import type { ReactNode } from "react";
import { CloudRain, Flame, Droplets, Thermometer, Wind } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import type { AgentRun, DisasterPayload } from "../../shared/types";
import { PageHeader, SectionHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { Chip } from "../components/ui/Button";
import { ErrorState, NoticeStrip, PageSkeleton } from "../components/ui/states";
import { RainfallChart } from "../components/charts/Charts";
import { RISK_META } from "../utils/risk";
import { Link } from "react-router-dom";

function ColumnLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2">
      {children}
    </p>
  );
}

/** One hazard in the overview: level, explanation, confidence, action + supporting data. */
function HazardPanel({
  run,
  name,
  subtitle,
  icon: Icon,
  children,
}: {
  run: AgentRun | undefined;
  name: string;
  subtitle: string;
  icon: typeof Flame;
  children?: ReactNode;
}) {
  const result = run?.result;
  const level = result?.riskLevel ?? "unknown";
  const meta = RISK_META[level];
  const elevated = level === "high" || level === "severe";

  return (
    <Card
      className={elevated ? "ring-1 ring-danger-line" : undefined}
      as="article"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              elevated ? meta.softClass : "bg-canvas-2"
            } ${elevated ? meta.textClass : "text-ink-2"}`}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{name}</h2>
            <p className="text-[12px] text-ink-3 truncate">{subtitle}</p>
          </div>
        </div>
        <RiskPill level={level} size="lg" className="shrink-0" />
      </div>

      <div className="px-5 pb-5 pt-4 space-y-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          {result ? result.summary : "Assessment unavailable for this location."}
        </p>

        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <ColumnLabel>Confidence</ColumnLabel>
            {result && result.status === "success" ? (
              <ConfidenceBar value={result.confidence} />
            ) : (
              <p className="text-[13px] text-ink-3">Unavailable</p>
            )}
          </div>
          <div>
            <ColumnLabel>Recommended action</ColumnLabel>
            <p className="text-[13px] leading-relaxed text-ink">
              {result?.recommendations[0] ?? "No specific action at this level."}
            </p>
          </div>
        </div>

        {children ? (
          <div className="pt-1">
            <ColumnLabel>Supporting data</ColumnLabel>
            <div className="-mt-1">{children}</div>
          </div>
        ) : null}

        {result ? (
          <details className="group border-t border-line-2 pt-3">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
              <span>View analysis, sources &amp; limitations</span>
              <span className="text-ink-3 text-[11px] group-open:hidden">Expand</span>
            </summary>
            <div className="mt-3 space-y-3.5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <ColumnLabel>Possible factors</ColumnLabel>
                  <ul className="space-y-1.5">
                    {result.factors.map((f, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-ink-2 leading-relaxed">
                        <span className="mt-[7px] w-1 h-1 rounded-full bg-ink-3 shrink-0" aria-hidden />
                        {f}
                      </li>
                    ))}
                    {result.factors.length === 0 ? (
                      <li className="text-xs text-ink-3">None reported.</li>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <ColumnLabel>Observed evidence</ColumnLabel>
                  <ul className="space-y-1.5">
                    {result.evidence.map((e, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-ink-2 leading-relaxed">
                        <span className="mt-[7px] w-1 h-1 rounded-full bg-ink-3 shrink-0" aria-hidden />
                        {e}
                      </li>
                    ))}
                    {result.evidence.length === 0 ? (
                      <li className="text-xs text-ink-3">None reported.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
              <div>
                <ColumnLabel>Recommendations</ColumnLabel>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-ink-2 leading-relaxed">
                      <span className="mt-[7px] w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.dataSources.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
              <ul className="text-xs text-ink-3 list-disc pl-4 space-y-1">
                {result.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
                {result.limitations.length === 0 ? <li>None declared.</li> : null}
              </ul>
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  );
}

function WeatherMetrics({
  temperature,
  humidity,
  wind,
}: {
  temperature: string;
  humidity: string;
  wind: string;
}) {
  const cells = [
    { label: "Temp", value: temperature, icon: Thermometer },
    { label: "Humidity", value: humidity, icon: Droplets },
    { label: "Wind", value: wind, icon: Wind },
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-line-2 rounded-lg border border-line overflow-hidden">
      {cells.map((c) => (
        <div key={c.label} className="px-3 py-3 text-center">
          <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            <c.icon className="w-3 h-3" aria-hidden />
            {c.label}
          </p>
          <p className="mt-1 text-[18px] font-semibold text-ink tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function DisasterPage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<DisasterPayload>(
    `/api/disaster?locationId=${settings.locationId}`,
  );

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No disaster-risk data returned." onRetry={reload} />;

  const flood = data.agentRuns.find((r) => r.agentId === "flood-risk");
  const wildfire = data.agentRuns.find((r) => r.agentId === "wildfire-risk");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Disaster Intelligence"
        subtitle={`${data.location.name}, ${data.location.region} — hazard screening overview`}
        actions={<DataStateBadge state={data.states.forecast} />}
      />

      {/* Honest availability notice — never fabricate authoritative warnings */}
      <NoticeStrip tone="ochre">
        <strong className="font-semibold">Screening assessments only.</strong> No authoritative
        flood or wildfire warning feed is configured — these are weather-based screenings, not
        official warnings. Follow local disaster-management authorities.
      </NoticeStrip>

      <section>
        <SectionHeader title="Hazard overview" eyebrow="Active domains" />
        <div className="grid gap-4 xl:grid-cols-2 items-start">
          <HazardPanel
            run={flood}
            name="Flood risk"
            subtitle="FloodSense — rainfall & forecast screening"
            icon={CloudRain}
          >
            <RainfallChart data={data.daily} />
          </HazardPanel>

          <HazardPanel
            run={wildfire}
            name="Wildfire risk"
            subtitle="WildfireWatch — fire-weather proxy"
            icon={Flame}
          >
            <WeatherMetrics
              temperature={data.weather ? `${Math.round(data.weather.temperature)}°` : "—"}
              humidity={data.weather ? `${data.weather.humidity}%` : "—"}
              wind={data.weather ? `${Math.round(data.weather.windSpeed)} km/h` : "—"}
            />
          </HazardPanel>
        </div>
      </section>

      <section className="pt-4 border-t border-line">
        <p className="text-[13px] text-ink-3 leading-relaxed">
          Other hazards are assessed on their own pages:{" "}
          <Link to="/climate" className="text-accent hover:text-accent-2 font-medium">
            heat risk
          </Link>{" "}
          and water stress on{" "}
          <Link to="/water" className="text-accent hover:text-accent-2 font-medium">
            water intelligence
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
