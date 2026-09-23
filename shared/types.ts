/**
 * Canonical contracts shared by the Express server and the React client.
 * Server-side validation lives in server/schemas and must conform to these types.
 */

export type RiskLevel = "low" | "moderate" | "high" | "severe" | "unknown";

export type AgentStatus = "success" | "unavailable" | "error";

export type DataState = "live" | "demo" | "historical" | "estimated" | "unavailable";

export type AgentId =
  | "orchestrator"
  | "air-quality"
  | "pollution-analysis"
  | "weather"
  | "heat-risk"
  | "flood-risk"
  | "wildfire-risk"
  | "water-stress"
  | "waste-intelligence"
  | "green-route"
  | "risk-analyst"
  | "advisory";

/** Standard agent output contract — fixed across all agents (ARCHITECTURE.md). */
export interface AgentResult {
  status: AgentStatus;
  riskLevel: RiskLevel;
  confidence: number;
  summary: string;
  factors: string[];
  evidence: string[];
  recommendations: string[];
  dataSources: string[];
  limitations: string[];
}

/** An agent result paired with its identity, for UI transparency ("Agents used"). */
export interface AgentRun {
  agentId: AgentId;
  agentName: string;
  result: AgentResult;
}

export interface AppLocation {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
}

export interface AirReading {
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
}

export interface WeatherReading {
  temperature: number;
  apparentTemperature: number | null;
  humidity: number;
  windSpeed: number;
  windDirection: number | null;
  precipitation: number;
  pressure: number | null;
  cloudiness: number | null;
  visibility: number | null;
  weatherCondition: string | null;
  weatherDescription: string | null;
  icon: string | null;
  /** Provider observation time (ISO). Demo fixtures use a deterministic anchor. */
  timestamp: string;
  /** Provider timezone offset from UTC (seconds), when supplied — used to show observation time in the city's local time. */
  timezoneOffset: number | null;
  /** City name returned by the weather provider — cross-check against the selected location. */
  providerCityName: string | null;
  /** Country code returned by the weather provider (e.g. "GB"). */
  providerCountry: string | null;
  /** Coordinates the provider actually resolved (may snap to its grid; may differ slightly from the request). */
  providerLat: number | null;
  providerLon: number | null;
}

export interface HourlyPoint {
  hour: string;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number | null;
  humidity: number | null;
}

export interface DailyPoint {
  day: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  precipitationMm: number;
  aqi: number | null;
  windSpeed: number;
  /** Precipitation probability 0–1 for the day, when the provider supplies it. */
  precipProbability: number | null;
}

/** Raw environmental inputs fetched from a provider (live or demo). */
export interface EnvironmentalData {
  location: AppLocation;
  air: AirReading | null;
  weather: WeatherReading | null;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  rainfallHistory: {
    days14: number[];
    state: DataState;
    source: string;
  };
  states: {
    air: DataState;
    weather: DataState;
    airTrend: DataState;
    forecast: DataState;
  };
  sources: {
    air: string;
    weather: string;
    airTrend: string;
    forecast: string;
  };
  errors: string[];
  fetchedAt: string;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: RiskLevel;
  message: string;
  agentName: string;
  createdAt: string;
}

export interface AdvisoryPayload {
  text: string;
  agentsUsed: string[];
  isAiInterpretation: boolean;
  usedGemini: boolean;
  limitations: string[];
}

export interface DashboardPayload {
  location: AppLocation;
  generatedAt: string;
  air: AirReading | null;
  weather: WeatherReading | null;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  states: EnvironmentalData["states"];
  sources: EnvironmentalData["sources"];
  agentRuns: AgentRun[];
  overall: AgentRun | null;
  advisory: AdvisoryPayload;
  alerts: AlertItem[];
  errors: string[];
}

export interface PollutantReading {
  key: keyof AirReading;
  label: string;
  value: number;
  unit: string;
  guideline: number;
  guidelineLabel: string;
  ratio: number;
}

