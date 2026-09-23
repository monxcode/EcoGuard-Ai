# DATA-SOURCES.md — EcoGuard AI

> Update this file whenever a data provider is added, removed, or changes tier (e.g. moves from
> "not yet integrated" to "live"). This is the source of truth for what is actually real vs.
> demo at any given point in the project — keep it accurate even if that means admitting a
> feature is still demo-only.

## The five data states

Every piece of environmental data shown in the UI belongs to exactly one of these states, and
the state must be visible to the user at the point of display — never inferred or hidden:

| State | Meaning | Example UI label |
|---|---|---|
| **LIVE** | Fetched just now from a real, configured external provider | "Live AQI" |
| **DEMO** | Deterministic fixture data, used when no provider is configured or Demo Mode is on | "Demo AQI" |
| **HISTORICAL** | Real past data from a provider (not a live snapshot) | "Historical trend (last 7 days)" |
| **ESTIMATED** | AI- or heuristic-derived value, not a direct measurement | "Estimated exposure" |
| **UNAVAILABLE** | No provider configured and no applicable demo fixture | "Data unavailable" |

**Rule:** these states are never mixed silently. A dashboard combining a live AQI reading with a
demo flood risk value must label each independently — not present an overall "live" badge for
mixed content.

## Where this lives in the data model

Every `AgentResult` (see ARCHITECTURE.md) carries `dataSources: string[]`. Each entry should
identify both the provider/dataset **and** implicitly or explicitly its state, e.g.:

- `"OpenAQ (Live)"`
- `"Demo Data — Air Quality Fixture Set"`
- `"Open-Meteo Forecast (Live)"`
- `"Estimated from AQI + Weather (no direct source)"`

The UI's per-card/per-widget badge should be derived from `AgentResult.status` +
`dataSources`, not re-decided ad hoc per component. `status: "unavailable"` → render the
UNAVAILABLE state regardless of what's in `dataSources`.

## Demo Mode

Demo Mode exists so the product can be demonstrated end-to-end **without any external API
keys**. Requirements:

- Every `server/tools/*` client that talks to a real provider must have a paired deterministic
  demo/fixture implementation returning the same shape.
- Demo values are realistic-looking but clearly and consistently labeled "DEMO DATA" in the UI —
  never presented as if live.
- Demo results must be **predictable** (same inputs → same outputs) so a live hackathon demo
  doesn't produce surprises.
- Demo Mode must exercise all major UI capabilities — dashboard, air quality, at least one
  disaster-risk agent, the assistant, and (once built) reports/alerts.
- A dedicated `/demo` route (or equivalent flag-driven experience) should exist, tuned for a
  3–5 minute presentation: a clear starting state, a couple of interesting risk scenarios
  (e.g. one location with moderate air quality, one with a simulated heat + AQI combined risk),
  and no dead ends.
- Whether an agent is in live or demo mode should be controllable via environment/config (e.g.
  missing provider key → automatic demo fallback for that provider specifically, plus a global
  `DEMO_MODE` flag to force it everywhere for the pitch).

## Provider integration guidance, by domain

For each domain below: integrate the real provider **only when actually configured** (API key
present); otherwise fall back to that domain's demo fixture and mark it as such. Do not
hardcode a single provider as the only possible source — keep the tool client interface
provider-agnostic so a provider can be swapped without touching agent logic.

- **Air quality (AQI, PM2.5, PM10, NO2, O3, CO, SO2):** integrate a real air-quality API when a
  key is configured (e.g. a public AQI/air-quality data provider). Historical trend requires a
  provider that supports time-series queries — degrade to "trend unavailable" rather than
  faking a trend line.
- **Weather (temperature, humidity, wind, precipitation, forecast):** integrate a real weather
  API when configured. This feeds Heat, Flood, and Wildfire agents — treat it as shared
  infrastructure, not a per-agent client.
- **Flood (rainfall, river/water level, terrain):** river/water-level and terrain data may not
  be available for many locations — this is expected. When unavailable, base the flood risk
  purely on rainfall/forecast and say explicitly in `limitations` that water-level/terrain data
  wasn't available, rather than skipping the limitation.
- **Wildfire (dryness, vegetation, historical fire data):** vegetation/authoritative fire
  datasets are the hardest to source for a hackathon — expect this agent to run primarily on
  temperature/humidity/wind/dryness proxies, with `limitations` naming what's missing.
- **Water stress (rainfall history, reservoir/drought indicators):** reservoir/drought data
  sources are often region-specific or unavailable — same pattern: degrade to what rainfall
  data supports, disclose the gap.
- **Waste classification:** this is a Gemini vision task (image in, category out), not a
  separate "provider" — still needs a demo mode using pre-set example images/results for the
  presentation.
- **Geospatial / routing (GreenRoute):** route and distance data needs a mapping/routing
  provider; exposure-along-route is an *estimate* layered on top of Air Quality Agent output —
  always labeled ESTIMATED, never presented as measured.

**Never name a specific provider in code comments or UI copy as "integrated" until it is
actually wired up and tested with a real key** — this file and the code must not overstate
integration status. Keep the actual current status accurate here as providers get wired up:

| Domain | Status | Notes |
|---|---|---|
| Air quality | **Live-capable** (default: Demo) | Open-Meteo Air Quality (`us_aqi`, keyless) when `DATA_PROVIDER=live`; falls back to demo fixtures per-domain on failure. Default config serves Demo. |
| Weather | **Live-capable** (default: Demo) | Open-Meteo Forecast (keyless) — shared substrate for Heat/Flood/Wildfire/Water. Default: Demo. |
| Flood | **Derived** (rainfall/forecast only) | No river/water-level or terrain feed — screening capped at `high`, limitation always disclosed. Inputs follow the weather row's live/demo state. |
| Wildfire | **Derived** (weather proxies) | No vegetation or historical fire-incident feed — temperature/humidity/wind/rainfall proxy only, disclosed in `limitations`. |
| Water stress | **Derived** (rainfall history + forecast) | 14-day rainfall history uses demo fixtures whenever demo is preferred (incl. default `DATA_PROVIDER=demo`); `unavailable` only when live is preferred (no live history source configured). No reservoir/drought feed. |
| Waste (Gemini vision) | **Demo** without key; **Live** with `GEMINI_API_KEY` | Image bytes go server-side only. Hazardous/e-waste guidance always comes from the canned safe list, never model output. |
| Routing/geospatial | **Demo fixtures** | No routing provider configured — route options are fixtures; exposure is always labeled **ESTIMATED** with a 10% inconclusive noise band. |
| AI reasoning (advisory/interpretation) | **Demo/rules-based** without key; **Live** with `GEMINI_API_KEY` | Server-side Gemini only; output schema-validated (Zod). Without a key, deterministic rules-based phrasing is used and labeled. |

## Source attribution requirements

- The UI must have a **Data Sources** area listing every provider/dataset currently in use (or
  currently in demo mode), so a user can see where information comes from.
- Reports (see TASKS.md) must list `dataSources` and `limitations` for every section, and must
  clearly separate **observed data** from **AI-generated interpretation** — these are not the
  same thing and must not be visually or textually merged.

## Configuration

- All provider keys live in `.env` (never committed); `.env.example` documents the required
  variable names with placeholder/empty values only — never a real-looking fake key.
- A missing key for a given provider should cause that specific domain to fall back to demo
  data, not crash the app or silently disable the whole feature area.
