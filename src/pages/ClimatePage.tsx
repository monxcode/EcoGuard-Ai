import { Droplets, Thermometer, Wind } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import type { ClimatePayload } from "../../shared/types";
import { heatIndexCelsius } from "../../shared/aqi";
import { PageHeader, SectionHeader } from "../components/ui/PageHeader";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { ErrorState, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { ForecastTimeline } from "../components/charts/ForecastTimeline";
import {
  formatTemp,
  formatTempFull,
  formatTimeInOffset,
  formatUtcOffset,
  formatWind,
} from "../utils/format";
import { weatherIcon } from "../utils/weatherIcon";

function MetricCell({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: typeof Thermometer;
}) {
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="w-3.5 h-3.5 text-ink-3" aria-hidden /> : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {label}
        </p>
      </div>
      <p className="mt-1.5 text-[24px] font-semibold text-ink tabular-nums tracking-[-0.02em] leading-none">
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[11px] text-ink-3 leading-snug">{sub}</p> : null}
    </div>
  );
}

export default function ClimatePage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<ClimatePayload>(
    `/api/climate?locationId=${settings.locationId}`,
  );

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No climate data returned." onRetry={reload} />;

  const weather = data.weather;
  const heatRun = data.agentRuns.find((r) => r.agentId === "heat-risk");
  const weatherRun = data.agentRuns.find((r) => r.agentId === "weather");
  const hi = weather
    ? Math.round(heatIndexCelsius(weather.temperature, weather.humidity) * 10) / 10
    : null;
  const hotDays = data.daily.filter((d) => d.tempMax >= 36).length;
  const WeatherGlyph = weatherIcon(weather?.icon, weather?.weatherCondition);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Climate & Heat"
        subtitle={`${data.location.name}, ${data.location.region} — HeatShield assessment`}
        actions={
          <div className="flex items-center gap-2">
            <DataStateBadge state={data.states.weather} />
            {heatRun ? <RiskPill level={heatRun.result.riskLevel} size="lg" /> : null}
          </div>
        }
      />

      {/* ── Current conditions ────────────────────────────── */}
      <div className="grid sm:grid-cols-[1.2fr_1.5fr] bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(26,29,26,0.03)] overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Current conditions
            </p>
            <WeatherGlyph className="w-6 h-6 text-ink-2" aria-hidden />
          </div>
          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-[54px] font-semibold tracking-[-0.03em] text-ink tabular-nums leading-none">
              {weather ? formatTemp(weather.temperature, settings.units) : "—"}
            </span>
            <span className="text-[15px] font-medium text-ink-2 capitalize leading-tight">
              {weather
                ? (weather.weatherDescription ?? weather.weatherCondition ?? "Observed")
                : "Unavailable"}
            </span>
          </div>
          <p className="mt-3 text-[13px] text-ink-2">
            Feels like{" "}
            <span className="font-medium text-ink">
              {weather?.apparentTemperature != null
                ? formatTempFull(weather.apparentTemperature, settings.units)
                : "—"}
            </span>
          </p>
          <p className="mt-1.5 text-[11px] text-ink-3">
            Observed {formatTimeInOffset(weather?.timestamp, weather?.timezoneOffset)}{" "}
            {formatUtcOffset(weather?.timezoneOffset)} · {data.sources.weather}
          </p>
        </div>

        <div className="border-t sm:border-t-0 sm:border-l border-line grid grid-cols-2 sm:grid-cols-2 divide-y divide-x divide-line-2">
          <MetricCell
            label="Humidity"
            icon={Droplets}
            value={weather ? `${weather.humidity}%` : "—"}
            sub="relative humidity"
          />
          <MetricCell
            label="Wind"
            icon={Wind}
            value={weather ? formatWind(weather.windSpeed, settings.units) : "—"}
            sub={
              weather?.windDirection !== null && weather?.windDirection !== undefined
                ? `${weather.windDirection}° bearing`
                : undefined
            }
          />
          <MetricCell
            label="Heat index"
            icon={Thermometer}
            value={hi !== null ? `${hi}°C` : "—"}
            sub="temperature + humidity estimate"
          />
          <MetricCell
            label="Hot spell"
            value={`${hotDays}d`}
            sub="forecast days ≥ 36 °C · screening"
          />
        </div>
      </div>

      {data.errors.length > 0 ? (
        <div className="rounded-lg bg-ochre-soft border border-ochre-line text-ochre-2 px-3.5 py-2.5 text-[13px] leading-relaxed">
          <ul className="list-disc pl-4">
            {data.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Forecast timeline ─────────────────────────────── */}
      <section>
        <SectionHeader
          title="Forecast"
          action={<DataStateBadge state={data.states.forecast} />}
        />
        <div className="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(26,29,26,0.03)] px-4 sm:px-5 py-3">
          <ForecastTimeline data={data.daily} units={settings.units} />
        </div>
      </section>

      {/* ── Assessments ───────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-2 items-start">
        {heatRun ? (
          <AgentResultCard run={heatRun} />
        ) : (
          <ErrorState message="Heat risk assessment unavailable." onRetry={reload} />
        )}
        {weatherRun ? <AgentResultCard run={weatherRun} /> : null}
      </section>
    </div>
  );
}
