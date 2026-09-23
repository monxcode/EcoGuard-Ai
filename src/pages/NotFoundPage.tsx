import { Link } from "react-router-dom";
import { ArrowLeft, Leaf } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-ink text-white">
        <Leaf className="w-6 h-6" aria-hidden />
      </span>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">404</p>
      <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">Page not found</h1>
      <p className="mt-1.5 text-sm text-ink-3 max-w-sm leading-relaxed">
        The route you requested does not exist in EcoGuard AI.
      </p>
      <Link
        to="/dashboard"
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-2 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Back to dashboard
      </Link>
    </div>
  );
}
