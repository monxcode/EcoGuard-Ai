import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCATION_ID,
  findLocation,
  isValidLocationId,
  LOCATIONS,
} from "../../shared/locations";
import type { AppLocation, HealthPayload } from "../../shared/types";
import { api } from "../services/api";

export type Units = "metric" | "imperial";
export type AlertSeverity = "moderate" | "high" | "severe";

export interface AppSettings {
  locationId: string;
  units: Units;
  demoMode: boolean;
  alertsEnabled: boolean;
  alertMinSeverity: AlertSeverity;
}

const STORAGE_KEY = "ecoguard.settings.v1";

const DEFAULTS: AppSettings = {
  locationId: DEFAULT_LOCATION_ID,
  units: "metric",
  demoMode: false,
  alertsEnabled: true,
  alertMinSeverity: "high",
};

function guardLocationId(id: unknown): string {
  if (typeof id !== "string" || !id) return DEFAULT_LOCATION_ID;
  return isValidLocationId(id) ? id : DEFAULT_LOCATION_ID;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    const severity = parsed.alertMinSeverity;
    return {
      locationId: guardLocationId(parsed.locationId),
      units: parsed.units === "imperial" ? "imperial" : "metric",
      demoMode: Boolean(parsed.demoMode),
      alertsEnabled: parsed.alertsEnabled !== false,
      alertMinSeverity:
        severity === "moderate" || severity === "severe" || severity === "high"
          ? severity
          : "high",
    };
  } catch {
    return DEFAULTS;
  }
}

interface AppContextValue {
  settings: AppSettings;
  location: AppLocation;
  setLocation: (id: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setDemoModeRemote: (enabled: boolean) => Promise<void>;
  health: HealthPayload | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [health, setHealth] = useState<HealthPayload | null>(null);

  useEffect(() => {
    api
      .getHealth()
      .then((h) => {
        setHealth(h);
        setSettings((prev) =>
          prev.demoMode === h.demoMode ? prev : { ...prev, demoMode: h.demoMode },
        );
      })
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const setLocation = useCallback((id: string) => {
    setSettings((prev) => ({ ...prev, locationId: guardLocationId(id) }));
  }, []);

  const setDemoModeRemote = useCallback(async (enabled: boolean) => {
    const result = await api.setDemoMode(enabled);
    setSettings((prev) => ({ ...prev, demoMode: result.demoMode }));
  }, []);

  const location = useMemo(() => findLocation(settings.locationId), [settings.locationId]);

  const value = useMemo(
    () => ({ settings, location, setLocation, updateSettings, setDemoModeRemote, health }),
    [settings, location, setLocation, updateSettings, setDemoModeRemote, health],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export { LOCATIONS };
