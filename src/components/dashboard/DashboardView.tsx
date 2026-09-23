import {
  ArrowRight,
  ChevronDown,
  CloudRain,
  Droplets,
  Flame,
  Sparkles,
  Thermometer,
} from "lucide-react";
import { AQI_CATEGORIES, RISK_ORDER, aqiCategory } from "../../../shared/aqi";
import type { AgentRun, DashboardPayload, DataState } from "../../../shared/types";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { formatTemp, formatTimestamp, formatWind } from "../../utils/format";
import { weatherIcon } from "../../utils/weatherIcon";
import { RISK_META } from "../../utils/risk";
import { SectionHeader } from "../ui/PageHeader";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { RiskPill } from "../ui/RiskPill";
import { Chip } from "../ui/Button";
import { AqiTrendChart, RainfallChart, TemperatureRangeChart } from "../charts/Charts";

const BAND_COLORS = {
  low: "#2e6b4f",
  moderate: "#a96e15",
  high: "#bc4b32",
  severe: "#a32a31",
  unknown: "#9aa19b",
} as const;

/* ── The dashboard's ONE data-state indicator ─────────────────────────── */

interface FeedStatus {
  label: string;
  className: string;
  title: string;
  dot: boolean;
}

const LIVE_STATUS: FeedStatus = {
  label: "Live",
  className: "bg-accent-soft text-accent-2 border-accent-line",
  title: "Live provider data — fetched successfully with this refresh",
  dot: true,
};

const DEMO_STATUS: FeedStatus = {
  label: "Demo",
  className: "bg-surface-2 text-ink-3 border-dashed border-[#cbc8bf]",
  title: "Deterministic demo dataset — not live measurements",
  dot: false,
};

const PARTIAL_STATUS: FeedStatus = {
  label: "Partial",
  className: "bg-ochre-soft text-ochre-2 border-ochre-line",
  title: "Some feeds failed or are missing — this view is not from a full refresh",
  dot: false,
};

const UNAVAILABLE_STATUS: FeedStatus = {
  label: "Unavailable",
  className: "bg-danger-soft text-danger-2 border-danger-line",
  title: "No provider data available for this refresh",
  dot: false,
};

/**
 * Derive the single LIVE/DEMO indicator from the actual feed states — never
 * from mode settings. All feeds live with zero errors → LIVE; all demo →
 * DEMO; anything degraded → PARTIAL/UNAVAILABLE, so a failed live refresh
 * can never still show LIVE.
 */
function deriveFeedStatus(data: DashboardPayload): FeedStatus {
  const states: DataState[] = [
    data.states.air,
    data.states.weather,
    data.states.airTrend,
    data.states.forecast,
  ];
  const unique = new Set(states);
  if (unique.size === 1) {
    const s = states[0];
    if (s === "live") return data.errors.length === 0 ? LIVE_STATUS : PARTIAL_STATUS;
    if (s === "demo") return DEMO_STATUS;
    if (s === "unavailable") return UNAVAILABLE_STATUS;
    if (s === "historical") {
      return {
        label: "Historical",
        className: "bg-surface-2 text-ink-2 border-line",
        title: "Real past data from a provider",
        dot: false,
      };
    }
    return {
      label: "Estimated",
      className: "bg-blue-soft text-blue-2 border-blue-line",
      title: "Derived estimate — not a direct measurement",
      dot: false,
    };
  }
  return PARTIAL_STATUS;
}

function FeedStatusChip({ data }: { data: DashboardPayload }) {
  const status = deriveFeedStatus(data);
  return (
    <span
      title={status.title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] border rounded-full whitespace-nowrap ${status.className}`}
    >
      {status.dot ? (
        <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
      ) : null}
      {status.label}
    </span>
  );
}

/* ── Hero pieces ──────────────────────────────────────────────────────── */

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
    <div className="mt-3" aria-hidden>
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

function VitalLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
      {children}
    </p>
  );
}

/** Compact uppercase status badge — restrained soft-pill, never a colored card. */
function StatusBadge({
  text,
  pillClass,
  className = "",
}: {
  text: string;
  pillClass: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] border rounded-full ${pillClass} ${className}`}
    >
      {text}
    </span>
  );
}

/** Relative freshness for the location header — "Updated 2 min ago". */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return formatTimestamp(iso);
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatTimestamp(iso);
}

