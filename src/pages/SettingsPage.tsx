import { useState } from "react";
import { Info } from "lucide-react";
import { useApp, type AlertSeverity, type Units } from "../context/AppContext";
import { PageHeader } from "../components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataStateBadge } from "../components/ui/DataStateBadge";
import { InlineError } from "../components/ui/states";
import { LocationSearch } from "../components/ui/LocationSearch";
import { Segmented, Toggle, selectClass } from "../components/ui/Button";

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

  const providerState = settings.demoMode
    ? "demo"
    : health
      ? health.preferredProvider === "live"
        ? "live"
        : "demo"
      : "demo";

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Preferences are stored locally in your browser" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Units" />
          <CardBody className="pt-3 space-y-3">
            <Segmented<Units>
              value={settings.units}
              onChange={(units) => updateSettings({ units })}
              options={[
                { id: "metric", label: "Metric °C · km/h · km" },
                { id: "imperial", label: "Imperial °F · mph · mi" },
              ]}
              ariaLabel="Temperature and distance units"
            />
            <p className="text-xs text-ink-3 leading-relaxed">
              Applies across weather, route distances and forecast values.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Default location" />
          <CardBody className="pt-3">
            <LocationSearch variant="block" label="Default location" id="settings-location" />
            <p className="mt-2.5 text-xs text-ink-3 leading-relaxed">
              Starting location next time you open the app. Search any city — results come from
              OpenWeather Geocoding.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Data & demo mode"
            action={<DataStateBadge state={providerState} />}
          />
          <CardBody className="pt-3 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Force demo mode</p>
                <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                  Every provider serves deterministic demo fixtures — works with zero API keys.
                </p>
              </div>
              <Toggle
                checked={settings.demoMode}
                onChange={(v) => void toggleDemo(v)}
                label="Force demo mode"
              />
            </div>
            {demoPending ? (
              <p className="text-xs text-ink-3" role="status">
                Updating server…
              </p>
            ) : null}
            {demoError ? <InlineError message={demoError} /> : null}
            <div className="text-xs text-ink-2 space-y-1 border-t border-line-2 pt-3">
              <p>
                Preferred provider: <strong className="font-medium text-ink">{health?.preferredProvider ?? "demo"}</strong>
                {" · "}
                Gemini:{" "}
                <strong className="font-medium text-ink">
                  {health?.geminiConfigured ? "configured" : "not configured"}
                </strong>
              </p>
              <p className="text-ink-3 leading-relaxed">
                Configured server-side via DATA_PROVIDER, DEMO_MODE and GEMINI_API_KEY — keys never
                reach the browser.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Alerts" />
          <CardBody className="pt-3 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">In-app alerts</p>
                <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                  Notify when agents detect elevated environmental risk.
                </p>
              </div>
              <Toggle
                checked={settings.alertsEnabled}
                onChange={(v) => updateSettings({ alertsEnabled: v })}
                label="Enable in-app alerts"
              />
            </div>
            <label className="block">
              <span className="block text-[13px] font-medium text-ink-2 mb-1.5">Minimum severity</span>
              <select
                value={settings.alertMinSeverity}
                onChange={(e) =>
                  updateSettings({ alertMinSeverity: e.target.value as AlertSeverity })
                }
                disabled={!settings.alertsEnabled}
                className={selectClass}
              >
                <option value="moderate">Moderate and above</option>
                <option value="high">High and above</option>
                <option value="severe">Severe only</option>
              </select>
            </label>
            <p className="text-xs text-ink-3 border-t border-line-2 pt-3 leading-relaxed">
              Alerts are advisory signals from EcoGuard agents — not official government warnings.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card className="p-4 bg-surface-2">
        <p className="text-sm text-ink-2 leading-relaxed flex gap-2.5">
          <Info className="w-4 h-4 mt-0.5 text-ink-3 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold text-ink">EcoGuard AI</strong> — AI-powered
            environmental &amp; climate intelligence for Clean Air &amp; Climate Resilience. React ·
            Vite · Tailwind · Recharts · Express · server-side Gemini · multi-agent orchestration.
            Demo data is always labeled; live data appears only when a provider is configured.
          </span>
        </p>
      </Card>
    </div>
  );
}
