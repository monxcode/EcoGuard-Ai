import { ChevronDown, CloudRain, Droplets, Flame, Thermometer, Wind } from "lucide-react";
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
    { id: "heat-risk", label: "Heat Risk", icon: Thermometer },
    { id: "flood-risk", label: "Flood Risk", icon: CloudRain },
    { id: "wildfire-risk", label: "Wildfire Risk", icon: Flame },
    { id: "water-stress", label: "Water Stress", icon: Droplets },
  ] as const;

  const firstInsightSentence = data.advisory.text.split(/(?<=[.!?])\s+/)[0] || "Analyzing environmental data.";

  return (
    <div className="space-y-12 pb-10">
      
      {/* Hero Section */}
      <section className="pt-2">
        <div className="flex flex-col gap-1 mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#111111] tracking-tight">{data.location.name}</h1>
            <DataStateBadge state={data.states.air} className="mt-2" />
          </div>
          <p className="text-sm text-[#888888] font-medium tracking-[0.02em]">
            {data.location.region} · Updated {formatTimestamp(data.generatedAt)}
          </p>
        </div>

        {data.errors.length > 0 ? (
          <div className="mb-8 p-4 rounded-xl bg-[#FFF4F2] border border-[#FCDED8] text-[#C0492E] text-sm">
            <p className="font-semibold mb-1">Data availability issues:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              {data.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          {/* AQI Block */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888888] mb-1">Air Quality</p>
            <div className="flex items-baseline gap-2.5">
              <span className="text-6xl font-semibold tracking-tighter text-[#111111] leading-none">
                {air?.aqi ?? "--"}
              </span>
              {category && <span className="text-lg font-medium text-[#666666] tracking-tight">{category.label}</span>}
            </div>
          </div>
          
          <div className="hidden sm:block w-px h-12 bg-[#EAEAEA]" />

          {/* Weather Block */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888888] mb-1">Current</p>
            <div className="flex items-center gap-3">
              {weather ? <WeatherGlyph className="w-8 h-8 text-[#111111]" aria-hidden /> : null}
              <span className="text-5xl font-semibold tracking-tighter text-[#111111] leading-none">
                {weather ? formatTempFull(weather.temperature, settings.units) : "--"}
              </span>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-[#EAEAEA]" />

          {/* Risk Block */}
          <div className="pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888888] mb-2">Primary Risk</p>
            {data.overall ? (
              <RiskPill level={data.overall.result.riskLevel} size="lg" className="shadow-sm" />
            ) : (
              <span className="text-sm text-[#888888]">Unavailable</span>
            )}
          </div>
        </div>

        <div className="mt-8 p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[16px] shadow-[0_2px_8px_-4px_rgba(0,0,0,0.02)] max-w-3xl">
          <div className="flex gap-3">
            <div className="w-1.5 h-auto bg-[#10b981] rounded-full shrink-0" />
            <p className="text-[15px] text-[#222222] leading-relaxed font-medium">
              {firstInsightSentence}
            </p>
          </div>
        </div>
      </section>

      {/* Air Intelligence */}
      <section>
        <h2 className="text-xl font-bold text-[#111111] mb-4 tracking-tight">Air Intelligence</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="24-Hour Trend" action={<DataStateBadge state={data.states.airTrend} />} />
            <CardBody className="pt-2">
              <AqiTrendChart data={data.hourly} />
            </CardBody>
          </Card>
          
          <Card>
            <CardHeader title="Primary Pollutants" />
            <CardBody className="pt-0">
               {air ? (
                 <div className="space-y-4">
                   <div>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="text-[#666666] font-medium">PM2.5</span>
                       <span className="font-semibold text-[#111111]">{air.pm25} <span className="text-[10px] text-[#888888] font-normal">µg/m³</span></span>
                     </div>
                     <div className="h-1.5 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
                       <div className="h-full bg-[#111111] rounded-full" style={{ width: `${Math.min(100, (air.pm25 / 50) * 100)}%` }} />
                     </div>
                   </div>
                   <div>
                     <div className="flex justify-between text-sm mb-1">
                       <span className="text-[#666666] font-medium">PM10</span>
                       <span className="font-semibold text-[#111111]">{air.pm10} <span className="text-[10px] text-[#888888] font-normal">µg/m³</span></span>
                     </div>
                     <div className="h-1.5 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
                       <div className="h-full bg-[#666666] rounded-full" style={{ width: `${Math.min(100, (air.pm10 / 100) * 100)}%` }} />
                     </div>
                   </div>
                   <div className="pt-2">
                     <p className="text-xs text-[#888888] leading-relaxed">
                       {runsById["air-quality"]?.result.summary || "Detailed analysis unavailable."}
                     </p>
                   </div>
                 </div>
               ) : (
                 <p className="text-sm text-[#888888]">Data unavailable</p>
               )}
            </CardBody>
          </Card>
        </div>
      </section>

      {/* Climate & Forecast */}
      <section>
        <div className="flex items-center justify-between mb-4">
           <h2 className="text-xl font-bold text-[#111111] tracking-tight">Climate & Forecast</h2>
           <DataStateBadge state={data.states.forecast} />
        </div>
        <Card>
          <CardBody className="grid gap-8 lg:grid-cols-2 p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.05em] font-semibold text-[#888888] mb-4">Temperature</p>
              <TemperatureRangeChart data={data.daily} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.05em] font-semibold text-[#888888] mb-4">Rainfall</p>
              <RainfallChart data={data.daily} />
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Hazard Overview */}
      <section>
        <h2 className="text-xl font-bold text-[#111111] mb-4 tracking-tight">Hazard Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {domains.map((domain) => {
            const run = runsById[domain.id];
            const DIcon = domain.icon;
            return (
              <Card key={domain.id} className="flex flex-col hover:border-[#D0D0D0] transition-colors">
                <CardBody className="flex-1 flex flex-col p-5">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 text-[#111111]">
                       <DIcon className="w-4 h-4 text-[#888888]" />
                       <span className="text-sm font-semibold tracking-tight">{domain.label}</span>
                    </div>
                    {run ? (
                      <RiskPill level={run.result.riskLevel} size="sm" />
                    ) : (
                      <span className="text-[11px] text-[#888888]">—</span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#666666] leading-relaxed line-clamp-3">
                    {run ? run.result.summary : "Assessment unavailable."}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Recommendations & Alerts */}
      <section className="grid gap-6 lg:grid-cols-2">
         <div>
            <h2 className="text-xl font-bold text-[#111111] mb-4 tracking-tight">Active Alerts</h2>
            {data.alerts.length === 0 ? (
               <Card>
                  <CardBody className="py-8 text-center">
                     <p className="text-sm text-[#888888]">No elevated-risk alerts for this location.</p>
                  </CardBody>
               </Card>
            ) : (
               <div className="space-y-3">
                  {data.alerts.map((alert) => (
                    <Card key={alert.id} className="border-[#FCDED8] shadow-[0_4px_12px_rgba(229,72,77,0.05)]">
                       <CardBody className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-[#111111]">{alert.title}</p>
                            <RiskPill level={alert.severity} size="sm" />
                          </div>
                          <p className="text-[13px] text-[#666666] leading-relaxed">{alert.message}</p>
                       </CardBody>
                    </Card>
                  ))}
               </div>
            )}
         </div>

         <div>
            <h2 className="text-xl font-bold text-[#111111] mb-4 tracking-tight">AI Insights</h2>
            <Card>
               <CardBody className="p-5 space-y-4">
                  <p className="text-[14px] text-[#444444] leading-relaxed whitespace-pre-wrap">
                     {data.advisory.text}
                  </p>
                  <details className="group border-t border-[#F0F0F0] pt-4">
                     <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[#888888] hover:text-[#111111] uppercase tracking-[0.05em] transition-colors">
                       <span>Analysis Details</span>
                       <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden />
                     </summary>
                     <div className="mt-4 space-y-4">
                       <div>
                          <p className="text-[11px] text-[#666666] mb-2 uppercase tracking-[0.05em]">Agents Used</p>
                          <div className="flex flex-wrap gap-2">
                             {data.advisory.agentsUsed.map((name) => (
                               <span key={name} className="px-2 py-1 text-[11px] font-medium bg-[#FAFAFA] text-[#111111] border border-[#EAEAEA] rounded-md">
                                 {name}
                               </span>
                             ))}
                          </div>
                       </div>
                       {data.advisory.limitations.length > 0 && (
                          <div>
                             <p className="text-[11px] text-[#666666] mb-2 uppercase tracking-[0.05em]">Limitations</p>
                             <ul className="text-xs text-[#666666] list-disc pl-4 space-y-1">
                               {data.advisory.limitations.map((item) => (
                                 <li key={item}>{item}</li>
                               ))}
                             </ul>
                          </div>
                       )}
                     </div>
                  </details>
               </CardBody>
            </Card>
         </div>
      </section>

      {/* Provider Info */}
      <section className="pt-4 border-t border-[#EAEAEA]">
         <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-[#888888]">
            <span>Air: {data.sources.air}</span>
            <span>Weather: {data.sources.weather}</span>
            <span>Trend: {data.sources.airTrend}</span>
            <span>Forecast: {data.sources.forecast}</span>
         </div>
      </section>
      
    </div>
  );
}