const HAZARDS = [
  { id: "heat-risk", label: "Heat", icon: Thermometer, to: "/climate" },
  { id: "flood-risk", label: "Flood", icon: CloudRain, to: "/disaster" },
  { id: "wildfire-risk", label: "Wildfire", icon: Flame, to: "/disaster" },
  { id: "water-stress", label: "Water stress", icon: Droplets, to: "/water" },
] as const;

type HazardDef = (typeof HAZARDS)[number];

function pollutantBar(
  label: string,
  value: number,
  scaleMax: number,
  barClass: string,
): React.ReactNode {
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-1.5">
        <span className="text-ink-2 font-medium">{label}</span>
        <span className="font-semibold text-ink tabular-nums">
          {value} <span className="text-[10px] text-ink-3 font-normal">µg/m³</span>
        </span>
      </div>
      <div className="h-1 w-full bg-line rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, (value / scaleMax) * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardView({ data }: { data: DashboardPayload }) {
  const { settings } = useApp();
  const air = data.air;
  const weather = data.weather;
  const category = air ? aqiCategory(air.aqi) : null;
  const runsById = Object.fromEntries(data.agentRuns.map((r) => [r.agentId, r]));
  const WeatherGlyph = weatherIcon(weather?.icon, weather?.weatherCondition);

  const level = data.overall?.result.riskLevel ?? "unknown";
  const levelMeta = RISK_META[level];

  const conditionText = weather
    ? (weather.weatherDescription ?? weather.weatherCondition ?? "")
    : "";
  const tempStr = weather ? formatTemp(weather.temperature, settings.units) : null;
  const tempUnit = settings.units === "imperial" ? "°F" : "°C";
  const tempHasUnit = tempStr !== null && tempStr !== "—";
  const tempValue = tempHasUnit ? tempStr.slice(0, -2) : "—";
  const windStr = weather ? formatWind(weather.windSpeed, settings.units) : null;
  const windParts = windStr && windStr !== "—" ? windStr.split(" ") : null;

  const assessed = HAZARDS.flatMap((def) => {
    const run = runsById[def.id];
    return run ? [{ def, run, rank: RISK_ORDER[run.result.riskLevel] }] : [];
  });
  const primary = assessed.reduce<{ def: HazardDef; run: AgentRun; rank: number } | null>(
    (best, candidate) => (best === null || candidate.rank > best.rank ? candidate : best),
    null,
  );
  const PrimaryIcon = primary ? primary.def.icon : RISK_META.unknown.icon;

  const firstInsightSentence =
    data.advisory.text.split(/(?<=[.!?])\s+/)[0] || "Analyzing environmental data.";

  return (
    <div className="space-y-10">
      {/* ── Status header + hero ───────────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.022em] text-ink leading-tight">
              {data.location.region
                ? `${data.location.name}, ${data.location.region}`
                : data.location.name}
            </h1>
            <p className="mt-1 text-[13px] text-ink-3">
              Updated {formatRelative(data.generatedAt)}
            </p>
          </div>
          <div className="ml-auto pt-1.5">
            <FeedStatusChip data={data} />
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

        {/* Editorial metrics composition — asymmetric, whitespace-driven, no table/grid */}
        <div className="mt-6 rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(26,29,26,0.03)] overflow-hidden">
          <div className="px-6 pt-7 pb-8 sm:px-8 sm:pt-9 sm:pb-9 lg:px-10 lg:pt-10 lg:pb-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:gap-14 xl:gap-20">
              {/* Primary — AQI */}
              <div className="lg:flex-[1.55] min-w-0">
                <VitalLabel>AQI</VitalLabel>
                <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <span className="text-[72px] sm:text-[84px] lg:text-[92px] font-semibold tracking-[-0.045em] text-ink tabular-nums leading-[0.9]">
                    {air?.aqi ?? "—"}
                  </span>
                  {category ? (
                    <StatusBadge
                      text={category.label}
                      pillClass={RISK_META[category.risk].pillClass}
                      className="mb-4 shrink-0"
                    />
                  ) : (
                    <span className="mb-4 text-[13px] text-ink-3">Unavailable</span>
                  )}
                </div>
                {air ? (
                  <div className="mt-6 max-w-[440px]">
                    <AqiScale aqi={air.aqi} />
                  </div>
                ) : null}
              </div>

              {/* Secondary metrics — natural flow, large type, generous whitespace */}
              <div className="mt-10 lg:mt-0 lg:flex-1 min-w-0 flex flex-col gap-9 lg:gap-12">
                {/* Temperature */}
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <VitalLabel>Temperature</VitalLabel>
                    {weather ? (
                      <WeatherGlyph className="w-7 h-7 text-ink-2 shrink-0" aria-hidden />
                    ) : null}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-[52px] sm:text-[56px] lg:text-[60px] font-semibold tracking-[-0.035em] text-ink tabular-nums leading-none">
                      {tempValue}
                    </span>
                    {tempHasUnit ? (
                      <span className="text-[24px] font-medium text-ink-3">{tempUnit}</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[14px] text-ink-2">
                    {weather
                      ? weather.apparentTemperature != null
                        ? `Feels like ${formatTemp(weather.apparentTemperature, settings.units)}`
                        : conditionText || "Condition unavailable"
                      : "Weather data unavailable"}
                  </p>
                  {weather && weather.apparentTemperature != null && conditionText ? (
                    <p className="mt-1 text-[14px] text-ink-3 capitalize line-clamp-1">
                      {conditionText}
                    </p>
                  ) : null}
                </div>

                {/* Humidity + Wind — asymmetric pair, no dividers */}
                <div className="flex flex-wrap gap-x-14 gap-y-8">
                  <div className="min-w-0">
                    <VitalLabel>Humidity</VitalLabel>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[42px] sm:text-[46px] font-semibold tracking-[-0.03em] text-ink tabular-nums leading-none">
                        {weather ? weather.humidity : "—"}
                      </span>
                      {weather ? (
                        <span className="text-[18px] font-medium text-ink-3">%</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <VitalLabel>Wind</VitalLabel>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[42px] sm:text-[46px] font-semibold tracking-[-0.03em] text-ink tabular-nums leading-none">
                        {windParts ? windParts[0] : "—"}
                      </span>
                      {windParts ? (
                        <span className="text-[18px] font-medium text-ink-3">{windParts[1]}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiet status rule — one hairline, inline labels + compact badges */}
            <div className="mt-9 lg:mt-12 pt-6 border-t border-line-2 flex flex-wrap items-center gap-x-8 gap-y-3">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  Environmental status
                </span>
                <StatusBadge text={levelMeta.label} pillClass={levelMeta.pillClass} />
              </span>
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                  Primary risk
                </span>
                <PrimaryIcon className="w-3.5 h-3.5 text-ink-3 shrink-0" aria-hidden />
                <span className="text-[13px] font-medium text-ink">
                  {primary ? primary.def.label : "Not assessed"}
                </span>
                {primary ? (
                  <StatusBadge
                    text={RISK_META[primary.run.result.riskLevel].label}
                    pillClass={RISK_META[primary.run.result.riskLevel].pillClass}
                  />
                ) : null}
              </span>
            </div>
          </div>

          {/* One concise AI insight */}
          <div className="border-t border-line bg-surface-2 px-5 sm:px-6 py-4 flex gap-3.5 items-start">
            <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
                EcoGuard insight
              </p>
              <p className="mt-1 text-[15px] leading-relaxed text-ink">{firstInsightSentence}</p>
              <details className="group mt-3 border-t border-line pt-2.5">
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
        </div>
      </section>

      {/* ── Air quality ─────────────────────────────────────────────── */}
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
        <Card>
          <CardBody className="pt-5 pb-2">
            <AqiTrendChart data={data.hourly} />
          </CardBody>
          <div className="border-t border-line-2 px-5 py-4 grid gap-5 sm:grid-cols-2">
            <div className="space-y-3.5 self-center">
              {air ? (
                <>
                  {pollutantBar("PM2.5", air.pm25, 50, "bg-accent")}
                  {pollutantBar("PM10", air.pm10, 100, "bg-[#9aa19b]")}
                </>
              ) : (
                <p className="text-sm text-ink-3">Pollutant data unavailable</p>
              )}
            </div>
            <div className="sm:border-l sm:border-line-2 sm:pl-5 self-center min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                Agent summary
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2 line-clamp-3">
                {runsById["air-quality"]?.result.summary || "Detailed analysis unavailable."}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* ── Climate & forecast ──────────────────────────────────────── */}
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
          <CardHeader title="7-day outlook" subtitle="Temperature range & rainfall" />
          <CardBody className="grid gap-6 lg:grid-cols-2 pt-1 pb-5">
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

      {/* ── Hazards ─────────────────────────────────────────────────── */}
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
            {HAZARDS.map((domain) => {
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

      {/* ── Recommendations + alerts ───────────────────────────────── */}
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

      {/* ── Sources ─────────────────────────────────────────────────── */}
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
