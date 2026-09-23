import { TriangleAlert } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import type { DisasterPayload } from "../../shared/types";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { RiskPill } from "../components/ui/RiskPill";
import { ErrorState, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { RainfallChart } from "../components/charts/Charts";

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
    <div className="space-y-6">
      <PageHeader
        title="Disaster Intelligence"
        subtitle={`${data.location.name} — FloodSense & WildfireWatch`}
        actions={<DataStateBadge state={data.states.forecast} />}
      />

      {/* Honest availability banner — never fabricate authoritative warnings */}
      <Card className="p-4 border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <TriangleAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-amber-900">
            <strong className="font-semibold">Screening assessments only.</strong> No authoritative
            flood or wildfire warning feed is configured — these are weather-based screenings, not
            official warnings. Follow local disaster-management authorities.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Flood */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Flood risk"
              subtitle="Rainfall/forecast screening"
              action={flood ? <RiskPill level={flood.result.riskLevel} /> : null}
            />
            <CardBody className="pt-2">
              <RainfallChart data={data.daily} />
            </CardBody>
          </Card>
          {flood ? <AgentResultCard run={flood} /> : null}
        </div>

        {/* Wildfire */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Wildfire risk"
              subtitle="Weather-based fire-weather proxy"
              action={wildfire ? <RiskPill level={wildfire.result.riskLevel} /> : null}
            />
            <CardBody className="pt-2 grid grid-cols-3 gap-3">
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-500">Temp</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {data.weather ? `${Math.round(data.weather.temperature)}°` : "—"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-500">Humidity</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {data.weather ? `${data.weather.humidity}%` : "—"}
                </p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-500">Wind</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {data.weather ? `${Math.round(data.weather.windSpeed)}` : "—"}
                </p>
              </div>
            </CardBody>
          </Card>
          {wildfire ? <AgentResultCard run={wildfire} /> : null}
        </div>
      </div>
    </div>
  );
}
