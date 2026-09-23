import { ArrowRight, ChevronDown, CloudRain, Droplets, Flame, Sparkles, Thermometer } from "lucide-react";
import { AQI_CATEGORIES, aqiCategory } from "../../../shared/aqi";
import type { DashboardPayload, RiskLevel } from "../../../shared/types";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { formatTemp, formatTimestamp } from "../../utils/format";
import { weatherIcon } from "../../utils/weatherIcon";
import { RISK_META } from "../../utils/risk";
import { SectionHeader } from "../ui/PageHeader";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { DataStateBadge } from "../ui/DataStateBadge";
import { RiskPill } from "../ui/RiskPill";
import { Chip } from "../ui/Button";
import { AqiTrendChart, RainfallChart, TemperatureRangeChart } from "../charts/Charts";

const BAND_COLORS: Record<RiskLevel, string> = {
  low: "#2e6b4f",
  moderate: "#a96e15",
  high: "#bc4b32",
  severe: "#a32a31",
  unknown: "#9aa19b",
};

/** Segmented US-AQI scale with a marker at the current value. */
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
            style={{
              backgroundColor: BAND_COLORS[c.risk],
              opacity: i === idx ? 1 : 0.28,
            }}
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

function HeroLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">{children}</p>
  );
}

export function DashboardView({ data }: { data: DashboardPayload }) {
  const { settings } = useApp();
  const air = data.air;
  const weather = data.weather;
  const category = air ? aqiCategory(air.aqi) : null;
  const runsById = Object.fromEntries(data.agentRuns.map((r) => [r.agentId, r]));
  const WeatherGlyph = weatherIcon(weather?.icon, weather?.weatherCondition);
  const overallMeta = data.overall ? RISK_META[data.overall.result.riskLevel] : null;
  const topRecommendation = data.overall?.result.recommendations[0];

  const domains = [
    { id: "heat-risk", label: "Heat", icon: Thermometer, to: "/climate" },
    { id: "flood-risk", label: "Flood", icon: CloudRain, to: "/disaster" },
    { id: "wildfire-risk", label: "Wildfire", icon: Flame, to: "/disaster" },
    { id: "water-stress", label: "Water stress", icon: Droplets, to: "/water" },
  ] as const;

  const firstInsightSentence =
    data.advisory.text.split(/(?<=[.!?])\s+/)[0] || "Analyzing environmental data.";

  return (
    <div className="space-y-10">
      {/* ── Status hero ─────────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              EcoGuard Intelligence
            </p>
            <h1 className="mt-1.5 text-[30px] sm:text-[36px] font-semibold tracking-[-0.025em] text-ink leading-none">
              {data.location.name}
            </h1>
            <p className="mt-2 text-sm text-ink-3">
              {data.location.region} · Updated {formatTimestamp(data.generatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <DataStateBadge state={data.states.air} />
            <DataStateBadge state={data.states.weather} />
          </div>
        </div>

        {data.errors.length > 0 ? (
          <div className="mt-4 rounded-lg bg-ochre-soft border border-ochre-line text-ochre-2 px-3.5 py-2.5 text-[13px] leading-relaxed">
            <p className="font-semibold">Partial data:</p>
            <ul className="list-disc pl-4 mt-0.5">
              {data.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Hero metrics panel */}
        <div className="mt-5 grid md:grid-cols-3 bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(26,29,26,0.03)] overflow-hidden divide-y md:divide-y-0 md:divide-x divide-line">
          {/* AQI */}
          <div className="p-5 sm:p-6">
            <HeroLabel>Air quality</HeroLabel>
            <div className="mt-2.5 flex items-baseline gap-3">
              <span className="text-[54px] sm:text-[60px] font-semibold tracking-[-0.03em] text-ink tabular-nums leading-none">
                {air?.aqi ?? "—"}
              </span>
              {category ? (
                <span
                  className={`text-[15px] font-medium ${RISK_META[category.risk].textClass}`}
                >
                  {category.label}
                </span>
              ) : (
                <span className="text-[15px] font-medium text-ink-3">Unavailable</span>
              )}
            </div>
            {air ? <AqiScale aqi={air.aqi} /> : null}
            <p className="mt-3.5 text-[13px] text-ink-3 tabular-nums">
              {air ? `PM2.5 ${air.pm25} · PM10 ${air.pm10} µg/m³` : "Air-quality data unavailable"}
            </p>
          </div>

          {/* Weather */}
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <HeroLabel>Current weather</HeroLabel>
              {weather ? <WeatherGlyph className="w-5 h-5 text-ink-2" aria-hidden /> : null}
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[54px] sm:text-[60px] font-semibold tracking-[-0.03em] text-ink tabular-nums leading-none">
                {weather ? formatTemp(weather.temperature, settings.units) : "—"}
              </span>
            </div>
            <p className="mt-3 text-[13px] text-ink-2">
              {weather?.apparentTemperature != null
                ? `Feels like ${formatTemp(weather.apparentTemperature, settings.units)}`
                : weather
                  ? "Apparent temperature unavailable"
                  : "Weather data unavailable"}
            </p>
            <p className="mt-1 text-[13px] text-ink-3 capitalize">
              {weather
                ? (weather.weatherDescription ?? weather.weatherCondition ?? "")
                : ""}
              {weather ? ` · Humidity ${weather.humidity}%` : ""}
            </p>
          </div>

          {/* Status + recommendation */}
          <div className="p-5 sm:p-6">
            <HeroLabel>Environmental status</HeroLabel>
            <div className="mt-2.5 flex items-center gap-2.5">
              {data.overall ? (
                <>
                  <RiskPill level={data.overall.result.riskLevel} size="lg" />
                  <span className="text-[15px] font-medium text-ink">
                    {overallMeta && data.overall.result.riskLevel !== "unknown"
                      ? `${overallMeta.label} exposure risk`
                      : "Assessed"}
                  </span>
                </>
              ) : (
                <span className="text-[15px] text-ink-3">Status unavailable</span>
              )}
            </div>
            {data.overall ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-2 line-clamp-2">
                {data.overall.result.summary}
              </p>
            ) : null}
            {topRecommendation ? (
              <div className="mt-4 pt-3.5 border-t border-line-2">
                <HeroLabel>Recommended now</HeroLabel>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink flex gap-2">
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" aria-hidden />
                  <span>{topRecommendation}</span>
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* AI insight */}
        <div className="mt-4 rounded-xl border border-line bg-surface p-5 flex gap-3.5 shadow-[0_1px_2px_rgba(26,29,26,0.03)]">
          <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
              EcoGuard insight
            </p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{firstInsightSentence}</p>
            <details className="group mt-3 border-t border-line-2 pt-2.5">
              <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-3 hover:text-ink">
                <span>Full advisory, agents &amp; limitations</span>
                <ChevronDown
                  className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="mt-3 space-y-3.5">
                <p className="text-[13px] leading-relaxed text-ink-2 whitespace-pre-wrap">
                  {data.advisory.text}
                </p>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-1.5">
                    Agents used
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.advisory.agentsUsed.map((name) => (
                      <Chip key={name}>{name}</Chip>
                    ))}
                  </div>
                </div>
                {data.advisory.limitations.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-1.5">
                      Limitations
                    </p>
                    <ul className="text-xs text-ink-3 list-disc pl-4 space-y-1">
                      {data.advisory.limitations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ── Air quality ─────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Air quality"
          action={
            <Link
              to="/air"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-accent transition-colors"
            >
              View details <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          }
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="24-hour trend" action={<DataStateBadge state={data.states.airTrend} />} />
            <CardBody className="pt-1">
              <AqiTrendChart data={data.hourly} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Key pollutants" />
            <CardBody className="pt-1">
              {air ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="text-ink-2 font-medium">PM2.5</span>
                      <span className="font-semibold text-ink tabular-nums">
                        {air.pm25} <span className="text-[10px] text-ink-3 font-normal">µg/m³</span>
                      </span>
                    </div>
                    <div className="h-1 w-full bg-line rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${Math.min(100, (air.pm25 / 50) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="text-ink-2 font-medium">PM10</span>
                      <span className="font-semibold text-ink tabular-nums">
                        {air.pm10} <span className="text-[10px] text-ink-3 font-normal">µg/m³</span>
                      </span>
                    </div>
                    <div className="h-1 w-full bg-line rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#9aa19b] rounded-full"
                        style={{ width: `${Math.min(100, (air.pm10 / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[13px] text-ink-3 leading-relaxed pt-1 border-t border-line-2">
                    {runsById["air-quality"]?.result.summary || "Detailed analysis unavailable."}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-ink-3">Data unavailable</p>
              )}
            </CardBody>
          </Card>
        </div>
      </section>

      {/* ── Climate & forecast ──────────────────────────────── */}
      <section>
        <SectionHeader
          title="Climate & forecast"
          action={
            <Link
              to="/climate"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-accent transition-colors"
            >
              View details <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          }
        />
        <Card>
          <CardHeader title="7-day outlook" action={<DataStateBadge state={data.states.forecast} />} />
          <CardBody className="grid gap-6 lg:grid-cols-2 pt-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2">
                Temperature
              </p>
              <TemperatureRangeChart data={data.daily} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2">
                Rainfall
              </p>
              <RainfallChart data={data.daily} />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* ── Hazards ─────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Hazard overview"
          action={
            <Link
              to="/disaster"
              className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-accent transition-colors"
            >
              Hazard details <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          }
        />
        <Card>
          <div className="divide-y divide-line-2">
            {domains.map((domain) => {
              const run = runsById[domain.id];
              const DIcon = domain.icon;
              return (
                <Link
                  key={domain.id}
                  to={domain.to}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-surface-2 transition-colors"
                >
                  <span className="w-8 h-8 rounded-lg bg-canvas-2 text-ink-2 flex items-center justify-center shrink-0">
                    <DIcon className="w-4 h-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-ink">{domain.label}</p>
                      {run ? (
                        <RiskPill level={run.result.riskLevel} size="sm" />
                      ) : (
                        <span className="text-[11px] text-ink-3">—</span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-ink-2 leading-relaxed line-clamp-2">
                      {run ? run.result.summary : "Assessment unavailable."}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-3.5 h-3.5 mt-2 text-ink-3 shrink-0 hidden sm:block"
                    aria-hidden
                  />
                </Link>
              );
            })}
          </div>
        </Card>
      </section>

      {/* ── Recommendations + alerts ───────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Recommendations" />
          <Card>
            <CardBody>
              {data.overall && data.overall.result.recommendations.length > 0 ? (
                <ul className="space-y-2.5">
                  {data.overall.result.recommendations.map((rec, i) => (
                    <li key={i} className="flex gap-2.5 text-[13.5px] text-ink-2 leading-relaxed">
                      <span className="mt-[7px] w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden />
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No recommendations for current conditions.</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeader title="Active alerts" />
          <Card>
            {data.alerts.length === 0 ? (
              <CardBody>
                <p className="text-sm text-ink-3">
                  No elevated-risk alerts for this location.
                </p>
              </CardBody>
            ) : (
              <div className="divide-y divide-line-2">
                {data.alerts.map((alert) => (
                  <div key={alert.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-ink">{alert.title}</p>
                      <RiskPill level={alert.severity} size="sm" />
                    </div>
                    <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">
                      {alert.message}
                    </p>
                    <p className="mt-1.5 text-[11px] text-ink-3">{alert.agentName}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* ── Sources ─────────────────────────────────────────── */}
      <section className="pt-4 border-t border-line">
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] text-ink-3">
          <span>Air: {data.sources.air}</span>
          <span>Weather: {data.sources.weather}</span>
          <span>Trend: {data.sources.airTrend}</span>
          <span>Forecast: {data.sources.forecast}</span>
        </div>
      </section>
    </div>
  );
}
