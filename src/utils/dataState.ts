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
    className: "bg-[#F5F9F6] text-[#2D7A54] border-[#DFF0E6]",
    title: "Fetched just now from a configured live provider",
  },
  demo: {
    label: "Demo Data",
    className: "bg-white text-[#888888] border-dashed border-[#CCCCCC]",
    title: "Deterministic demo fixture — not real-world live data",
  },
  historical: {
    label: "Historical",
    className: "bg-[#FAFAFA] text-[#666666] border-[#EAEAEA]",
    title: "Real past data from a provider",
  },
  estimated: {
    label: "Estimated",
    className: "bg-[#F5F9FF] text-[#1D5DB5] border-[#DCE8F9]",
    title: "Derived estimate — not a direct measurement",
  },
  unavailable: {
    label: "Unavailable",
    className: "bg-[#FFF4F2] text-[#C0492E] border-[#FCDED8]",
    title: "No provider configured and no demo fixture available",
  },
};
