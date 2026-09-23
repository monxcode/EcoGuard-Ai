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
import { ErrorState, InlineError, PageSkeleton } from "../components/ui/states";
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
  const HazardIcon = CATEGORY_ICONS.hazardous;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Waste Intelligence"
        subtitle="WasteWise — classify waste and get safe disposal guidance"
        actions={
          result ? (
            <DataStateBadge state={result.isDemo ? "demo" : "live"} />
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input side */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Demo samples" action={<DataStateBadge state="demo" />} />
            <CardBody className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
            <CardBody className="pt-2 space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => onFile(e.target.files?.[0])}
                className="block w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                aria-label="Upload a waste image"
              />
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded waste preview"
                  className="w-full max-h-48 object-contain bg-slate-50 border border-slate-200 rounded-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-24 border border-dashed border-slate-300 rounded-lg text-slate-400 text-sm">
                  <Upload className="w-4 h-4 mr-2" aria-hidden />
                  No image selected
                </div>
              )}
            </CardBody>
          </Card>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={classify}
              disabled={pending || (!selectedSample && !dataUrl)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
            >
              {pending ? "Classifying…" : "Classify waste"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Reset
            </button>
          </div>
          {error ? <InlineError message={error} /> : null}
        </div>

        {/* Result side */}
        <div className="space-y-4">
          {!result ? (
            <Card>
              <CardBody>
                <div className="text-center py-10 text-sm text-slate-500">
                  <Recycle className="w-8 h-8 mx-auto text-slate-300 mb-2" aria-hidden />
                  Pick a demo sample or upload an image to see classification results.
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              <Card className={result.category === "hazardous" ? "border-red-300" : ""}>
                <CardHeader
                  title={result.isDemo ? "Demo Classification" : "AI Classification"}
                  action={
                    <span
                      className={`px-1.5 py-px text-[10px] font-medium rounded-full border ${
                        result.usedGemini
                          ? "bg-violet-50 border-violet-200 text-violet-700"
                          : "bg-white border-dashed border-slate-400 text-slate-500"
                      }`}
                    >
                      {result.usedGemini ? "Gemini vision" : "Deterministic demo"}
                    </span>
                  }
                />
                <CardBody className="pt-2 space-y-4">
                  {result.category === "hazardous" ? (
                    <div className="flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3">
                      <HazardIcon className="w-5 h-5 text-red-700 shrink-0" aria-hidden />
                      <div>
                        <p className="text-sm font-semibold text-red-900">Potentially hazardous</p>
                        <p className="text-xs text-red-800 mt-0.5">
                          Do not place hazardous material in household recycling or general waste.
                          When uncertain, we default to the safest handling advice.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = CATEGORY_ICONS[result.category];
                      return (
                        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-slate-100 text-slate-600">
                          <Icon className="w-6 h-6" aria-hidden />
                        </span>
                      );
                    })()}
                    <div>
                      <p className="text-lg font-semibold text-slate-900 leading-tight">{result.label}</p>
                      <p className="text-xs text-slate-500 capitalize">{result.category}</p>
                    </div>
                  </div>

                  <ConfidenceBar value={result.confidence} />

                  <div>
                    <h3 className="text-xs font-medium text-slate-500 mb-1.5">
                      Disposal &amp; recycling guidance
                    </h3>
                    <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                      {result.disposalGuidance.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>

                  <details className="group border-t border-slate-100 pt-3">
                    <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-800">
                      <span>View details</span>
                      <ChevronDown
                        className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-slate-500 mb-1">
                          Environmental impact
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {result.environmentalImpact}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-slate-500 mb-1">Limitations</h4>
                        <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
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
