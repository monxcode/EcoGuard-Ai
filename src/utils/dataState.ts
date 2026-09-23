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
    className: "bg-accent-soft text-accent-2 border-accent-line",
    title: "Fetched just now from a configured live provider",
  },
  demo: {
    label: "Demo",
    className: "bg-surface-2 text-ink-3 border-dashed border-[#cbc8bf]",
    title: "Deterministic demo fixture — not real-world live data",
  },
  historical: {
    label: "Historical",
    className: "bg-surface-2 text-ink-2 border-line",
    title: "Real past data from a provider",
  },
  estimated: {
    label: "Estimated",
    className: "bg-blue-soft text-blue-2 border-blue-line",
    title: "Derived estimate — not a direct measurement",
  },
  unavailable: {
    label: "Unavailable",
    className: "bg-danger-soft text-danger-2 border-danger-line",
    title: "No provider configured and no demo fixture available",
  },
};
