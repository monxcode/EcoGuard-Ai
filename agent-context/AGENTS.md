# AGENTS.md — EcoGuard AI Multi-Agent System

> Update this file whenever an agent's responsibility, inputs, or output changes, or when an
> agent is added/removed/merged. The shared output contract lives in
> [ARCHITECTURE.md](./ARCHITECTURE.md) § Standard agent output contract — don't duplicate it
> per-agent below, only note deviations if any are ever needed (there should be none).

## Design rule: agents are focused and composable

Each agent has **one** clearly defined responsibility, takes a defined input, and returns an
`AgentResult` (see ARCHITECTURE.md). Agents are TypeScript modules under `server/agents/`, not
separate services. Agents must not:

- expose internal chain-of-thought or raw model deliberation (only concise, user-facing
  `summary` / `factors` / `evidence` strings),
- invent data, sources, or events not actually present in their inputs,
- make unqualified causal claims (use *possible contributor / likely influence / associated
  factor* — see RULES.md § AI behavior rules).

## Agent list

### 1. Environmental Orchestrator
**Responsibility:** Given a user request (dashboard load, chat message, report request, alert
check), decide which of agents 2–10 are relevant, invoke them (in parallel where independent),
and pass their results to the Risk Analyst Agent and then the Environmental Advisory Agent.
**Input:** user request/context (location, query text or dashboard intent, optional time range).
**Output:** the assembled final response (not itself an `AgentResult` — it's a composition of
the agents it called, plus the Advisory Agent's phrasing).
**Must not:** invoke every agent for every request (see worked example below).

### 2. Air Quality Agent
**Responsibility:** AQI, PM2.5, PM10, NO2, O3, CO, SO2, historical trend, location comparison.
**Inputs:** location, optional time range, live/demo AQI provider data.
**Output notes:** `factors` may include weather/wind/traffic-adjacent context only as *hedged*
possible influences, not causes — deep causal analysis is the Pollution Analysis Agent's job.

### 3. Pollution Analysis Agent ("Pollution Source Detective")
**Responsibility:** Given AQI/PM history plus wind, weather, temperature, humidity, traffic
indicators (when available) and location, identify **possible** contributing factors to
observed pollution changes.
**Output notes:** `factors` = possible contributors; `evidence` = which inputs support each;
`confidence` must be lower when fewer corroborating inputs are available; `limitations` must
name what wasn't available (e.g. "no traffic data for this location"). Never assert a definite
cause.

### 4. Weather Agent
**Responsibility:** Current weather + forecast (temperature, humidity, wind, precipitation) —
the shared weather substrate other agents (Heat, Flood, Wildfire, Water) depend on.
**Inputs:** live OpenWeather (current + 5-day) or demo fixtures per DATA-SOURCES.md; no demo
fallback in live mode (unavailable states are disclosed, not hidden).
**Output notes:** Primarily factual/observational; low interpretive content of its own.
Limitations must name anything not provided by the provider (e.g. UV index).

### 5. Heat Risk Agent ("HeatShield")
**Responsibility:** Heat index/apparent temperature, heatwave detection, trend, vulnerable time
windows, outdoor-activity guidance.
**Inputs:** temperature, humidity, apparent temperature, forecast, historical temperature.

### 6. Flood Risk Agent ("FloodSense")
**Responsibility:** Flood risk level from rainfall, forecast precipitation intensity, and
water/river level or terrain data when available.
**Output notes:** Must never state an area *will* flood unless an authoritative source
explicitly confirms it — otherwise phrase as risk level + supporting/limiting evidence.

### 7. Wildfire Risk Agent ("WildfireWatch")
**Responsibility:** Fire risk from temperature, humidity, wind, dryness indicators, and
vegetation/historical fire data when available.

### 8. Water Stress Agent ("WaterGuard")
**Responsibility:** Water stress level and trend from rainfall (current + historical), water
availability indicators, and reservoir/drought indicators when available.

### 9. Waste Intelligence Agent ("WasteWise")
**Responsibility:** Classify uploaded waste images into a category (plastic, paper, glass,
metal, organic, e-waste, hazardous, mixed) and provide recycling/disposal guidance.
**Output notes:** Must never give unsafe disposal instructions for hazardous materials — when
uncertain about hazard classification, default to the more cautious guidance and say so in
`limitations`.

### 10. Green Route Agent ("GreenRoute")
**Responsibility:** Compare 2+ routes by distance, estimated travel time, and estimated
air-quality exposure.
**Output notes:** All exposure/route comparisons must be clearly labeled as **estimates**; never
claim a route is safer than another unless the underlying data actually supports the
comparison — otherwise report as inconclusive.

### 11. Risk Analyst Agent
**Responsibility:** Take the `AgentResult`s from whichever domain agents ran and combine them
into an overall risk picture — this is where the **Climate Emergency Agent** behavior lives
(e.g., recognizing high temperature + poor AQI + strong wind + dry conditions together and
surfacing a concise combined risk summary, rather than the user having to read five separate
cards).
**Input:** one or more `AgentResult`s.
**Output:** an `AgentResult`-shaped combined assessment, plus (for dashboard use) a short
"Agents used: ..." list for UI transparency.

### 12. Environmental Advisory Agent
**Responsibility:** Turn the Risk Analyst's (or a single agent's) structured result into the
final user-facing natural-language response — dashboard copy, chat reply, alert text, or report
section. This is the only agent that should be producing prose meant to be read directly by the
end user in a conversational tone; other agents' `summary` fields are shorter/more structured.

## Not a standing agent, but related capabilities

- **Clean Air Planner** and **EcoCity AI** are *compositions* of the above (Orchestrator +
  Air Quality + Heat + Weather + Risk Analyst + Advisory), not separate agent classes. Build
  them as orchestrator "intents"/prompts rather than new agent modules unless a task explicitly
  says otherwise.

## Worked orchestration example

User asks: *"Is it safe to go running this evening?"*

```
Orchestrator
 → Air Quality Agent
 → Weather Agent
 → Heat Risk Agent
 → Risk Analyst Agent   (combines the three AgentResults)
 → Environmental Advisory Agent (produces the final reply)
```

The Orchestrator does **not** also call Flood/Wildfire/Water/Waste/GreenRoute agents here —
they're irrelevant to this request. Only invoke agents whose domain the request actually touches.

## Interface checklist for adding a new agent

1. Define/confirm its inputs and which `server/tools/*` clients it needs.
2. Return `AgentResult` exactly as defined in ARCHITECTURE.md — no ad hoc fields.
3. Support both live and demo data paths (see DATA-SOURCES.md).
4. Use hedged language for anything causal/uncertain (RULES.md § AI behavior).
5. Register it with the Orchestrator's routing logic, including *when* it should and should not
   be invoked.
6. Add it to the table above and to PROJECT.md's feature table if it's user-facing.
