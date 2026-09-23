import { aqiCategory } from "../../../shared/aqi";
import type { DashboardPayload } from "../../../shared/types";
import { useApp } from "../../context/AppContext";
import { formatTempFull, formatTimestamp, formatTime, formatWind } from "../../utils/format";
import { weatherIcon } from "../../utils/weatherIcon";
import { PageHeader } from "../ui/PageHeader";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { DataStateBadge } from "../ui/DataStateBadge";
import { RiskPill } from "../ui/RiskPill";
import { CompactAgentSummary } from "../agents/AgentResultCard";
import { AqiTrendChart, RainfallChart, TemperatureRangeChart } from "../charts/Charts";

export function DashboardView({ data }: { data: DashboardPayload }) {
  const { settings } = useApp();
  const air = data.air;
  const weather = data.weather;
  const category = air ? aqiCategory(air.aqi) : null;
  const runsById = Object.fromEntries(data.agentRuns.map((r) => [r.agentId, r]));
  const WeatherGlyph = weatherIcon(weather?.icon, weather?.weatherCondition);

  const domains = [
    { id: "air-quality", label: "Air Quality" },
    { id: "heat-risk", label: "Heat Risk" },
    { id: "flood-risk", label: "Flood Risk" },
    { id: "wildfire-risk", label: "Wildfire Risk" },
    { id: "water-stress", label: "Water Stress" },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ClimatePulse"
        subtitle={`${data.location.name}, ${data.location.region} — updated ${formatTimestamp(data.generatedAt)}`}
        actions={
          data.overall ? <RiskPill level={data.overall.result.riskLevel} size="lg" /> : null
        }
      />

      {/* Provider errors — never hidden behind a blank card */}
      {data.errors.length > 0 ? (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Data availability
          </p>
          <ul className="mt-2 text-sm text-amber-900 list-disc pl-5 space-y-1">
            {data.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Row 1: hero metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Air Quality Index</p>
            <DataStateBadge state={data.states.air} />
          </div>
          {air && category ? (
            <>
              <p className="mt-2 text-5xl font-semibold text-slate-900 tabular-nums leading-none">
                {air.aqi}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-700">{category.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                PM2.5 {air.pm25} µg/m³ · PM10 {air.pm10} µg/m³
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500">Data unavailable</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weather</p>
            <DataStateBadge state={data.states.weather} />
          </div>
          {weather ? (
            <>
              <div className="mt-2 flex items-start gap-3">
                <WeatherGlyph className="w-8 h-8 text-sky-600 shrink-0 mt-1" aria-hidden />
                <div>
                  <p className="text-4xl font-semibold text-slate-900 tabular-nums leading-none">
                    {formatTempFull(weather.temperature, settings.units)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700 capitalize">
                    {weather.weatherDescription ?? weather.weatherCondition ?? "Current conditions"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Feels like{" "}
                {weather.apparentTemperature !== null
                  ? formatTempFull(weather.apparentTemperature, settings.units)
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Humidity {weather.humidity}% · Wind {formatWind(weather.windSpeed, settings.units)}
                {weather.pressure !== null ? ` · ${weather.pressure} hPa` : ""}
                {weather.cloudiness !== null ? ` · ${weather.cloudiness}% cloud` : ""}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {data.sources.weather} · observed {formatTime(weather.timestamp)}
              </p>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-semibold text-rose-700">WEATHER DATA UNAVAILABLE</p>
              <p className="mt-1 text-xs text-slate-500">
                Weather data is temporarily unavailable. Try again shortly or switch to Demo Mode
                in Settings.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Heat Risk</p>
            {runsById["heat-risk"] ? (
              <RiskPill level={runsById["heat-risk"].result.riskLevel} size="sm" />
            ) : null}
          </div>
          <div className="mt-3">
            {runsById["heat-risk"] ? (
              <CompactAgentSummary run={runsById["heat-risk"]} />
            ) : (
              <p className="text-sm text-slate-500">Heat assessment unavailable.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overall Risk</p>
            {data.overall ? <RiskPill level={data.overall.result.riskLevel} size="sm" /> : null}
          </div>
          <p className="mt-3 text-sm text-slate-200 leading-relaxed">
            {data.overall ? data.overall.result.summary : "Overall assessment unavailable."}
          </p>
          {data.overall ? (
            <p className="mt-2 text-[11px] text-slate-400">
              Combined from {data.agentRuns.length} agents · confidence{" "}
              {Math.round(data.overall.result.confidence * 100)}%
            </p>
          ) : null}
        </Card>
      </div>

      {/* Row 2: five-domain risk overview */}
      <Card>
        <CardHeader
          title="Risk overview"
          subtitle="Five environmental domains at a glance"
          action={<DataStateBadge state={data.states.air} />}
        />
        <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 pt-2">
          {domains.map((domain) => {
            const run = runsById[domain.id];
            return (
              <div key={domain.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50/60">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-600">{domain.label}</p>
                  {run ? <RiskPill level={run.result.riskLevel} size="sm" /> : <span className="text-[11px] text-slate-400">—</span>}
                </div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-3">
                  {run ? run.result.summary : "Assessment unavailable."}
                </p>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {/* Row 3: trends + alerts */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="AQI trend (24h)"
            subtitle="Hourly air-quality index for the selected location"
            action={<DataStateBadge state={data.states.airTrend} />}
          />
          <CardBody className="pt-2">
            <AqiTrendChart data={data.hourly} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alerts"
            subtitle={`Severity at or above: ${settings.alertMinSeverity}`}
          />
          <CardBody className="pt-2 space-y-2">
            {data.alerts.length === 0 ? (
              <p className="text-sm text-slate-500">No elevated-risk alerts for this location.</p>
            ) : (
              data.alerts.map((alert) => (
                <div key={alert.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-800">{alert.title}</p>
                    <RiskPill level={alert.severity} size="sm" />
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-3">{alert.message}</p>
                </div>
              ))
            )}
            <p className="text-[11px] text-slate-400 pt-1">
              In-app advisory generated by EcoGuard agents — not an official government alert.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Row 4: temperature + rainfall */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Weather Forecast — temperature (7 days)"
            action={<DataStateBadge state={data.states.forecast} />}
          />
          <CardBody className="pt-2">
            <TemperatureRangeChart data={data.daily} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Weather Forecast — rainfall (7 days)"
            action={<DataStateBadge state={data.states.forecast} />}
          />
          <CardBody className="pt-2">
            <RainfallChart data={data.daily} />
          </CardBody>
        </Card>
      </div>

      {/* Row 5: AI summary */}
      <Card>
        <CardHeader
          title="AI environmental summary"
          subtitle="Interpretation generated from the data shown on this page"
          action={
            <span className="px-2 py-0.5 text-[11px] font-medium border border-violet-200 bg-violet-50 text-violet-700 rounded-full">
              {data.advisory.usedGemini ? "Gemini interpretation" : "Rules-based interpretation"}
            </span>
          }
        />
        <CardBody className="pt-2 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">{data.advisory.text}</p>
          <div className="flex flex-wrap gap-1.5">
            {data.advisory.agentsUsed.map((name) => (
              <span
                key={name}
                className="px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full"
              >
                {name}
              </span>
            ))}
          </div>
          <ul className="text-xs text-slate-500 list-disc pl-4 space-y-0.5">
            {data.advisory.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* Row 6: data sources */}
      <Card>
        <CardHeader title="Data sources for this view" />
        <CardBody className="pt-2 flex flex-wrap gap-2">
          <span className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded text-slate-600">
            Air: {data.sources.air}
          </span>
          <span className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded text-slate-600">
            Weather: {data.sources.weather}
          </span>
          <span className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded text-slate-600">
            Trend: {data.sources.airTrend}
          </span>
          <span className="px-2 py-1 text-xs bg-slate-100 border border-slate-200 rounded text-slate-600">
            Forecast: {data.sources.forecast}
          </span>
        </CardBody>
      </Card>
    </div>
  );
}
