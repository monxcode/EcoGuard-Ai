import { aqiCategory } from "../../shared/aqi";
import type { DataState } from "../../shared/types";

export function aqiLabel(aqi: number): string {
  return aqiCategory(aqi).label;
}

export const DATA_STATE_META: Record<
  DataState,
  { label: string; className: string; title: string }
> = {
  live: {
    label: "Live",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    title: "Fetched just now from a configured live provider",
  },
  demo: {
    label: "Demo Data",
    className: "bg-white text-slate-500 border-dashed border-slate-400",
    title: "Deterministic demo fixture — not real-world live data",
  },
  historical: {
    label: "Historical",
    className: "bg-slate-50 text-slate-500 border-slate-200",
    title: "Real past data from a provider",
  },
  estimated: {
    label: "Estimated",
    className: "bg-sky-50 text-sky-700 border-sky-200/80",
    title: "Derived estimate — not a direct measurement",
  },
  unavailable: {
    label: "Unavailable",
    className: "bg-rose-50 text-rose-600 border-rose-200/80",
    title: "No provider configured and no demo fixture available",
  },
};
