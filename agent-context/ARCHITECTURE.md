# ARCHITECTURE.md — EcoGuard AI

> Update this file whenever the actual architecture diverges from what's described here —
> module boundaries, request flow, tech stack, or project structure. Product scope lives in
> [PROJECT.md](./PROJECT.md); agent responsibilities live in [AGENTS.md](./AGENTS.md).

## Conceptual request flow

```
User
  ↓
EcoGuard AI Interface (React/Vite frontend)
  ↓
Environmental Orchestrator (server-side)
  ↓
Specialized Intelligence Agents (only the relevant subset — see AGENTS.md)
  ↓
Risk Analysis Layer (Risk Analyst Agent)
  ↓
Environmental Advisory Agent
  ↓
Final response → Dashboard / Chat reply / Alert / Report
```

This is conceptual, not a literal microservice topology. In implementation this can — and for a
hackathon *should* — be a single Node/Express backend where "agents" are TypeScript modules/
functions/classes with a shared interface, not separate deployed services. Do not introduce
network hops, queues, or separate processes between agents unless a specific task requires it.

## Layers and responsibilities

| Layer | Responsibility | Lives in |
|---|---|---|
| UI / pages | Render dashboard, chat, reports, settings; no business logic | `src/pages`, `src/components`, `src/features` |
| Client services/hooks | Call backend API, manage client state | `src/services`, `src/hooks` |
| API routes | HTTP surface, input validation, auth (if any) | `server/routes` |
| Orchestrator | Decide which agents to invoke for a given request; assemble final response | `server/agents` (orchestrator module) |
| Agents | One environmental domain each; call tools; return standard agent output | `server/agents` |
| Tools | Data-provider clients (weather API, AQI API, geocoding, etc.), Gemini client | `server/tools`, `server/services` |
| Schemas | Zod (or equivalent) schemas + TS types for agent I/O and API payloads | `server/schemas`, `src/types` |
| Middleware | Error handling, request validation, rate limiting if added | `server/middleware` |

**Hard rule:** Gemini calls and other third-party API calls happen in `server/` only, never in
`src/` (React) components. React talks to the Express API, never directly to Gemini or external
environmental data providers. See [RULES.md](./RULES.md) § Security.

## Actual project structure (as implemented)

```
shared/            # contracts imported by BOTH server and client
├── types.ts       # AgentResult, payload types, data states
├── aqi.ts         # AQI categories, heat index, breakpoint helpers
└── locations.ts   # selectable locations + defaults

src/               # React client (Vite)
├── App.tsx        # lazy-loaded route table inside AppShell
├── main.tsx       # bootstrap: BrowserRouter + AppProvider
├── context/       # AppContext (settings in localStorage, health sync)
├── components/
│   ├── ui/        # Card, PageHeader, DataStateBadge, RiskPill, StatTile, ConfidenceBar, states
│   ├── charts/    # Recharts wrappers (AQI trend, rainfall, exposure, ...)
│   ├── layout/    # AppShell (sidebar/topbar/location select), AlertsBell
│   ├── agents/    # AgentResultCard (uniform agent-output rendering)
│   └── dashboard/ # DashboardView
├── pages/         # route-level pages (Dashboard, Air, Climate, Disaster, Water,
│                  #   Waste, Route, Assistant, Reports, Demo, Settings, DataSources, NotFound)
├── services/      # api.ts — typed fetch client for every /api route
├── hooks/         # useApi (GET with loading/error/retry), useAction
└── utils/         # format, risk-level metadata, dataState metadata, math

server/            # Express API (bundled to dist/server.js via esbuild)
├── index.ts       # app wiring; serves dist/ SPA in production
├── config/        # env.ts (PORT, DATA_PROVIDER, DEMO_MODE, GEMINI_*, OPENWEATHER_API_KEY)
├── agents/        # orchestrator + 12 agent modules + vitest suites
├── tools/         # providers.ts (cache/fallback; demo + Open-Meteo air live),
│                  #   openweather.ts (OpenWeather current + 5-day forecast + geocoding
│                  #   client, Zod response validation, normalization, connection
│                  #   verification), demoFixtures, demoState, gemini, wasteClassifier, noise
├── routes/        # meta, dashboard, intelligence, assistant, waste, greenRoutes, reports
├── services/      # alerts, demoScenario
├── middleware/    # errorHandler (ApiError, Zod, asyncRoute)
└── schemas/       # zod: agent output + API request validation

agent-context/     # this directory — permanent context for AI coding agents
```

