import { useRef, useState, useEffect } from "react";
import { ArrowUp, ChevronDown, Leaf, Loader2, Trash2 } from "lucide-react";
import type { AssistantResponse, DashboardPayload } from "../../shared/types";
import { aqiCategory } from "../../shared/aqi";
import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { Button, Chip } from "../components/ui/Button";
import { InlineError } from "../components/ui/states";
import { RiskPill } from "../components/ui/RiskPill";
import { formatTemp } from "../utils/format";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text?: string;
  payload?: AssistantResponse;
  error?: string;
}

const SUGGESTIONS = [
  "Is it safe to go outside today?",
  "Why is the AQI high?",
  "Should I run this evening?",
  "Is there heat risk today?",
  "What environmental risks should I watch?",
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AssistantPage() {
  const { settings, location, health } = useApp();
  const isDemo = settings.demoMode || health?.preferredProvider !== "live";
  const context = useApi<DashboardPayload>(
    `/api/dashboard?locationId=${settings.locationId}`,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, pending]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setInput("");
    const userId = nextId.current++;
    setMessages((prev) => [...prev, { id: userId, role: "user", text: message }]);
    setPending(true);
    try {
      const payload = await api.askAssistant(message, settings.locationId);
      setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", payload }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          error: err instanceof ApiClientError ? err.message : "Assistant request failed.",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  const air = context.data?.air;
  const weather = context.data?.weather;
  const category = air ? aqiCategory(air.aqi) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Assistant"
        subtitle="Environmental copilot — grounded in the same agents and data as your dashboard"
        actions={
          messages.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setMessages([])}>
              <Trash2 className="w-3.5 h-3.5" aria-hidden />
              Clear
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(26,29,26,0.03)] overflow-hidden h-[min(72vh,680px)]">
        {/* ── Context bar ─────────────────────────────────── */}
        <div className="flex items-center gap-2 px-3 sm:px-5 h-12 border-b border-line-2 bg-surface-2 overflow-x-auto">
          <Chip tone="accent" className="shrink-0">
            {location.name}
            {location.region ? `, ${location.region.split(",")[0]}` : ""}
          </Chip>
          {air && category ? (
            <Chip tone="neutral" className="shrink-0" title="Current air quality">
              AQI {air.aqi} · {category.label}
            </Chip>
          ) : null}
          {weather ? (
            <Chip tone="neutral" className="shrink-0" title="Current temperature">
              {formatTemp(weather.temperature, settings.units)}
            </Chip>
          ) : null}
          <Chip tone={isDemo ? "ochre" : "accent"} className="shrink-0">
            {isDemo ? "Demo dataset" : "Live data"}
          </Chip>
          <span className="ml-auto hidden md:block text-[11px] text-ink-3 shrink-0 pl-3">
            Answers cite sources · no chain-of-thought
          </span>
        </div>

        {/* ── Messages ────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6"
          style={{ backgroundColor: "#faf9f6" }}
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-ink text-white">
                <Leaf className="w-5 h-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-[-0.015em] text-ink">
                Ask your environmental copilot
              </h2>
              <p className="mt-1.5 text-[13px] text-ink-3 max-w-md leading-relaxed">
                Concise answers grounded in live feeds and the multi-agent stack — with sources
                and an agents-used list on every response.
              </p>
              <div className="mt-5 w-full max-w-md space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3 text-left mb-2">
                  Suggested questions
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink-2 bg-surface border border-line rounded-lg hover:border-[#d0cdc4] hover:text-ink transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] bg-ink text-[#f3f3ef] rounded-2xl rounded-br-md px-4 py-2.5">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                  <Leaf className="w-3.5 h-3.5" aria-hidden />
                </span>
                <div className="max-w-[95%] sm:max-w-[85%] bg-surface border border-line rounded-2xl rounded-bl-md px-4 py-3.5">
                  {msg.error ? (
                    <InlineError message={msg.error} />
                  ) : msg.payload ? (
                    <AssistantMessage payload={msg.payload} />
                  ) : null}
                </div>
              </div>
            ),
          )}

          {pending ? (
            <div className="flex justify-start gap-3">
              <span className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0 mt-0.5">
                <Leaf className="w-3.5 h-3.5" aria-hidden />
              </span>
              <div className="bg-surface border border-line rounded-2xl rounded-bl-md px-4 py-3.5">
                <p className="flex items-center gap-2 text-sm text-ink-3" role="status">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  Agents are checking feeds…
                </p>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {/* ── Composer ────────────────────────────────────── */}
        <form
          className="border-t border-line-2 p-3 flex gap-2 bg-surface"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <label htmlFor="assistant-input" className="sr-only">
            Ask an environmental question
          </label>
          <input
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Should I run this evening?"
            maxLength={1000}
            className="flex-1 min-w-0 h-10 px-3.5 text-sm text-ink bg-surface-2 border border-line rounded-xl placeholder:text-ink-3 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/12 transition-colors"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={pending || !input.trim()}
            aria-label="Send message"
            className="w-10 h-10 px-0 rounded-xl"
          >
            <ArrowUp className="w-4 h-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}

function AssistantMessage({ payload }: { payload: AssistantResponse }) {
  const overall = payload.agentsUsed.find((r) => r.agentId === "risk-analyst");
  const domainRuns = payload.agentsUsed.filter((r) => r.agentId !== "risk-analyst");

  return (
    <div className="space-y-3.5">
      <p className="text-[14.5px] text-ink leading-relaxed whitespace-pre-wrap">{payload.reply}</p>

      {/* Meta: risk, confidence, agents, engine */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {overall ? <RiskPill level={overall.result.riskLevel} size="sm" /> : null}
        <ConfidenceBar value={payload.confidence} compact />
        <Chip tone="neutral" title="Agents that contributed">
          {domainRuns.length > 0 ? domainRuns.map((r) => r.agentName).join(" · ") : "Risk Analyst"}
        </Chip>
        <Chip tone={payload.usedGemini ? "blue" : "neutral"}>
          {payload.usedGemini ? "Gemini" : "Rules-based"}
        </Chip>
      </div>

      <details className="group border-t border-line-2 pt-2.5">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
          <span>Evidence &amp; sources</span>
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-ink-3"
            aria-hidden
          />
        </summary>
        <div className="mt-2.5 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {payload.evidence.slice(0, 4).map((item) => (
              <Chip key={item} title={item}>
                {item.length > 90 ? `${item.slice(0, 90)}…` : item}
              </Chip>
            ))}
            {payload.evidence.length === 0 ? (
              <span className="text-[11px] text-ink-3">none returned</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {payload.dataSources.map((src) => (
              <Chip key={src} tone="accent">
                {src}
              </Chip>
            ))}
          </div>
          <p className="text-[11px] text-ink-3">Intent: {payload.intent}</p>
        </div>
      </details>

      <details className="group border-t border-line-2 pt-2.5">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-medium text-ink-2 hover:text-ink">
          <span>Limitations ({payload.limitations.length})</span>
          <ChevronDown
            className="w-3.5 h-3.5 transition-transform group-open:rotate-180 text-ink-3"
            aria-hidden
          />
        </summary>
        <ul className="mt-2.5 text-xs text-ink-3 list-disc pl-4 space-y-1">
          {payload.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
          <li>
            Assessment based on structured agent summaries — full model deliberation is never
            shown.
          </li>
        </ul>
      </details>
    </div>
  );
}
