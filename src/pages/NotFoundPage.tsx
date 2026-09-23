import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white">
        <Leaf className="w-6 h-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">
        The route you requested does not exist in EcoGuard AI.
      </p>
      <Link
        to="/dashboard"
        className="mt-4 inline-flex px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