Notes on deliberate deviations from the earlier suggestion above:
- Shared contracts live in `shared/` (not `src/types/`) because the server and client both
  import them; server Zod schemas conform to these types.
- No `src/features/` or `src/app/` — routing lives in `App.tsx`, the shell in
  `components/layout/AppShell.tsx`; the feature set didn't justify another layer.
- No database: settings persist in `localStorage`; demo toggle and fixtures are in-memory
  server state (per ARCHITECTURE.md § Database policy — don't add one "for completeness").

If a task genuinely requires a different structure, make the change deliberately and update
this file in the same change — don't let it drift silently.

## Technology stack

**Frontend:** React + Vite + TypeScript, Tailwind CSS, Recharts (charts), Lucide (icons).

**Backend:** Node.js + Express + TypeScript.

**AI:** Google Gemini via the current official Google GenAI SDK at implementation time — check
current SDK usage before writing integration code rather than assuming a remembered pattern;
SDKs change. Gemini calls are server-side only; API keys never reach the client bundle.

**Database:** Supabase/Postgres — **only** where a feature genuinely needs persistence (see
below). Do not add a database "for completeness."

Likely persistence needs, if/when a task calls for them:
- User preferences (units, default location)
- Saved locations
- Alert subscriptions/history
- Generated reports
- Demo configuration (if it needs to be admin-editable rather than static fixtures)

If a feature can work with in-memory state, static fixtures, or client-side state for the
hackathon, prefer that over standing up persistence.

## Standard agent output contract

All agents (see [AGENTS.md](./AGENTS.md) for the per-agent list) return the same shape, defined
once with Zod (or equivalent) and typed with TypeScript — do not let each agent invent its own
ad hoc return shape:

```ts
type RiskLevel = "low" | "moderate" | "high" | "severe" | "unknown";
type AgentStatus = "success" | "unavailable" | "error";

interface AgentResult {
  status: AgentStatus;
  riskLevel: RiskLevel;
  confidence: number;        // 0.0–1.0
  summary: string;           // concise, user-facing
  factors: string[];         // hedged, e.g. "possible contributor: ..."
  evidence: string[];        // what data backs the summary
  recommendations: string[];
  dataSources: string[];     // provider/dataset names, or "Demo Data" (see DATA-SOURCES.md)
  limitations: string[];     // what the assessment can't tell you
}
```

The exact validation mechanism (Zod schema vs. hand-written types) can be decided at
implementation time, but the *shape* above is fixed across agents so the Orchestrator, Risk
Analyst, and UI can consume any agent's output uniformly.

## Orchestrator behavior

- Given a user request (dashboard load, chat message, report request), the Orchestrator decides
  **which agents are relevant** and invokes only those. It must not fan out to all agents by
  default — see the worked example in [AGENTS.md](./AGENTS.md).
- Agent calls can run in parallel when independent (e.g. Air Quality + Weather), then be reduced
  by the Risk Analyst Agent and phrased by the Environmental Advisory Agent.
- The Orchestrator, not individual agents, is responsible for assembling which `dataSources`
  and which "Agents used: ..." line the UI displays.

## Data flow for live vs. demo mode

Every tool client (`server/tools/*`) must support both a live path (real API call) and a demo
path (fixture data), and every `AgentResult` must make it unambiguous which one was used — this
is enforced at the schema/UI layer, not left to convention. Full policy: see
[DATA-SOURCES.md](./DATA-SOURCES.md).

## Testing & build gates

Before any change is considered complete: install deps → lint (if configured) → test (if
configured) → production build → fix errors → manually verify the critical flow touched by the
change. Full checklist: [TASKS.md](./TASKS.md) § Definition of done.
