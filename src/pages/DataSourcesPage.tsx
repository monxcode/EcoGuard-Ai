import { KeyRound, ShieldCheck } from "lucide-react";
import type { DataSourcesPayload } from "../../shared/types";
import { useApi } from "../hooks/useApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { ErrorState, PageSkeleton } from "../components/ui/states";
import { MetricPanel } from "../components/ui/StatTile";

export default function DataSourcesPage() {
  const { data, loading, error, reload } = useApi<DataSourcesPayload>("/api/data-sources");

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Data-source status unavailable." onRetry={reload} />;

  const cells = [
    {
      label: "Global demo mode",
      value: (
        <DataStateBadge
          state={data.globalDemoMode ? "demo" : data.preferredProvider === "live" ? "live" : "demo"}
        />
      ),
      note: data.globalDemoMode
        ? "Forced demo mode is ON — every provider serves fixtures."
        : `Preferred provider: ${data.preferredProvider}. Failed live calls surface as unavailable — demo data appears only when Demo Mode is explicitly on.`,
    },
    {
      label: "Gemini AI",
      value: <DataStateBadge state={data.geminiConfigured ? "live" : "unavailable"} />,
      note: data.geminiConfigured
        ? "Server-side Gemini configured; AI output is schema-validated."
        : "No GEMINI_API_KEY — deterministic rules-based fallbacks are used and labeled.",
    },
    {
      label: "Key policy",
      value: (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
          {data.geminiConfigured ? (
            <ShieldCheck className="w-4 h-4 text-accent" aria-hidden />
          ) : (
            <KeyRound className="w-4 h-4 text-ink-3" aria-hidden />
          )}
          Server-side only
        </span>
      ),
      note: "All third-party calls happen in the Express server — the browser only talks to our own API.",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Sources"
        subtitle="Where every number comes from — and whether it is live, demo, estimated or unavailable"
      />

      <MetricPanel>
        {cells.map((cell) => (
          <div key={cell.label} className="px-4 py-3.5 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {cell.label}
            </p>
            <div className="mt-2">{cell.value}</div>
            <p className="mt-2 text-xs text-ink-3 leading-relaxed">{cell.note}</p>
          </div>
        ))}
      </MetricPanel>

      <Card>
        <CardHeader title="Provider status by domain" subtitle="One row per environment domain" />
        <CardBody className="pt-2 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3 border-b border-line">
                <th className="py-2.5 pr-4">Domain</th>
                <th className="py-2.5 pr-4">Provider</th>
                <th className="py-2.5 pr-4">State</th>
                <th className="py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map((p) => (
                <tr key={p.domain} className="border-b border-line-2 last:border-0 align-top">
                  <td className="py-3 pr-4 font-medium text-ink">{p.domain}</td>
                  <td className="py-3 pr-4 text-ink-2">{p.provider}</td>
                  <td className="py-3 pr-4">
                    <DataStateBadge state={p.state} />
                  </td>
                  <td className="py-3 text-xs text-ink-3 leading-relaxed">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card className="p-4 bg-surface-2">
        <p className="text-sm text-ink-2 leading-relaxed">
          To move a domain to live data, set the matching server-side environment variables (see{" "}
          <code className="text-xs font-mono bg-line-2 px-1.5 py-0.5 rounded">.env.example</code>)
          and{" "}
          <code className="text-xs font-mono bg-line-2 px-1.5 py-0.5 rounded">
            DATA_PROVIDER=live
          </code>
          . A failed live call shows <strong className="font-semibold text-ink">Unavailable</strong>{" "}
          instead of silently switching to demo data.
        </p>
      </Card>
    </div>
  );
}
