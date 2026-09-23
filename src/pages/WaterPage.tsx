import { CloudRain, Droplets, Thermometer } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import type { WaterPayload } from "../../shared/types";
import { PageHeader, SectionHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { StatTile, MetricPanel } from "../components/ui/StatTile";
import { ErrorState, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { RainfallChart, RainfallHistoryChart } from "../components/charts/Charts";
import { formatTempFull } from "../utils/format";
import { sum } from "../utils/math";

export default function WaterPage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<WaterPayload>(
    `/api/water?locationId=${settings.locationId}`,
  );

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No water data returned." onRetry={reload} />;

  const past14 = data.rainfallHistory.days14;
  const rain7 = sum(data.daily.map((d) => d.precipitationMm));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Water Intelligence"
        subtitle={`${data.location.name}, ${data.location.region} — WaterGuard assessment`}
        actions={
          <div className="flex items-center gap-2">
            <DataStateBadge state={data.rainfallHistory.state} />
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

      <MetricPanel columns="grid-cols-1 sm:grid-cols-3">
        <StatTile
          label="14-day rainfall"
          value={past14.length > 0 ? sum(past14).toFixed(0) : "—"}
          unit="mm"
          icon={CloudRain}
          dataState={data.rainfallHistory.state}
          sub={past14.length > 0 ? "Observed history" : "Not configured for live mode"}
        />
        <StatTile
          label="7-day forecast rain"
          value={rain7.toFixed(0)}
          unit="mm"
          icon={Droplets}
          dataState={data.states.forecast}
          sub="Coming week"
        />
        <StatTile
          label="Temperature"
          value={data.weather ? formatTempFull(data.weather.temperature, settings.units) : "—"}
          icon={Thermometer}
          dataState={data.states.weather}
          sub="Current conditions"
        />
      </MetricPanel>

      <section>
        <SectionHeader
          title="Rainfall"
          action={
            <div className="flex items-center gap-2">
              <DataStateBadge state={data.rainfallHistory.state} />
              <DataStateBadge state={data.states.forecast} />
            </div>
          }
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="History · 14 days" />
            <CardBody className="pt-1">
              <RainfallHistoryChart days={past14} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Outlook · 7 days" />
            <CardBody className="pt-1">
              <RainfallChart data={data.daily} />
            </CardBody>
          </Card>
        </div>
      </section>

      <AgentResultCard run={data.agentRun} />
    </div>
  );
}
