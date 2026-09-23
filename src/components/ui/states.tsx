import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "./Card";

export function LoadingState({ label = "Loading data…" }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm"
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
    <div className="space-y-4" role="status" aria-label="Loading page">
      <div className="h-8 w-56 bg-slate-200 rounded animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse lg:col-span-2" />
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
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
      <div className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" aria-hidden />
          <h2 className="font-semibold">Something went wrong</h2>
        </div>
        <p className="text-sm text-slate-600">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" aria-hidden />
            Try again
          </button>
        ) : null}
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 px-4">
      <Inbox className="w-8 h-8 text-slate-300" aria-hidden />
      <h3 className="mt-2 text-sm font-medium text-slate-700">{title}</h3>
      {description ? <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
      {message}
    </p>
  );
}
