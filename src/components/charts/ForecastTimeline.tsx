import { CloudRain, CloudSun, Droplets, Sun } from "lucide-react";
import type { DailyPoint } from "../../../shared/types";
import type { Units } from "../../context/AppContext";
import { EmptyState, } from "../ui/states";
import { formatTemp } from "../../utils/format";

function dayIcon(day: DailyPoint) {
  const wet =
    (day.precipProbability !== null && day.precipProbability >= 0.4) ||
    day.precipitationMm >= 0.6;
  if (wet) return CloudRain;
  if (day.precipProbability === 0 || day.precipitationMm === 0) return Sun;
  return CloudSun;
}

/**
 * Apple-weather-style forecast timeline: one column per day with an icon,
 * rain chance and a high/low range bar scaled across the whole week.
 * Horizontally scrollable on small screens.
 */
export function ForecastTimeline({ data, units }: { data: DailyPoint[]; units: Units }) {
  if (data.length === 0) {
    return <EmptyState title="Forecast unavailable" description="No forecast data for this location." />;
  }
  const gMin = Math.min(...data.map((d) => d.tempMin));
  const gMax = Math.max(...data.map((d) => d.tempMax));
  const span = Math.max(1, gMax - gMin);

  const summary = `Forecast: ${data
    .map((d) => `${d.day} high ${d.tempMax} degrees, low ${d.tempMin} degrees`)
    .join("; ")}.`;

  return (
    <div>
      <p className="sr-only-chart">{`Forecast timeline. ${summary}`}</p>
      <div
        role="img"
        aria-label={`Forecast timeline. ${summary}`}
        className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {data.map((day, i) => {
          const Icon = dayIcon(day);
          const left = ((day.tempMin - gMin) / span) * 100;
          const width = Math.max(6, ((day.tempMax - day.tempMin) / span) * 100);
          const wet =
            (day.precipProbability !== null && day.precipProbability >= 0.15) ||
            day.precipitationMm > 0;
          return (
            <div
              key={`${day.day}-${i}`}
              className="flex-1 min-w-[76px] snap-start flex flex-col items-center gap-2 py-2 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <span className="text-[11px] font-medium text-ink-3">{day.day}</span>
              <Icon className="w-5 h-5 text-ink-2" aria-hidden />
              <span className="flex items-center gap-0.5 text-[11px] text-blue h-4">
                {wet ? (
                  <>
                    <Droplets className="w-3 h-3" aria-hidden />
                    {day.precipProbability !== null ? `${Math.round(day.precipProbability * 100)}%` : ""}
                  </>
                ) : null}
              </span>
              <div className="w-full px-2">
                <p className="text-center text-[13px] font-semibold text-ink tabular-nums">
                  {formatTemp(day.tempMax, units)}
                </p>
                <div className="relative h-1 my-1.5 rounded-full bg-line-2" aria-hidden>
                  <span
                    className="absolute top-0 h-1 rounded-full bg-[#cfc8ba]"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </div>
                <p className="text-center text-[13px] text-ink-3 tabular-nums">
                  {formatTemp(day.tempMin, units)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
