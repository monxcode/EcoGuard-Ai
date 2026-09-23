import { Cloud, Droplet, Gauge, Thermometer, Wind } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import type { ClimatePayload } from "../../shared/types";
import { heatIndexCelsius } from "../../shared/aqi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { ErrorState, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { TemperatureRangeChart } from "../components/charts/Charts";
import { formatTempFull, formatTime, formatWind } from "../utils/format";
import { weatherIcon } from "../utils/weatherIcon";

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
    <div className="space-y-6">
      <PageHeader
        title="Climate & Heat Intelligence"
        subtitle={`${data.location.name} — HeatShield assessment`}
        actions={
          <div className="flex items-center gap-2">
            <DataStateBadge state={data.states.weather} />
            {heatRun ? <RiskPill level={heatRun.result.riskLevel} size="lg" /> : null}
          </div>
        }
      />

      {/* Current conditions strip */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <WeatherGlyph className="w-7 h-7 text-sky-600" aria-hidden />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current conditions
              </p>
              <p className="text-sm font-medium text-slate-800 capitalize">
                {weather
                  ? (weather.weatherDescription ?? weather.weatherCondition ?? "Observed")
                  : "Weather data is temporarily unavailable."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-slate-400" aria-hidden />
              {weather ? formatTempFull(weather.temperature, settings.units) : "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-slate-400" aria-hidden />
              {weather ? `${weather.humidity}%` : "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wind className="w-4 h-4 text-slate-400" aria-hidden />
              {weather ? formatWind(weather.windSpeed, settings.units) : "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-slate-400" aria-hidden />
              {weather?.pressure !== null && weather?.pressure !== undefined
                ? `${weather.pressure} hPa`
                : "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-slate-400" aria-hidden />
              {weather?.cloudiness !== null && weather?.cloudiness !== undefined
                ? `${weather.cloudiness}%`
                : "—"}
            </span>
            <span className="text-xs text-slate-400">
              {data.sources.weather} · observed {formatTime(weather?.timestamp)}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Temperature</p>
            <Thermometer className="w-4 h-4 text-slate-400" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {weather ? formatTempFull(weather.temperature, settings.units) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Apparent{" "}
            {weather?.apparentTemperature !== null && weather?.apparentTemperature !== undefined
              ? formatTempFull(weather.apparentTemperature, settings.units)
              : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Heat index</p>
            <RiskPill level={heatRun?.result.riskLevel ?? "unknown"} size="sm" />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {hi !== null ? `${hi}°C` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">Computed from temperature + humidity</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Humidity</p>
            <Droplet className="w-4 h-4 text-slate-400" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {weather ? `${weather.humidity}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Wind {weather ? formatWind(weather.windSpeed, settings.units) : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hot spell</p>
            <Wind className="w-4 h-4 text-slate-400" aria-hidden />
          </div>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{hotDays}d</p>
          <p className="mt-1 text-xs text-slate-500">
            Forecast days ≥ 36 °C (screening indicator, not an official heatwave declaration)
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Weather Forecast — temperature (7 days)"
            subtitle="Forecast daily highs and lows"
            action={<DataStateBadge state={data.states.forecast} />}
          />
          <CardBody className="pt-2">
            <TemperatureRangeChart data={data.daily} />
          </CardBody>
        </Card>

        {heatRun ? <AgentResultCard run={heatRun} /> : (
          <ErrorState message="Heat risk assessment unavailable." onRetry={reload} />
        )}
      </div>

      {weatherRun ? <AgentResultCard run={weatherRun} /> : null}

      {data.errors.length > 0 ? (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
            {data.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
