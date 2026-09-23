import { heatIndexCelsius } from "../../shared/aqi";

/**
 * Prefer the provider's apparent temperature when available; otherwise compute
 * the heat index from measured temperature + humidity.
 */
export function heatHiFromIndex(
  apparentTemperature: number | null,
  temperature: number,
  humidity: number,
): number {
  if (
    apparentTemperature !== null &&
    Number.isFinite(apparentTemperature) &&
    apparentTemperature > 0
  ) {
    return apparentTemperature;
  }
  return heatIndexCelsius(temperature, humidity);
}
