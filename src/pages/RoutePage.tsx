import { useEffect, useRef, useState } from "react";
import { Calculator, MapPin } from "lucide-react";
import type { RouteComparisonPayload, RouteOption } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { Button } from "../components/ui/Button";
import { ErrorState, InlineError, NoticeStrip, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";
import { ExposureBarChart } from "../components/charts/Charts";
import { formatDistance } from "../utils/format";

interface RoutesPayload {
  location: { id: string; name: string; region: string; lat: number; lon: number };
  routes: RouteOption[];
  dataState: string;
  note: string;
}

export default function RoutePage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<RoutesPayload>(
    `/api/routes?locationId=${settings.locationId}`,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<RouteComparisonPayload | null>(null);
  const [pending, setPending] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const locIdRef = useRef(settings.locationId);

  useEffect(() => {
    if (locIdRef.current === settings.locationId) return;
    locIdRef.current = settings.locationId;
    setSelected([]);
    setComparison(null);
    setCompareError(null);
    setPending(false);
  }, [settings.locationId]);

  const toggle = (id: string) => {
    setComparison(null);
    setCompareError(null);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  };

  const compare = async () => {
    if (selected.length < 2) {
      setCompareError("Select at least two routes to compare.");
      return;
    }
    const forLocation = settings.locationId;
    setPending(true);
    setCompareError(null);
    try {
      const result = await api.compareRoutes(forLocation, selected);
      if (locIdRef.current !== forLocation) return;
      setComparison(result);
    } catch (err) {
      if (locIdRef.current !== forLocation) return;
      setCompareError(err instanceof ApiClientError ? err.message : "Comparison failed.");
    } finally {
      if (locIdRef.current === forLocation) setPending(false);
    }
  };

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No route data returned." onRetry={reload} />;

  const selectedRoutes = data.routes.filter((r) => selected.includes(r.id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Green Route"
        subtitle={`${data.location.name} — compare routes by estimated exposure`}
        actions={<DataStateBadge state="estimated" />}
      />

      <NoticeStrip tone="blue">
        <strong className="font-semibold">Exposure values are estimates</strong> — area AQI ×
        duration × green-cover adjustment, never a measured dose. A route is only called safer
        when the estimated difference exceeds its 10% noise band.
      </NoticeStrip>

      <Card>
        <CardHeader title="Select routes to compare" subtitle="Pick 2–3 routes" />
        <CardBody className="pt-1 grid gap-3 sm:grid-cols-3">
          {data.routes.map((route) => {
            const active = selected.includes(route.id);
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => toggle(route.id)}
                aria-pressed={active}
                className={`text-left p-4 rounded-lg border transition-colors ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface hover:bg-surface-2 hover:border-[#d8d5cc]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-sm font-semibold ${active ? "text-accent-2" : "text-ink"}`}
                  >
                    {route.name}
                  </p>
                  <input
                    type="checkbox"
                    checked={active}
                    readOnly
                    aria-label={`Select ${route.name}`}
                    className="accent-[#2e6b4f] w-4 h-4"
                  />
                </div>
                <dl className="mt-2.5 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Distance</dt>
                    <dd className="font-medium text-ink-2">
                      {formatDistance(route.distanceKm, settings.units)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Est. time</dt>
                    <dd className="font-medium text-ink-2">{route.durationMin} min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Avg AQI</dt>
                    <dd className="font-medium text-ink-2 tabular-nums">{route.avgAqi}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-3">Green cover</dt>
                    <dd className="font-medium text-ink-2 tabular-nums">
                      {Math.round(route.greenFraction * 100)}%
                    </dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={compare} disabled={pending || selected.length < 2}>
          <Calculator className="w-4 h-4" aria-hidden />
          {pending ? "Comparing…" : `Compare ${selected.length || ""} routes`}
        </Button>
        {selectedRoutes.length > 0 && !comparison ? (
          <p className="text-xs text-ink-3 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" aria-hidden />
            {selectedRoutes.length} route(s) selected.
          </p>
        ) : null}
      </div>
      {compareError ? <InlineError message={compareError} /> : null}

      {comparison ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3 items-start">
            <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {comparison.routes.map((route) => (
                <Card key={route.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink leading-tight">{route.name}</p>
                    <DataStateBadge state="estimated" />
                  </div>
                  <p className="mt-3 text-[30px] font-semibold tabular-nums text-ink tracking-[-0.02em] leading-none">
                    {route.exposureIndex}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-3">estimated exposure index</p>
                  <dl className="mt-3 space-y-1 text-xs border-t border-line-2 pt-2.5">
                    <div className="flex justify-between">
                      <dt className="text-ink-3">Distance</dt>
                      <dd className="font-medium text-ink-2">
                        {formatDistance(route.distanceKm, settings.units)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-3">Time</dt>
                      <dd className="font-medium text-ink-2">{route.durationMin} min</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-3">Avg AQI</dt>
                      <dd className="font-medium text-ink-2 tabular-nums">{route.avgAqi}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader title="Estimated exposure" subtitle="Estimates only — not measurements" />
              <CardBody className="pt-1">
                <ExposureBarChart routes={comparison.routes} />
              </CardBody>
            </Card>
          </div>

          <AgentResultCard run={comparison.agentRun} defaultOpenLimitations />
        </div>
      ) : null}
    </div>
  );
}