export interface PollutionAnalysisPayload {
  observed: string[];
  interpretation: string[];
  confidence: number;
  hedged: true;
  dataSources: string[];
  limitations: string[];
  usedGemini: boolean;
  agentRun: AgentRun;
}

export interface AirPayload {
  location: AppLocation;
  generatedAt: string;
  air: AirReading | null;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
  pollutants: PollutantReading[];
  states: EnvironmentalData["states"];
  sources: EnvironmentalData["sources"];
  agentRun: AgentRun;
  errors: string[];
}

export interface ClimatePayload {
  location: AppLocation;
  generatedAt: string;
  weather: WeatherReading | null;
  daily: DailyPoint[];
  states: EnvironmentalData["states"];
  sources: EnvironmentalData["sources"];
  agentRuns: AgentRun[];
  errors: string[];
}

export interface DisasterPayload {
  location: AppLocation;
  generatedAt: string;
  daily: DailyPoint[];
  weather: WeatherReading | null;
  states: EnvironmentalData["states"];
  sources: EnvironmentalData["sources"];
  agentRuns: AgentRun[];
  authoritativeFeedsConfigured: false;
  errors: string[];
}

export interface WaterPayload {
  location: AppLocation;
  generatedAt: string;
  daily: DailyPoint[];
  weather: WeatherReading | null;
  rainfallHistory: EnvironmentalData["rainfallHistory"];
  states: EnvironmentalData["states"];
  sources: EnvironmentalData["sources"];
  agentRun: AgentRun;
  errors: string[];
}

export type WasteCategory =
  | "plastic"
  | "paper"
  | "glass"
  | "metal"
  | "organic"
  | "e-waste"
  | "hazardous"
  | "mixed"
  | "unknown";

export interface WasteClassification {
  category: WasteCategory;
  label: string;
  confidence: number;
  disposalGuidance: string[];
  environmentalImpact: string;
  isDemo: boolean;
  usedGemini: boolean;
  limitations: string[];
  agentRun: AgentRun;
}

export interface DemoWasteSample {
  id: string;
  name: string;
  hint: string;
  category: WasteCategory;
}

export interface RouteOption {
  id: string;
  name: string;
  distanceKm: number;
  durationMin: number;
  avgAqi: number;
  greenFraction: number;
  exposureIndex: number;
}

export interface RouteComparisonPayload {
  location: AppLocation;
  generatedAt: string;
  routes: RouteOption[];
  selectedIds: string[];
  agentRun: AgentRun;
  dataState: DataState;
}

export interface ReportSection {
  id: string;
  title: string;
  observed: string[];
  interpretation: string[];
  recommendations: string[];
}

export interface EnvironmentalReport {
  id: string;
  title: string;
  location: AppLocation;
  generatedAt: string;
  overallRisk: RiskLevel;
  isAiInterpretation: boolean;
  sections: ReportSection[];
  keyFindings: string[];
  dataSources: string[];
  limitations: string[];
  agentsUsed: string[];
}

export interface AssistantResponse {
  reply: string;
  intent: string;
  confidence: number;
  agentsUsed: AgentRun[];
  evidence: string[];
  dataSources: string[];
  limitations: string[];
  isAiInterpretation: boolean;
  usedGemini: boolean;
  generatedAt: string;
}

export interface ProviderStatus {
  domain: string;
  provider: string;
  state: DataState;
  notes: string;
}

export interface DataSourcesPayload {
  globalDemoMode: boolean;
  preferredProvider: string;
  geminiConfigured: boolean;
  providers: ProviderStatus[];
}

export interface LocationSearchPayload {
  results: AppLocation[];
  state: DataState;
  source: string;
  error?: string;
}

export interface DemoStep {
  id: string;
  title: string;
  talkingPoints: string[];
  route: string;
  dataLabel: string;
}

export interface DemoScenario {
  title: string;
  location: AppLocation;
  durationMinutes: string;
  steps: DemoStep[];
}

export interface HealthPayload {
  ok: boolean;
  demoMode: boolean;
  preferredProvider: string;
  geminiConfigured: boolean;
  version: string;
}
