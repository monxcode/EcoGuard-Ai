import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Play, RotateCcw, TestTube } from "lucide-react";
import type { DemoScenario } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { ErrorState, InlineError, PageSkeleton } from "../components/ui/states";

export default function DemoPage() {
  const { settings, setDemoModeRemote } = useApp();
  const { data, loading, error, reload } = useApi<DemoScenario>("/api/demo/scenario");
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [visited, setVisited] = useState<number[]>([]);
  const [modePending, setModePending] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);

  const setMode = async (enabled: boolean) => {
    setModePending(true);
    setModeError(null);
    try {
      await setDemoModeRemote(enabled);
    } catch {
      setModeError("Could not update demo mode on the server.");
    } finally {
      setModePending(false);
    }
  };

  const start = async () => {
    await setMode(true);
    setStarted(true);
    setStepIndex(0);
    setVisited([0]);
  };

  const reset = async () => {
    await setMode(false);
    setStarted(false);
    setStepIndex(0);
    setVisited([]);
  };

  const goToStep = (index: number) => {
    setStepIndex(index);
    setVisited((prev) => (prev.includes(index) ? prev : [...prev, index]));
  };

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="Demo scenario unavailable." onRetry={reload} />;

  const step = data.steps[stepIndex];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Mode"
        subtitle={`${data.title} — location: ${data.location.name}`}
        actions={
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-[11px] font-bold tracking-wider border-2 border-dashed border-slate-400 text-slate-600 rounded uppercase">
              {settings.demoMode ? "DEMO MODE active" : "Demo mode off"}
            </span>
            {started ? (
              <button
                type="button"
                onClick={() => void reset()}
                disabled={modePending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" aria-hidden />
                Exit & reset
              </button>
            ) : null}
          </div>
        }
      />

      <Card className="border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <TestTube className="w-4 h-4" aria-hidden />
              Guided {data.durationMinutes}-minute walkthrough
            </h2>
            <p className="mt-1 text-sm text-emerald-900/80">
              Works with zero API keys. Forces demo fixtures on the server, then walks through
              overview → AQI → analysis → heat → multi-agent → assistant → report. Every screen is
              clearly labeled “Demo Data”.
            </p>
          </div>
          {!started ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={modePending}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shrink-0"
            >
              <Play className="w-4 h-4" aria-hidden />
              {modePending ? "Starting…" : "Start demo"}
            </button>
          ) : null}
        </div>
        {modeError ? (
          <div className="mt-3">
            <InlineError message={modeError} />
          </div>
        ) : null}
      </Card>

      {started && step ? (
        <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
          {/* Step list */}
          <Card className="p-3 h-fit">
            <ol className="space-y-1" aria-label="Demo steps">
              {data.steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className={`w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      i === stepIndex
                        ? "bg-emerald-50 text-emerald-900 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {visited.includes(i) ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" aria-hidden />
                    ) : (
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-center text-xs text-slate-400">
                        {i + 1}
                      </span>
                    )}
                    <span className="leading-snug text-xs sm:text-sm">{s.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            {/* Progress */}
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden>
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${((stepIndex + 1) / data.steps.length) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Step {stepIndex + 1} of {data.steps.length}
            </p>
          </Card>

          {/* Active step */}
          <Card>
            <CardHeader
              title={step.title}
              subtitle={`Data shown here: ${step.dataLabel}`}
              action={
                <Link
                  to={step.route}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900"
                >
                  Open page
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </Link>
              }
            />
            <CardBody className="pt-2 space-y-4">
              <div>
                <h3 className="text-xs font-medium text-slate-500 mb-2">Talking points</h3>
                <ul className="space-y-2">
                  {step.talkingPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => goToStep(Math.max(0, stepIndex - 1))}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                  Previous
                </button>
                <Link
                  to={step.route}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                >
                  Show this step
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => goToStep(Math.min(data.steps.length - 1, stepIndex + 1))}
                  disabled={stepIndex === data.steps.length - 1}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              Press <strong>Start demo</strong> to enable demo mode and begin the walkthrough. You
              can leave demo mode any time from Settings — no API keys required.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
