import { useEffect, useRef, useState } from "react";
import { Calculator, MapPin } from "lucide-react";
import type { RouteComparisonPayload, RouteOption } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { ErrorState, InlineError, PageSkeleton } from "../components/ui/states";
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
        subtitle={`${data.location.name} — compare routes by estimated environmental exposure`}
        actions={<DataStateBadge state="estimated" />}
      />

      <Card className="border-sky-200 bg-sky-50 p-4">
        <p className="text-sm text-sky-900">
          <strong className="font-semibold">Exposure values are estimates.</strong> Routing provider
          is not configured, so route options are demo fixtures and exposure is derived from
          area-level AQI × duration × green-cover adjustment — never a measured dose. EcoGuard does
          not declare a route "safer" unless the estimated difference exceeds its 10% noise band.
        </p>
      </Card>

      <Card>
        <CardHeader
          title="Select routes to compare"
          subtitle="Pick 2–3 routes"
          action={<DataStateBadge state="demo" />}
        />
        <CardBody className="pt-2 grid gap-3 sm:grid-cols-3">
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
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">{route.name}</p>
                  <input
                    type="checkbox"
                    checked={active}
                    readOnly
                    aria-label={`Select ${route.name}`}
                    className="accent-emerald-700 w-4 h-4"
                  />
                </div>
                <dl className="mt-2 space-y-0.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <dt>Distance</dt>
                    <dd className="font-medium">{formatDistance(route.distanceKm, settings.units)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Est. time</dt>
                    <dd className="font-medium">{route.durationMin} min</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Avg AQI</dt>
                    <dd className="font-medium">{route.avgAqi}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Green cover</dt>
                    <dd className="font-medium">{Math.round(route.greenFraction * 100)}%</dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </CardBody>
      </Card>

      <button
        type="button"
        onClick={compare}
        disabled={pending || selected.length < 2}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
      >
        <Calculator className="w-4 h-4" aria-hidden />
        {pending ? "Comparing…" : `Compare ${selected.length || ""} routes`}
      </button>
      {compareError ? <InlineError message={compareError} /> : null}

      {comparison ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {comparison.routes.map((route) => (
                <Card key={route.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{route.name}</p>
                    <DataStateBadge state="estimated" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">
                    {route.exposureIndex}
                  </p>
                  <p className="text-xs text-slate-500">estimated exposure index</p>
                  <dl className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <dt>Distance</dt>
                      <dd className="font-medium">{formatDistance(route.distanceKm, settings.units)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Time</dt>
                      <dd className="font-medium">{route.durationMin} min</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Avg AQI</dt>
                      <dd className="font-medium">{route.avgAqi}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader title="Estimated exposure" subtitle="Estimates only — not measurements" />
              <CardBody className="pt-2">
                <ExposureBarChart routes={comparison.routes} />
              </CardBody>
            </Card>
          </div>

          <AgentResultCard run={comparison.agentRun} defaultOpenLimitations />
        </div>
      ) : null}

      {selectedRoutes.length > 0 && !comparison ? (
          <p className="text-xs text-slate-500 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" aria-hidden />
          {selectedRoutes.length} route(s) selected.
        </p>
      ) : null}
    </div>
  );
}
