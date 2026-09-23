import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Card } from "./Card";

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-12 text-ink-3 text-sm"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <div className="h-8 w-56 bg-line-2 rounded-md animate-pulse" />
        <div className="h-4 w-40 bg-line-2 rounded-md animate-pulse" />
      </div>
      <div className="h-44 bg-surface border border-line rounded-xl animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface border border-line rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 bg-surface border border-line rounded-xl animate-pulse lg:col-span-2" />
        <div className="h-72 bg-surface border border-line rounded-xl animate-pulse" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-danger-soft text-danger">
            <AlertTriangle className="w-4 h-4" aria-hidden />
          </span>
          <h2 className="font-semibold tracking-[-0.01em] text-ink">Something went wrong</h2>
        </div>
        <p className="text-sm text-ink-2 leading-relaxed">{message}</p>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            Try again
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-canvas-2 text-ink-3">
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <h3 className="mt-3 text-sm font-medium text-ink">{title}</h3>
      {description ? <p className="mt-1 text-xs text-ink-3 max-w-sm leading-relaxed">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p
      className="text-[13px] text-danger-2 bg-danger-soft border border-danger-line rounded-lg px-3 py-2"
      role="alert"
    >
      {message}
    </p>
  );
}

/** Low-key informational/notice strip — used for disclaimers and partial-data notes. */
export function NoticeStrip({
  children,
  tone = "ochre",
}: {
  children: ReactNode;
  tone?: "ochre" | "blue" | "danger";
}) {
  const tones = {
    ochre: "bg-ochre-soft border-ochre-line text-ochre-2",
    blue: "bg-blue-soft border-blue-line text-blue-2",
    danger: "bg-danger-soft border-danger-line text-danger-2",
  } as const;
  return (
    <div className={`flex gap-2.5 items-start rounded-lg border px-3.5 py-2.5 ${tones[tone]}`}>
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" aria-hidden />
      <div className="text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
