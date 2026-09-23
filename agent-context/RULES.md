# RULES.md — EcoGuard AI

> These are non-negotiable rules, not suggestions. If a task seems to require breaking one of
> these, stop and flag it rather than proceeding. Update this file if a rule is deliberately
> changed by a project decision — don't let code and this file disagree silently.

## 1. Data integrity rules (highest priority)

The application must always distinguish between **LIVE**, **DEMO**, **HISTORICAL**,
**ESTIMATED**, and **UNAVAILABLE** data, and must never mix them silently. Full labeling
contract, per-domain guidance, and demo-mode design: see
[DATA-SOURCES.md](./DATA-SOURCES.md) — that file is the source of truth; this section is the
short version.

- Never fabricate AQI, temperature, rainfall, flood warnings, wildfire events, pollution
  sources, water levels, government alerts, or sensor measurements.
- If an external API is unavailable or unconfigured, show a clear "unavailable" state or an
  intentionally-labeled demo value — never disguise a fallback as live data.
- Never claim an API is live/configured when it isn't, and never claim to have accessed a data
  source that wasn't actually accessed.

## 2. AI behavior rules

- Be factual, cautious, evidence-based, transparent, concise, useful.
- When evidence is weak or data is unavailable, **say so** in the response (`limitations` field
  and/or user-facing copy) — don't smooth it over.
- Show confidence/uncertainty on assessments (`confidence` field on `AgentResult`).
- Never manufacture evidence or sources.
- Use hedged causal language everywhere pollution/risk factors are discussed: *possible
  contributor*, *associated factor*, *likely influence*, *observed alongside* — never "caused
  by" / "will definitely" unless an authoritative source explicitly confirms it (e.g. an actual
  flood warning from a government feed, not an AI inference).
- Agents must not expose internal chain-of-thought or private model deliberation. The UI may
  show concise reasoning summaries ("Assessment based on AQI, PM2.5, temperature and humidity")
  and "Agents used: ..." lists — nothing deeper.
- AI-generated recommendations (e.g. from EcoCity AI) must never be presented as official
  government decisions.
- WasteWise must never give unsafe disposal instructions for hazardous materials; when hazard
  classification is uncertain, default to the more cautious guidance and disclose the
  uncertainty.

## 3. Security rules

Never:
- commit API keys, `.env` files, or any credentials,
- expose the Gemini API key or the Supabase **service-role** key in client-side code or bundles,
- hardcode credentials anywhere in source,
- trust arbitrary user input without validation,
- execute arbitrary generated code or use unsafe dynamic evaluation (`eval`, dynamic
  `Function()`, etc. on untrusted input),
- put third-party API calls (Gemini, environmental data providers) inside React components —
  they belong in `server/` (see ARCHITECTURE.md).

Always:
- use `.env` for local secrets and keep a `.env.example` with placeholder keys/names only,
- keep all secrets server-side; the frontend only ever talks to your own Express API,
- validate API inputs (route level) and agent outputs (schema level) before they reach the UI,
- handle upstream API failures gracefully — fall back to a clearly-labeled unavailable/demo
  state, don't crash or silently show stale/wrong data.

## 4. Code architecture rules

- Prefer modular architecture: UI, business logic, AI orchestration, agents, tools, API clients,
  data transformation, types, and validation are separated (see ARCHITECTURE.md § project
  structure) — don't collapse them into one giant file/component.
- Avoid giant components and giant files; split when a file is doing more than one job.
- Use TypeScript types/interfaces consistently; the `AgentResult` shape (ARCHITECTURE.md) is
  fixed across all agents.
- Keep agent implementations independently testable — an agent should be callable and
  assertable without spinning up the whole Orchestrator or the UI.
- Reuse existing components/services before adding new ones; don't introduce a new dependency
  when an existing project capability already covers the need.
- Don't over-engineer: no speculative abstraction layers, no premature microservices, no queues
  or message buses for a hackathon-scale app.

## 5. Testing requirements

Cover, as the implementation reaches each area:
- agent output validation (schema conformance, hedged language present where required),
- behavior under API failure / unavailable data,
- demo mode determinism,
- risk classification logic,
- orchestrator routing (right agents invoked for a given request, wrong ones not invoked),
- important utility functions,
- critical UI states (loading, unavailable, demo-labeled, error).

At minimum, the application must always be buildable without TypeScript errors.

## 6. Definition of done (every change)

1. Install dependencies.
2. Run lint, if configured.
3. Run tests, if configured.
4. Run the production build.
5. Fix any errors surfaced by the above.
6. Manually verify the critical flow the change touched.
7. Update the relevant `agent-context/` file(s) if the change affected architecture, agent
   responsibilities, rules, data sources, UI/UX direction, or priorities (see the "which file to
   update" table in [TASKS.md](./TASKS.md) § Keeping this documentation current).

Never rewrite the entire project unnecessarily, delete working functionality without a stated
reason, or sacrifice a working P0 feature (see TASKS.md) to add unfinished P2 features.
