import { describe, expect, it } from "vitest";
import { airProviderErrorMessage, dayAverageAqi } from "./providers";

describe("air-quality provider error mapping (safe for the UI banner)", () => {
  it("maps timeouts, HTTP errors, and bad payloads to friendly messages", () => {
    const abort = new Error("This operation was aborted");
    abort.name = "AbortError";
    expect(airProviderErrorMessage(abort)).toBe("air-quality provider timed out");
    expect(airProviderErrorMessage(new Error("HTTP 429"))).toBe("air-quality provider error");
    expect(airProviderErrorMessage(new Error("HTTP 500"))).toBe("air-quality provider error");
    expect(airProviderErrorMessage(new Error("missing us_aqi/pm2_5 in response"))).toBe(
      "air-quality provider returned no AQI value",
    );
    expect(airProviderErrorMessage(new Error("no hourly data"))).toBe(
      "air-quality provider returned no hourly AQI data",
    );
    expect(airProviderErrorMessage(new SyntaxError("Unexpected token <"))).toBe(
      "air-quality provider returned an unexpected response",
    );
    expect(airProviderErrorMessage(new Error("fetch failed"))).toBe(
      "air-quality provider unavailable",
    );
    expect(airProviderErrorMessage("boom")).toBe("air-quality provider unavailable");
  });

  it("never leaks raw fetch wording, URLs, or query parameters", () => {
    const cases = [
      new Error("This operation was aborted"),
      new Error("fetch failed"),
      new Error("HTTP 401"),
      new Error("getaddrinfo ENOTFOUND air-quality-api.open-meteo.com"),
    ];
    for (const err of cases) {
      const message = airProviderErrorMessage(err);
      expect(message).not.toMatch(/http|url|appid|api_key|air-quality-api\.open-meteo/i);
    }
  });
});

describe("daily AQI date mapping (forecast date → real AQI)", () => {
  it("averages real us_aqi samples by local calendar date", () => {
    const map = dayAverageAqi({
      hourly: {
        time: [
          "2026-09-23T00:00",
          "2026-09-23T01:00",
          "2026-09-24T00:00",
          "2026-09-24T01:00",
        ],
        us_aqi: [40, 60, 10, null],
      },
    });
    expect(map.get("2026-09-23")).toBe(50);
    expect(map.get("2026-09-24")).toBe(10); // null sample skipped, only the real one averaged
  });

  it("never fabricates a day that has no real data", () => {
    const map = dayAverageAqi({
      hourly: {
        time: ["2026-09-25T00:00", "2026-09-25T01:00"],
        us_aqi: [null, null],
        pm2_5: [null, null],
      },
    });
    expect(map.has("2026-09-25")).toBe(false);
  });

  it("falls back to AQI derived from real pm2_5 (EPA breakpoints) when us_aqi is absent", () => {
    const map = dayAverageAqi({
      hourly: { time: ["2026-09-23T00:00"], pm2_5: [35.5] },
    });
    expect(map.get("2026-09-23")).toBe(100); // 35.5 µg/m³ → US AQI 100
  });
});
