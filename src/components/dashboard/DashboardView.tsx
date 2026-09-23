import { ChevronDown } from "lucide-react";
import { aqiCategory } from "../../../shared/aqi";
import type { DashboardPayload } from "../../../shared/types";
import { useApp } from "../../context/AppContext";
import {
  formatTempFull,
  formatTimestamp,
  formatTimestampInOffset,
  formatUtcOffset,
  formatWind,
} from "../../utils/format";
import { weatherIcon } from "../../utils/weatherIcon";
import { PageHeader } from "../ui/PageHeader";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { DataStateBadge } from "../ui/DataStateBadge";
import { RiskPill } from "../ui/RiskPill";
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
        subtitle={`${data.location.name}, ${data.location.region} · Updated ${formatTimestamp(data.generatedAt)}`}
        actions={
          data.overall ? <RiskPill level={data.overall.result.riskLevel} size="lg" /> : null
        }
      />

      {/* Provider errors — never hidden behind a blank card */}
      {data.errors.length > 0 ? (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <p className="text-xs font-semibold text-amber-800">Data availability</p>
          <ul className="mt-1.5 text-sm text-amber-900 list-disc pl-5 space-y-1">
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
            <p className="text-xs font-medium text-slate-500">Air quality index</p>
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
            <p className="text-xs font-medium text-slate-500">Weather</p>
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
              <p className="mt-1.5 text-sm text-slate-600">
                Feels like{" "}
                {weather.apparentTemperature !== null
                  ? formatTempFull(weather.apparentTemperature, settings.units)
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Humidity {weather.humidity}% · Wind {formatWind(weather.windSpeed, settings.units)}
              </p>
              <details className="group mt-2">
                <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-600">
                  Provider details
                </summary>
                <div className="mt-1.5 space-y-0.5 text-[11px] text-slate-400 break-words">
                  <p>
                    Updated {formatTimestampInOffset(weather.timestamp, weather.timezoneOffset)} (
                    {formatUtcOffset(weather.timezoneOffset)}) · {data.sources.weather}
                  </p>
                  <p>
                    {weather.providerCityName
                      ? `${weather.providerCityName}${weather.providerCountry ? `, ${weather.providerCountry}` : ""} · `
                      : ""}
                    /data/2.5/weather · sent {data.location.lat.toFixed(4)},{" "}
                    {data.location.lon.toFixed(4)}
                    {weather.providerLat !== null &&
                    weather.providerLon !== null &&
                    (Math.abs(weather.providerLat - data.location.lat) > 0.0005 ||
                      Math.abs(weather.providerLon - data.location.lon) > 0.0005)
                      ? ` · grid ${weather.providerLat.toFixed(4)}, ${weather.providerLon.toFixed(4)}`
                      : ""}
                  </p>
                  <p>
                    Pressure {weather.pressure ?? "—"} hPa · Cloud {weather.cloudiness ?? "—"}%
                  </p>
                </div>
              </details>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-semibold text-rose-700">Weather unavailable</p>
              <p className="mt-1 text-xs text-slate-500">
                Try again shortly or switch to Demo Mode in Settings.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Heat risk</p>
            {runsById["heat-risk"] ? (
              <RiskPill level={runsById["heat-risk"].result.riskLevel} size="sm" />
            ) : null}
          </div>
          <div className="mt-3">
            {runsById["heat-risk"] ? (
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                {runsById["heat-risk"].result.summary}
              </p>
            ) : (
              <p className="text-sm text-slate-500">Heat assessment unavailable.</p>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-400">Overall risk</p>
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
          action={<DataStateBadge state={data.states.air} />}
        />
        <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 pt-2">
          {domains.map((domain) => {
            const run = runsById[domain.id];
            return (
              <div key={domain.id} className="rounded-lg bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{domain.label}</p>
                  {run ? (
                    <RiskPill level={run.result.riskLevel} size="sm" />
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
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
            title="AQI trend · 24 hours"
            action={<DataStateBadge state={data.states.airTrend} />}
          />
          <CardBody className="pt-2">
            <AqiTrendChart data={data.hourly} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Alerts" />
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
              In-app advisory — not an official government alert.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Row 4: 7-day forecast (temperature + rainfall) */}
      <Card>
        <CardHeader
          title="7-day forecast"
          action={<DataStateBadge state={data.states.forecast} />}
        />
        <CardBody className="pt-2 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Temperature</p>
            <TemperatureRangeChart data={data.daily} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">Rainfall</p>
            <RainfallChart data={data.daily} />
          </div>
        </CardBody>
      </Card>

      {/* Row 5: AI summary */}
      <Card>
        <CardHeader
          title="AI summary"
          action={
            <span className="px-1.5 py-px text-[10px] font-medium border border-violet-200 bg-violet-50 text-violet-700 rounded-full">
              {data.advisory.usedGemini ? "Gemini" : "Rules-based"}
            </span>
          }
        />
        <CardBody className="pt-2 space-y-3">
          <p className="text-sm text-slate-700 leading-relaxed">{data.advisory.text}</p>
          <details className="group border-t border-slate-100 pt-3">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-800">
              <span>Agents used &amp; limitations ({data.advisory.limitations.length})</span>
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-3 space-y-3">
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
            </div>
          </details>
        </CardBody>
      </Card>

      {/* Row 6: data sources (collapsed) */}
      <Card>
        <CardBody className="py-3">
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-800">
              <span>Data sources for this view</span>
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600">
                Air: {data.sources.air}
              </span>
              <span className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600">
                Weather: {data.sources.weather}
              </span>
              <span className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600">
                Trend: {data.sources.airTrend}
              </span>
              <span className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600">
                Forecast: {data.sources.forecast}
              </span>
            </div>
          </details>
        </CardBody>
      </Card>
    </div>
  );
}
