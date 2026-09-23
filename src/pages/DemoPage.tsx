import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Play,
  RotateCcw,
} from "lucide-react";
import type { DemoScenario } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { ErrorState, InlineError, NoticeStrip, PageSkeleton } from "../components/ui/states";
import { Button, Chip } from "../components/ui/Button";

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
        subtitle={`${data.title} — ${data.location.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Chip tone={settings.demoMode ? "ochre" : "neutral"}>
              {settings.demoMode ? "Demo active" : "Demo off"}
            </Chip>
            {started ? (
              <Button variant="secondary" size="sm" onClick={() => void reset()} disabled={modePending}>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                Exit & reset
              </Button>
            ) : null}
          </div>
        }
      />

      <NoticeStrip tone="ochre">
        <p className="font-medium text-ink">
          Guided {data.durationMinutes}-minute walkthrough — zero API keys required
        </p>
        <p className="text-[13px] text-ink-2 mt-1 leading-relaxed">
          Forces demo fixtures on the server, then walks through overview → AQI → analysis → heat →
          multi-agent → assistant → report. Every screen is clearly labeled{" "}
          <strong className="font-semibold">Demo Data</strong>.
        </p>
        {!started ? (
          <Button
            variant="primary"
            size="sm"
            className="mt-3"
            onClick={() => void start()}
            disabled={modePending}
          >
            <Play className="w-3.5 h-3.5" aria-hidden />
            {modePending ? "Starting…" : "Start demo"}
          </Button>
        ) : null}
        {modeError ? <InlineError message={modeError} /> : null}
      </NoticeStrip>

      {started && step ? (
        <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
          {/* Step rail */}
          <Card className="p-3 h-fit">
            <p className="px-1.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              Walkthrough steps
            </p>
            <ol className="space-y-0.5" aria-label="Demo steps">
              {data.steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(i)}
                    className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                      i === stepIndex
                        ? "bg-accent-soft text-accent-2 font-medium"
                        : "text-ink-2 hover:bg-surface-2"
                    }`}
                  >
                    {visited.includes(i) ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-accent shrink-0" aria-hidden />
                    ) : (
                      <span className="w-4 h-4 mt-0.5 shrink-0 text-center text-[11px] leading-4 text-ink-3">
                        {i + 1}
                      </span>
                    )}
                    <span className="leading-snug text-xs sm:text-[13px]">{s.title}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="mt-3 px-1.5">
              <div className="h-1.5 bg-line rounded-full overflow-hidden" aria-hidden>
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${((stepIndex + 1) / data.steps.length) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-ink-3">
                Step {stepIndex + 1} of {data.steps.length}
              </p>
            </div>
          </Card>

          {/* Active step */}
          <Card>
            <CardHeader
              title={step.title}
              subtitle={`Data shown here: ${step.dataLabel}`}
              action={
                <Link
                  to={step.route}
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:text-accent-2"
                >
                  Open page
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </Link>
              }
            />
            <CardBody className="pt-2 space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3 mb-2">
                  Talking points
                </p>
                <ul className="space-y-2">
                  {step.talkingPoints.map((point, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-ink-2 leading-relaxed">
                      <span
                        className="mt-[8px] w-1 h-1 rounded-full bg-accent shrink-0"
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-line-2 pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToStep(Math.max(0, stepIndex - 1))}
                  disabled={stepIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                  Previous
                </Button>
                <Link
                  to={step.route}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-accent-2 bg-accent-soft border border-accent-line rounded-lg hover:bg-[#e2eee7] transition-colors"
                >
                  Show this step
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                </Link>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => goToStep(Math.min(data.steps.length - 1, stepIndex + 1))}
                  disabled={stepIndex === data.steps.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-ink-2 leading-relaxed max-w-xl">
            Press <strong className="font-semibold text-ink">Start demo</strong> to enable demo
            mode and begin the walkthrough. You can leave demo mode any time from Settings — no
            API keys required.
          </p>
        </Card>
      )}
    </div>
  );
}
