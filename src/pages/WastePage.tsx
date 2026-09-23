import { useRef, useState } from "react";
import {
  BatteryCharging,
  ChevronDown,
  Cpu,
  FileText,
  Leaf,
  Package,
  Recycle,
  TriangleAlert,
  Upload,
} from "lucide-react";
import type { DemoWasteSample, WasteCategory, WasteClassification } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { Button, Chip } from "../components/ui/Button";
import { EmptyState, ErrorState, InlineError, NoticeStrip, PageSkeleton } from "../components/ui/states";
import { AgentResultCard } from "../components/agents/AgentResultCard";

const CATEGORY_ICONS: Record<WasteCategory, typeof Recycle> = {
  plastic: Package,
  paper: FileText,
  glass: Recycle,
  metal: Package,
  organic: Leaf,
  "e-waste": Cpu,
  hazardous: BatteryCharging,
  mixed: Recycle,
  unknown: TriangleAlert,
};

const MAX_BYTES = 4 * 1024 * 1024;

export default function WastePage() {
  const { settings } = useApp();
  const samplesState = useApi<DemoWasteSample[]>(`/api/waste/samples`);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<WasteClassification | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  void settings;

  const onFile = (file: File | undefined) => {
    setError(null);
    setResult(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (png, jpeg, webp or gif).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is larger than 4 MB — please choose a smaller file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      setDataUrl(value);
      setFileName(file.name);
      setSelectedSample(null);
      setPreviewUrl(value);
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsDataURL(file);
  };

  const classify = async () => {
    setPending(true);
    setError(null);
    try {
      const payload = selectedSample
        ? await api.classifyWaste({ sampleId: selectedSample })
        : dataUrl
          ? await api.classifyWaste({ dataUrl, fileName: fileName ?? undefined })
          : null;
      if (!payload) {
        setError("Pick a demo sample or upload an image first.");
        return;
      }
      setResult(payload);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Classification failed.");
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setSelectedSample(null);
    setFileName(null);
    setDataUrl(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (samplesState.loading && !samplesState.data) return <PageSkeleton />;
  if (samplesState.error)
    return <ErrorState message={samplesState.error} onRetry={samplesState.reload} />;

  const samples = samplesState.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waste Intelligence"
        subtitle="WasteWise — classify waste and get safe disposal guidance"
        actions={result ? <DataStateBadge state={result.isDemo ? "demo" : "live"} /> : null}
      />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* ── Input side ────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Demo samples"
              subtitle="Pick a sample to classify"
              action={<DataStateBadge state="demo" />}
            />
            <CardBody className="pt-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {samples.map((sample) => {
                const Icon = CATEGORY_ICONS[sample.category];
                const active = selectedSample === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setSelectedSample(sample.id);
                      setFileName(sample.name);
                      setDataUrl(null);
                      setPreviewUrl(null);
                      setResult(null);
                      setError(null);
                    }}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1.5 p-3.5 rounded-lg border text-center transition-colors ${
                      active
                        ? "border-accent bg-accent-soft text-accent-2"
                        : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:border-[#d8d5cc]"
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden />
                    <span className="text-xs font-medium leading-tight">{sample.name}</span>
                  </button>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Or upload an image" subtitle="png, jpeg, webp · max 4 MB" />
            <CardBody className="pt-1 space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => onFile(e.target.files?.[0])}
                className="block w-full text-sm text-ink-2 file:mr-3 file:px-3.5 file:py-2 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-canvas-2 file:text-ink hover:file:bg-line-2 file:cursor-pointer file:transition-colors"
                aria-label="Upload a waste image"
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded waste preview"
                  className="w-full max-h-48 object-contain bg-surface-2 border border-line rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-24 border border-dashed border-line rounded-lg text-ink-3 text-sm gap-2 bg-surface-2">
                  <Upload className="w-4 h-4" aria-hidden />
                  No image selected
                </div>
              )}
            </CardBody>
          </Card>

          <div className="flex gap-2">
            <Button
              variant="primary"
              className="flex-1"
              onClick={classify}
              disabled={pending || (!selectedSample && !dataUrl)}
            >
              {pending ? "Classifying…" : "Classify waste"}
            </Button>
            <Button variant="secondary" onClick={reset}>
              Reset
            </Button>
          </div>
          {error ? <InlineError message={error} /> : null}
        </div>

        {/* ── Result side ───────────────────────────────── */}
        <div className="space-y-4">
          {!result ? (
            <Card>
              <CardBody>
                <EmptyState
                  icon={Recycle}
                  title="No classification yet"
                  description="Pick a demo sample or upload an image to see the category, disposal guidance and environmental impact."
                />
              </CardBody>
            </Card>
          ) : (
            <>
              <Card as="article">
                <CardHeader
                  title={result.isDemo ? "Demo classification" : "AI classification"}
                  action={
                    <Chip tone={result.usedGemini ? "blue" : "neutral"}>
                      {result.usedGemini ? "Gemini vision" : "Deterministic demo"}
                    </Chip>
                  }
                />
                <CardBody className="pt-1 space-y-4">
                  {result.category === "hazardous" ? (
                    <NoticeStrip tone="danger">
                      <strong className="font-semibold">Potentially hazardous.</strong> Do not
                      place hazardous material in household recycling or general waste. When
                      uncertain, we default to the safest handling advice.
                    </NoticeStrip>
                  ) : null}

                  <div className="flex items-center gap-3.5 pt-1">
                    {(() => {
                      const Icon = CATEGORY_ICONS[result.category];
                      return (
                        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-canvas-2 text-ink-2">
                          <Icon className="w-5 h-5" aria-hidden />
                        </span>
                      );
                    })()}
                    <div>
                      <p className="text-lg font-semibold text-ink leading-tight">
                        {result.label}
                      </p>
                      <p className="text-xs text-ink-3 capitalize mt-0.5">{result.category}</p>
                    </div>
                  </div>

                  <ConfidenceBar value={result.confidence} />

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2">
                      Disposal &amp; recycling guidance
                    </p>
                    <ul className="space-y-1.5">
                      {result.disposalGuidance.map((g) => (
                        <li
                          key={g}
                          className="flex gap-2 text-[13px] text-ink-2 leading-relaxed"
                        >
                          <span
                            className="mt-[7px] w-1 h-1 rounded-full bg-accent shrink-0"
                            aria-hidden
                          />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <details className="group border-t border-line-2 pt-3">
                    <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
                      <span>View details</span>
                      <ChevronDown
                        className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-ink-3"
                        aria-hidden
                      />
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-1.5">
                          Environmental impact
                        </p>
                        <p className="text-[13px] text-ink-2 leading-relaxed">
                          {result.environmentalImpact}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3 mb-1.5">
                          Limitations
                        </p>
                        <ul className="space-y-1 text-xs text-ink-3 list-disc pl-4">
                          {result.limitations.map((l) => (
                            <li key={l}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </details>
                </CardBody>
              </Card>

              <AgentResultCard run={result.agentRun} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
