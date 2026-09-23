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
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="h-8 w-64 bg-[#F0F0F0] rounded-md animate-pulse" />
      <div className="h-4 w-40 bg-[#F0F0F0] rounded-md animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 pt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-white border border-[#EAEAEA] rounded-[14px] animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-80 bg-white border border-[#EAEAEA] rounded-[14px] animate-pulse lg:col-span-2" />
        <div className="h-80 bg-white border border-[#EAEAEA] rounded-[14px] animate-pulse" />
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
        <div className="flex items-center gap-2 text-[#C0492E]">
          <AlertTriangle className="w-5 h-5" aria-hidden />
          <h2 className="font-semibold tracking-tight text-[#111111]">Something went wrong</h2>
        </div>
        <p className="text-sm text-[#666666]">{message}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#111111] bg-white border border-[#EAEAEA] shadow-sm rounded-lg hover:bg-black/5 transition-colors"
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
