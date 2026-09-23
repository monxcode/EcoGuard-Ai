import { useState } from "react";
import { Bell, FlaskConical, MapPin, Ruler, TestTube } from "lucide-react";
import { LOCATIONS } from "../../shared/locations";
import { useApp, type AlertSeverity, type Units } from "../context/AppContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { InlineError } from "../components/ui/states";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-emerald-600" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, setDemoModeRemote, health } = useApp();
  const [demoPending, setDemoPending] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const toggleDemo = async (enabled: boolean) => {
    setDemoPending(true);
    setDemoError(null);
    try {
      await setDemoModeRemote(enabled);
    } catch {
      setDemoError("Could not update demo mode on the server.");
    } finally {
      setDemoPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Preferences are stored locally in your browser" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Units"
            icon={<Ruler className="w-4 h-4 text-slate-400" aria-hidden />}
          />
          <CardBody className="pt-2 space-y-2">
            {(
              [
                { id: "metric", label: "Metric (°C, km/h, km)" },
                { id: "imperial", label: "Imperial (°F, mph, mi)" },
              ] as Array<{ id: Units; label: string }>
            ).map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  settings.units === opt.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="units"
                  checked={settings.units === opt.id}
                  onChange={() => updateSettings({ units: opt.id })}
                  className="accent-emerald-700"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Default location"
            icon={<MapPin className="w-4 h-4 text-slate-400" aria-hidden />}
          />
          <CardBody className="pt-2">
            <select
              value={settings.locationId}
              onChange={(e) => updateSettings({ locationId: e.target.value })}
              className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white"
              aria-label="Default location"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}, {loc.region}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Used as the starting location the next time you open the app.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Data & demo mode"
            icon={<TestTube className="w-4 h-4 text-slate-400" aria-hidden />}
            action={<DataStateBadge state={settings.demoMode ? "demo" : health ? (health.preferredProvider === "live" ? "live" : "demo") : "demo"} />}
          />
          <CardBody className="pt-2 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">Force demo mode</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Makes every provider serve deterministic demo fixtures — ideal for presentations
                  with zero API keys.
                </p>
              </div>
              <Toggle
                checked={settings.demoMode}
                onChange={(v) => void toggleDemo(v)}
                label="Force demo mode"
              />
            </div>
            {demoPending ? <p className="text-xs text-slate-500">Updating server…</p> : null}
            {demoError ? <InlineError message={demoError} /> : null}
            <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
              <p>
                Preferred provider: <strong>{health?.preferredProvider ?? "demo"}</strong>
                {" · "}
                Gemini:{" "}
                <strong>{health?.geminiConfigured ? "configured" : "not configured"}</strong>
              </p>
              <p className="text-slate-400">
                Configured server-side via DATA_PROVIDER, DEMO_MODE and GEMINI_API_KEY — keys never
                reach the browser.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Alerts"
            icon={<Bell className="w-4 h-4 text-slate-400" aria-hidden />}
          />
          <CardBody className="pt-2 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">In-app alerts</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Show a bell notification when agents detect elevated environmental risk.
                </p>
              </div>
              <Toggle
                checked={settings.alertsEnabled}
                onChange={(v) => updateSettings({ alertsEnabled: v })}
                label="Enable in-app alerts"
              />
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Minimum severity</span>
              <select
                value={settings.alertMinSeverity}
                onChange={(e) =>
                  updateSettings({ alertMinSeverity: e.target.value as AlertSeverity })
                }
                disabled={!settings.alertsEnabled}
                className="mt-1.5 w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white disabled:opacity-50"
              >
                <option value="moderate">Moderate and above</option>
                <option value="high">High and above</option>
                <option value="severe">Severe only</option>
              </select>
            </label>
            <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
              Alerts are advisory signals from EcoGuard agents — not official government warnings.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="About"
          icon={<FlaskConical className="w-4 h-4 text-slate-400" aria-hidden />}
        />
        <CardBody className="pt-2 text-sm text-slate-600 space-y-1">
          <p>
            <strong>EcoGuard AI</strong> — AI-powered environmental & climate intelligence for
            Clean Air & Climate Resilience.
          </p>
          <p className="text-xs text-slate-500">
            React + Vite + Tailwind + Recharts · Express + TypeScript · Google Gemini (server-side)
            · multi-agent orchestration. Demo data is always labeled; live data only appears when a
            provider is configured.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
