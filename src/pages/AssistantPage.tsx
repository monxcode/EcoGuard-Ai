import { useRef, useState, useEffect } from "react";
import { Bot, Send, Sparkles, Trash2, User } from "lucide-react";
import type { AssistantResponse } from "../../shared/types";
import { useApp } from "../context/AppContext";
import { api, ApiClientError } from "../services/api";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { ConfidenceBar } from "../components/ui/ConfidenceBar";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { InlineError } from "../components/ui/states";
import { RiskPill } from "../components/ui/RiskPill";

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

export default function AssistantPage() {
  const { settings } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Environmental Assistant"
        subtitle="Grounded in the same agents and data as your dashboard"
        actions={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
              Clear
            </button>
          ) : null
        }
      />

      <Card className="flex flex-col h-[min(70vh,640px)]">
        <div className="flex-1 overflow-y-auto p-4 space-y-4" aria-live="polite">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Sparkles className="w-8 h-8 text-emerald-600" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold text-slate-800">
                Ask about your environment
              </h2>
              <p className="mt-1 text-xs text-slate-500 max-w-md">
                EcoGuard routes your question to only the relevant agents, gathers data, and replies
                with evidence, sources and a clear "agents used" list — no hidden chain-of-thought.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-full hover:bg-slate-50"
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
                <div className="max-w-[85%] sm:max-w-[75%] bg-emerald-700 text-white rounded-2xl rounded-br-md px-4 py-2.5">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 mt-0.5 shrink-0 opacity-70" aria-hidden />
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[95%] sm:max-w-[85%] bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Bot className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" aria-hidden />
                    <div className="min-w-0 space-y-3">
                      {msg.error ? (
                        <InlineError message={msg.error} />
                      ) : msg.payload ? (
                        <AssistantMessage payload={msg.payload} />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ),
          )}

          {pending ? (
            <div className="flex justify-start">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                <p className="text-sm text-slate-500 animate-pulse" role="status">
                  Agents are gathering data…
                </p>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form
          className="border-t border-slate-200 p-3 flex gap-2"
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
            className="flex-1 min-w-0 h-10 px-3 text-sm border border-slate-300 rounded-lg focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send message"
            className="inline-flex items-center justify-center w-10 h-10 text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
          >
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </form>
      </Card>
    </div>
  );
}

function AssistantMessage({ payload }: { payload: AssistantResponse }) {
  const overall = payload.agentsUsed.find((r) => r.agentId === "risk-analyst");
  const domainRuns = payload.agentsUsed.filter((r) => r.agentId !== "risk-analyst");

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{payload.reply}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Agents used:
        </span>
        {domainRuns.map((run) => (
          <span
            key={run.agentId}
            className="px-2 py-0.5 text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full"
          >
            {run.agentName}
          </span>
        ))}
        <span className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
          Risk Analyst
        </span>
        <span className="px-2 py-0.5 text-[11px] bg-white border-dashed border-slate-400 text-slate-600 rounded-full">
          {payload.usedGemini ? "Gemini" : "Rules-based"}
        </span>
        <span className="text-[11px] text-slate-400">intent: {payload.intent}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Evidence:
        </span>
        {payload.evidence.slice(0, 4).map((item) => (
          <span key={item} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 rounded">
            {item.length > 90 ? `${item.slice(0, 90)}…` : item}
          </span>
        ))}
        {payload.evidence.length === 0 ? (
          <span className="text-[11px] text-slate-400">none returned</span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {payload.dataSources.slice(0, 6).map((src) => (
          <span key={src} className="px-2 py-0.5 text-[10px] bg-slate-50 text-slate-500 border border-slate-200 rounded">
            {src}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {overall ? <RiskPill level={overall.result.riskLevel} size="sm" /> : null}
        <div className="w-40">
          <ConfidenceBar value={payload.confidence} />
        </div>
        <DataStateBadge state="demo" />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-500">
          Limitations & reasoning summary ({payload.limitations.length})
        </summary>
        <ul className="mt-1 text-[11px] text-slate-600 list-disc pl-4 space-y-0.5">
          {payload.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
          <li>Assessment based on structured agent summaries — full model deliberation is never shown.</li>
        </ul>
      </details>
    </div>
  );
}
