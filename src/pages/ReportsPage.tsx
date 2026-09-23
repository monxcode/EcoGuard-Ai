import { useEffect, useRef, useState } from "react";
import { FileText, Plus, Printer, ArrowLeft } from "lucide-react";
import type { EnvironmentalReport } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { RiskPill } from "../components/ui/RiskPill";
import { Button, Chip, inputClass } from "../components/ui/Button";
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

const COLUMN_TONES = {
  observed: {
    label: "Observed data",
    wrap: "bg-surface-2 border-line",
    labelClass: "text-ink-3",
    dot: "bg-ink-3",
  },
  interpretation: {
    label: "AI interpretation",
    wrap: "bg-blue-soft border-blue-line",
    labelClass: "text-blue-2",
    dot: "bg-blue",
  },
  recommendations: {
    label: "Recommendations",
    wrap: "bg-accent-soft border-accent-line",
    labelClass: "text-accent-2",
    dot: "bg-accent",
  },
} as const;

function ReportColumn({
  tone,
  items,
}: {
  tone: keyof typeof COLUMN_TONES;
  items: string[];
}) {
  const meta = COLUMN_TONES[tone];
  return (
    <div className={`rounded-lg border p-3.5 ${meta.wrap}`}>
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.08em] mb-2.5 ${meta.labelClass}`}
      >
        {meta.label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[13px] text-ink-2 leading-relaxed">
            <span className={`mt-[7px] w-1 h-1 rounded-full shrink-0 ${meta.dot}`} aria-hidden />
            {item}
          </li>
        ))}
        {items.length === 0 ? <li className="text-[13px] text-ink-3">None.</li> : null}
      </ul>
    </div>
  );
}

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
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              Report generated
            </p>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em] text-ink leading-tight">
              {report.title}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" aria-hidden />
              Print / PDF
            </Button>
            <Button variant="primary" onClick={() => setReport(null)}>
              <Plus className="w-4 h-4" aria-hidden />
              New report
            </Button>
          </div>
        </div>

        {/* Document sheet */}
        <article className="max-w-4xl mx-auto bg-surface border border-line rounded-xl shadow-[0_1px_3px_rgba(26,29,26,0.05)] px-5 sm:px-9 py-7 sm:py-9 print-block">
          <header className="pb-5 border-b border-line">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
                  EcoGuard AI · Environmental report
                </p>
                <h2 className="mt-1.5 text-[22px] font-semibold tracking-[-0.02em] text-ink leading-snug">
                  {report.title}
                </h2>
                <p className="mt-1.5 text-[13px] text-ink-3">
                  {report.location.name}, {report.location.region} ·{" "}
                  {formatTimestamp(report.generatedAt)} ·{" "}
                  <span className="font-mono text-[11px]">{report.id}</span>
                </p>
              </div>
              <RiskPill level={report.overallRisk} size="lg" />
            </div>
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              <Chip tone={report.usedGemini ? "blue" : "neutral"}>
                {report.usedGemini ? "Gemini interpretation" : "Rules-based interpretation"}
              </Chip>
              {report.agentsUsed.map((name) => (
                <Chip key={name} tone="accent">
                  {name}
                </Chip>
              ))}
            </div>
          </header>

          <div className="space-y-7 mt-6">
            {report.sections.map((section) => (
              <section key={section.id} className="print-block">
                <h3 className="text-[15px] font-semibold text-ink pb-2 border-b border-line-2">
                  {section.title}
                </h3>
                <div className="grid gap-3 mt-3.5 lg:grid-cols-3">
                  <ReportColumn tone="observed" items={section.observed} />
                  <ReportColumn tone="interpretation" items={section.interpretation} />
                  <ReportColumn tone="recommendations" items={section.recommendations} />
                </div>
              </section>
            ))}
          </div>

          <section className="mt-7 print-block">
            <h3 className="text-[15px] font-semibold text-ink pb-2 border-b border-line-2">
              Key findings
            </h3>
            <ul className="space-y-2 mt-3.5">
              {report.keyFindings.map((f, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] text-ink-2 leading-relaxed">
                  <span className="mt-[8px] w-1 h-1 rounded-full bg-accent shrink-0" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-7 print-block">
            <h3 className="text-[15px] font-semibold text-ink pb-2 border-b border-line-2">
              Data sources
            </h3>
            <div className="flex flex-wrap gap-1.5 mt-3.5">
              {report.dataSources.map((src) => (
                <Chip key={src}>{src}</Chip>
              ))}
            </div>
          </section>

          <section className="mt-7 print-block">
            <h3 className="text-[15px] font-semibold text-ink pb-2 border-b border-line-2">
              Limitations
            </h3>
            <ul className="space-y-1.5 mt-3.5 text-[13px] text-ink-3 list-disc pl-4">
              {report.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-5 pt-4 border-t border-line-2 text-xs text-ink-3 leading-relaxed">
              Generated by EcoGuard AI. Observed data comes from the listed providers; all
              interpretation and recommendations are machine-generated screening guidance — not
              official government decisions or certified environmental science.
            </p>
          </section>
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Generate a structured environmental assessment for the selected location"
      />

      <Card>
        <CardHeader
          title="Configure report"
          subtitle="Observed data, AI interpretation and recommendations are always kept separate"
        />
        <CardBody className="pt-1 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <LocationSearch variant="block" label="Location" id="report-location" />
            <label className="block">
              <span className="block text-[13px] font-medium text-ink-2 mb-1.5">
                Report title (optional)
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Weekly environmental briefing"
                className={inputClass}
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-[13px] font-medium text-ink-2 mb-2">Include sections</legend>
            <div className="flex flex-wrap gap-2">
              {SECTION_OPTIONS.map((opt) => {
                const active = include.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`inline-flex items-center gap-2 px-3 h-8 text-[13px] rounded-lg border cursor-pointer transition-colors ${
                      active
                        ? "border-accent bg-accent-soft text-accent-2 font-medium"
                        : "border-line bg-surface text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleInclude(opt.id)}
                      className="accent-[#2e6b4f]"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? <InlineError message={error} /> : null}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              onClick={generate}
              disabled={pending || include.length === 0}
            >
              <FileText className="w-4 h-4" aria-hidden />
              {pending ? "Generating assessment…" : "Generate report"}
            </Button>
            {pending ? (
              <span className="text-xs text-ink-3" role="status">
                Combining agent outputs…
              </span>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <Card className="p-4 bg-surface-2">
        <p className="text-[13px] text-ink-2 leading-relaxed flex gap-2.5">
          <ArrowLeft className="w-4 h-4 mt-0.5 text-ink-3 shrink-0 hidden sm:block" aria-hidden />
          Reports combine every domain agent&rsquo;s output for the location — always separating{" "}
          <strong className="font-semibold text-ink">observed data</strong>,
          <strong className="font-semibold text-ink"> AI interpretation</strong> and
          <strong className="font-semibold text-ink"> recommendations</strong>, with sources and
          limitations per section.
        </p>
      </Card>
    </div>
  );
}
