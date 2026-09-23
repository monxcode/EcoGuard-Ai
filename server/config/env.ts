import "dotenv/config";

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true";
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  initialDemoMode: bool(process.env.DEMO_MODE, false),
  preferredProvider: (process.env.DATA_PROVIDER ?? "demo") === "live" ? "live" : "demo",
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY?.trim() || undefined,
  version: "0.1.0",
};

export const geminiConfigured = Boolean(config.geminiApiKey);
export const openWeatherConfigured = Boolean(config.openWeatherApiKey);
