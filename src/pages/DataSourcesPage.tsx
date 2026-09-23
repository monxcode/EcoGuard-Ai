import { Database, KeyRound } from "lucide-react";
import type { DataSourcesPayload } from "../../shared/types";
import { useApi } from "../hooks/useApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { ErrorState, PageSkeleton } from "../components/ui/states";

export default function DataSourcesPage() {
  const { data, loading, error, reload } = useApi<DataSourcesPayload>("/api/data-sources");

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Data-source status unavailable." onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        subtitle="Where every number on this app comes from — and whether it is live, demo, estimated or unavailable"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Global demo mode</p>
          <div className="mt-2">
            <DataStateBadge state={data.globalDemoMode ? "demo" : data.preferredProvider === "live" ? "live" : "demo"} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {data.globalDemoMode
              ? "Forced demo mode is ON — every provider serves fixtures."
              : `Preferred provider: ${data.preferredProvider}. Failed live calls surface as unavailable — demo data appears only when Demo Mode is explicitly on.`}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gemini AI</p>
          <div className="mt-2">
            <DataStateBadge state={data.geminiConfigured ? "live" : "unavailable"} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {data.geminiConfigured
              ? "Server-side Gemini configured; AI output is schema-validated."
              : "No GEMINI_API_KEY — deterministic rules-based fallbacks are used and labeled."}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Key policy</p>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-700">
            <KeyRound className="w-4 h-4 text-slate-400" aria-hidden />
            Server-side only
          </div>
          <p className="mt-2 text-xs text-slate-500">
            All third-party calls happen in the Express server — the browser only talks to our own
            API.
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Provider status by domain"
          icon={<Database className="w-4 h-4 text-slate-400" aria-hidden />}
        />
        <CardBody className="pt-2 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4 font-semibold">Domain</th>
                <th className="py-2 pr-4 font-semibold">Provider</th>
                <th className="py-2 pr-4 font-semibold">State</th>
                <th className="py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map((p) => (
                <tr key={p.domain} className="border-b border-slate-100 align-top">
                  <td className="py-3 pr-4 font-medium text-slate-800">{p.domain}</td>
                  <td className="py-3 pr-4 text-slate-600">{p.provider}</td>
                  <td className="py-3 pr-4">
                    <DataStateBadge state={p.state} />
                  </td>
                  <td className="py-3 text-xs text-slate-500">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-slate-600">
          To move a domain to live data, configure the matching server-side environment variables
          (see <code className="text-xs bg-slate-100 px-1 rounded">.env.example</code>) and set{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">DATA_PROVIDER=live</code>. If a live
          call fails, that domain shows <strong>Unavailable</strong> instead of silently switching
          to demo data — turn Demo Mode on explicitly (Settings or Demo page) when you want
          fixtures.
        </p>
      </Card>
    </div>
  );
}
