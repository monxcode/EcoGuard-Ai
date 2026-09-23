import { config } from "../config/env";

/**
 * Runtime demo-mode flag, toggleable at runtime (Settings / Demo page).
 * When true, every provider serves deterministic demo fixtures.
 */
let forcedDemoMode = config.initialDemoMode;

export function isDemoMode(): boolean {
  return forcedDemoMode;
}

export function setDemoMode(enabled: boolean): boolean {
  forcedDemoMode = enabled;
  return forcedDemoMode;
}

/** True when this domain should serve demo data instead of live data. */
export function domainUsesDemo(liveConfigured: boolean): boolean {
  return forcedDemoMode || config.preferredProvider === "demo" || !liveConfigured;
}
