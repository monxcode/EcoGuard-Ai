import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint, HourlyPoint, RouteOption } from "../../../shared/types";
import { EmptyState } from "../ui/states";

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "none",
  borderRadius: 8,
  fontSize: 12,
  color: "#f8fafc",
};

function chartFrame(title: string, summary: string, height: number, node: React.ReactNode) {
  return (
    <div>
      <p className="sr-only-chart">{`${title}. ${summary}`}</p>
      <div style={{ height }} role="img" aria-label={`${title}. ${summary}`}>
        {node}
      </div>
    </div>
  );
}

export function AqiTrendChart({ data }: { data: HourlyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="AQI trend unavailable" description="No hourly data for this location." />;
  }
  const summary = `AQI by hour: ${data.map((d) => `${d.hour} ${d.aqi}`).join(", ")}.`;
  return chartFrame(
    "24-hour AQI trend",
    summary,
    240,
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} interval={3} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="aqi"
          name="AQI"
          stroke="#059669"
          strokeWidth={2}
          fill="url(#aqiFill)"
        />
      </AreaChart>
    </ResponsiveContainer>,
  );
}

export function AqiPmTrendChart({ data }: { data: HourlyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Pollutant trend unavailable" description="No hourly data for this location." />;
  }
  const summary = `PM2.5 by hour: ${data.map((d) => `${d.hour} ${d.pm25}`).join(", ")}.`;
  return chartFrame(
    "24-hour PM2.5 trend",
    summary,
    240,
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b" }} interval={3} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="pm25" name="PM2.5 (µg/m³)" stroke="#0f766e" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="pm10" name="PM10 (µg/m³)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>,
  );
}

export function TemperatureRangeChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Weather forecast unavailable" description="No forecast data for this location." />;
  }
  const summary = `Weather forecast highs and lows: ${data
    .map((d) => `${d.day} high ${d.tempMax}, low ${d.tempMin}`)
    .join("; ")}.`;
  return chartFrame(
    "7-day weather forecast temperature range",
    summary,
    240,
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} unit="°" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="tempMax" name="High (°C)" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="tempMin" name="Low (°C)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>,
  );
}

export function RainfallChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState title="Weather forecast unavailable" description="No forecast data for this location." />;
  }
  const summary = `Weather forecast rainfall millimetres: ${data.map((d) => `${d.day} ${d.precipitationMm}`).join(", ")}.`;
  return chartFrame(
    "7-day weather forecast rainfall",
    summary,
    220,
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="precipitationMm" name="Rain (mm)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>,
  );
}

export function RainfallHistoryChart({ days }: { days: number[] }) {
  if (days.length === 0) {
    return (
      <EmptyState
        title="Rainfall history unavailable"
        description="14-day rainfall history is only available in demo mode right now."
      />
    );
  }
  const data = days.map((mm, i) => ({ day: `D-${days.length - i - 1 || "0"}`, mm }));
  const summary = `14-day rainfall millimetres: ${days.join(", ")}.`;
  return chartFrame(
    "14-day rainfall history",
    summary,
    200,
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748b" }} interval={1} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="mm" name="Rain (mm)" fill="#64748b" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>,
  );
}

export function PollutantRatioChart({
  data,
}: {
  data: Array<{ label: string; ratio: number }>;
}) {
  if (data.length === 0) return <EmptyState title="No pollutant data" />;
  const summary = `Pollutant ratio versus health guideline: ${data
    .map((d) => `${d.label} ${d.ratio}x`)
    .join(", ")}.`;
  return chartFrame(
    "Pollutants versus guideline",
    summary,
    240,
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}×`, "vs guideline"]} />
        <Bar dataKey="ratio" name="vs guideline" fill="#059669" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>,
  );
}

export function DailyAqiBarChart({ data }: { data: DailyPoint[] }) {
  const withAqi = data.filter((d) => d.aqi !== null);
  if (data.length === 0) return <EmptyState title="AQI forecast unavailable" />;
  if (withAqi.length === 0) {
    return (
      <EmptyState
        title="AQI forecast unavailable"
        description="The air-quality overlay for this forecast is unavailable right now."
      />
    );
  }
  const summary = `Forecast daily AQI: ${withAqi.map((d) => `${d.day} ${d.aqi}`).join(", ")}.`;
  return chartFrame(
    "7-day AQI outlook",
    summary,
    220,
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={withAqi} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="aqi" name="AQI" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>,
  );
}

export function ExposureBarChart({ routes }: { routes: RouteOption[] }) {
  if (routes.length === 0) return <EmptyState title="No routes to chart" />;
  const summary = `Estimated exposure index: ${routes
    .map((r) => `${r.name} ${r.exposureIndex}`)
    .join(", ")}.`;
  return chartFrame(
    "Estimated route exposure",
    `${summary} Values are estimates, not measurements.`,
    220,
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={routes} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="exposureIndex" name="Exposure (est.)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>,
  );
}
