import { useEffect, useRef, useState } from "react";
import { Database, FileText, Lightbulb, Plus, Printer } from "lucide-react";
import type { EnvironmentalReport } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { RiskPill } from "../components/ui/RiskPill";
import { InlineError } from "../components/ui/states";
import { LocationSearch } from "../components/ui/LocationSearch";
import { formatTimestamp } from "../utils/format";

const SECTION_OPTIONS = [
  { id: "summary", label: "Executive summary" },
  { id: "air", label: "Air quality" },
  { id: "climate", label: "Climate & heat" },
  { id: "disaster", label: "Disaster risk" },
  { id: "water", label: "Water status" },
];

export default function ReportsPage() {
  const { settings } = useApp();
  const [title, setTitle] = useState("");
  const [include, setInclude] = useState<string[]>(SECTION_OPTIONS.map((s) => s.id));
  const [report, setReport] = useState<EnvironmentalReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locIdRef = useRef(settings.locationId);

  useEffect(() => {
    if (locIdRef.current === settings.locationId) return;
    locIdRef.current = settings.locationId;
    setReport(null);
    setError(null);
    setPending(false);
  }, [settings.locationId]);

  const toggleInclude = (id: string) =>
    setInclude((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const generate = async () => {
    const forLocation = settings.locationId;
    setPending(true);
    setError(null);
    try {
      const result = await api.generateReport({
        locationId: forLocation,
        title: title.trim() || undefined,
        include,
      });
      if (locIdRef.current !== forLocation) return;
      setReport(result);
    } catch (err) {
      if (locIdRef.current !== forLocation) return;
      setError(err instanceof ApiClientError ? err.message : "Report generation failed.");
    } finally {
      if (locIdRef.current === forLocation) setPending(false);
    }
  };

  if (report) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <PageHeader
            title="Report generated"
            subtitle="Observed data, AI interpretation and recommendations are kept separate."
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" aria-hidden />
              Print / PDF
            </button>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              <Plus className="w-4 h-4" aria-hidden />
              New report
            </button>
          </div>
        </div>

        <Card className="print-block">
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{report.title}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {report.location.name}, {report.location.region} · {formatTimestamp(report.generatedAt)} ·{" "}
                  <span className="font-mono text-xs">{report.id}</span>
                </p>
              </div>
              <RiskPill level={report.overallRisk} size="lg" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {report.agentsUsed.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full"
                >
                  {name}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          {report.sections.map((section) => (
            <Card key={section.id} className="print-block">
              <CardHeader title={section.title} />
              <CardBody className="pt-2 grid gap-4 lg:grid-cols-3">
                <div className="border-l-4 border-slate-400 bg-slate-50 rounded-r-lg p-3">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                    <Database className="w-3.5 h-3.5" aria-hidden />
                    Observed data
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-700 list-disc pl-4">
                    {section.observed.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                    {section.observed.length === 0 ? <li className="text-slate-400">None.</li> : null}
                  </ul>
                </div>
                <div className="border-l-4 border-violet-400 bg-violet-50/70 rounded-r-lg p-3">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700 mb-2">
                    <Lightbulb className="w-3.5 h-3.5" aria-hidden />
                    AI interpretation
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-700 list-disc pl-4">
                    {section.interpretation.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                    {section.interpretation.length === 0 ? <li className="text-slate-400">None.</li> : null}
                  </ul>
                </div>
                <div className="border-l-4 border-emerald-500 bg-emerald-50/70 rounded-r-lg p-3">
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-2">
                    <FileText className="w-3.5 h-3.5" aria-hidden />
                    Recommendations
                  </h3>
                  <ul className="space-y-1 text-sm text-slate-700 list-disc pl-4">
                    {section.recommendations.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                    {section.recommendations.length === 0 ? <li className="text-slate-400">None.</li> : null}
                  </ul>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 print-block">
          <Card>
            <CardHeader title="Key findings" />
            <CardBody className="pt-2">
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                {report.keyFindings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Data sources" />
            <CardBody className="pt-2 flex flex-wrap gap-1.5">
              {report.dataSources.map((src) => (
                <span key={src} className="px-2 py-0.5 text-[11px] bg-slate-100 border border-slate-200 rounded text-slate-600">
                  {src}
                </span>
              ))}
            </CardBody>
          </Card>
        </div>

        <Card className="print-block">
          <CardHeader title="Limitations" />
          <CardBody className="pt-2">
            <ul className="space-y-1 text-sm text-slate-600 list-disc pl-4">
              {report.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500 border-t border-slate-100 pt-3">
              Generated by EcoGuard AI. Observed data comes from the listed providers; all
              interpretation and recommendations are machine-generated screening guidance — not
              official government decisions or certified environmental science.
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environmental Reports"
        subtitle="Generate a structured assessment for the selected location"
      />

      <Card>
        <CardHeader title="Configure report" />
        <CardBody className="pt-2 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <LocationSearch
              variant="block"
              label="Location"
              id="report-location"
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Report title (optional)</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Weekly environmental briefing"
                className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-300 rounded-lg"
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-700 mb-2">Include sections</legend>
            <div className="flex flex-wrap gap-2">
              {SECTION_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border cursor-pointer ${
                    include.includes(opt.id)
                      ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                      : "border-slate-300 bg-white text-slate-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={include.includes(opt.id)}
                    onChange={() => toggleInclude(opt.id)}
                    className="accent-emerald-700"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error ? <InlineError message={error} /> : null}

          <button
            type="button"
            onClick={generate}
            disabled={pending || include.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
          >
            <FileText className="w-4 h-4" aria-hidden />
            {pending ? "Generating assessment…" : "Generate report"}
          </button>
        </CardBody>
      </Card>

      <Card className="p-4">
        <p className="text-sm text-slate-600">
          A report combines all domain agents' output for the location. It always separates{" "}
          <strong>observed data</strong> from <strong>AI interpretation</strong> and{" "}
          <strong>recommendations</strong>, and lists data sources and limitations per section.
        </p>
      </Card>
    </div>
  );
}
