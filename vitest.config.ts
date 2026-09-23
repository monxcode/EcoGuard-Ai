import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Force demo mode for deterministic tests — dotenv will not override these.
    env: {
      DATA_PROVIDER: "demo",
      OPENWEATHER_API_KEY: "",
      DEMO_MODE: "false",
    },
  },
});
