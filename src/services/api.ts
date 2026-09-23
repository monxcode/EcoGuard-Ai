import type {
  AirPayload,
  AssistantResponse,
  ClimatePayload,
  DashboardPayload,
  DataSourcesPayload,
  DemoScenario,
  DemoWasteSample,
  DisasterPayload,
  EnvironmentalReport,
  HealthPayload,
  AppLocation,
  LocationSearchPayload,
  PollutionAnalysisPayload,
  RouteComparisonPayload,
  RouteOption,
  WasteClassification,
  WaterPayload,
} from "../../shared/types";

export class ApiClientError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiClientError("Cannot reach the EcoGuard API server.", 0);
  }
  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* keep default message */
    }
    throw new ApiClientError(message, response.status);
  }
  return (await response.json()) as T;
}

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const str = search.toString();
  return str ? `?${str}` : "";
}

export const api = {
  getHealth: () => request<HealthPayload>("/api/health"),
  getLocations: () => request<AppLocation[]>("/api/locations"),
  searchLocations: (q: string) =>
    request<LocationSearchPayload>(`/api/locations/search${qs({ q })}`),
  getDataSources: () => request<DataSourcesPayload>("/api/data-sources"),
  getDashboard: (locationId: string) =>
    request<DashboardPayload>(`/api/dashboard${qs({ locationId })}`),
  getAlerts: (locationId: string) =>
    request<{ alerts: DashboardPayload["alerts"]; location: AppLocation }>(
      `/api/alerts${qs({ locationId })}`,
    ),
  getAir: (locationId: string) => request<AirPayload>(`/api/air${qs({ locationId })}`),
  getAirAnalysis: (locationId: string) =>
    request<PollutionAnalysisPayload>(`/api/air/analysis${qs({ locationId })}`),
  getClimate: (locationId: string) => request<ClimatePayload>(`/api/climate${qs({ locationId })}`),
  getDisaster: (locationId: string) =>
    request<DisasterPayload>(`/api/disaster${qs({ locationId })}`),
  getWater: (locationId: string) => request<WaterPayload>(`/api/water${qs({ locationId })}`),
  askAssistant: (message: string, locationId: string) =>
    request<AssistantResponse>("/api/assistant/ask", {
      method: "POST",
      body: JSON.stringify({ message, locationId }),
    }),
  getWasteSamples: () => request<DemoWasteSample[]>("/api/waste/samples"),
  classifyWaste: (body: { sampleId?: string; fileName?: string; dataUrl?: string }) =>
    request<WasteClassification>("/api/waste/classify", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRoutes: (locationId: string) =>
    request<{
      location: AppLocation;
      routes: RouteOption[];
      dataState: string;
      note: string;
    }>(`/api/routes${qs({ locationId })}`),
  compareRoutes: (locationId: string, routeIds: string[]) =>
    request<RouteComparisonPayload>("/api/routes/compare", {
      method: "POST",
      body: JSON.stringify({ locationId, routeIds }),
    }),
  generateReport: (body: { locationId: string; title?: string; include?: string[] }) =>
    request<EnvironmentalReport>("/api/reports", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDemoScenario: () => request<DemoScenario>("/api/demo/scenario"),
  setDemoMode: (enabled: boolean) =>
    request<{ demoMode: boolean }>("/api/demo", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),
};
