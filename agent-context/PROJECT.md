# PROJECT.md — EcoGuard AI

## What this is

**EcoGuard AI** (repo: `ecoguard-ai`) is a multi-agent AI platform that helps people understand
environmental conditions and climate-related risk using real environmental, weather, geospatial,
and other available data. It is being built for **Build with AI: Code for Communities 2.0 —
Udaipur Edition**, theme: **Clean Air & Climate Resilience**.

This file defines *what to build and why*. For *how* it is technically structured, see
[ARCHITECTURE.md](./ARCHITECTURE.md). For agent responsibilities, see [AGENTS.md](./AGENTS.md).
For non-negotiable rules, see [RULES.md](./RULES.md). For live/demo data policy, see
[DATA-SOURCES.md](./DATA-SOURCES.md). For design direction, see [UI-UX.md](./UI-UX.md). For
what to build first, see [TASKS.md](./TASKS.md).

## Product vision

EcoGuard AI unifies environmental intelligence — air quality, pollution, heat, flood, wildfire,
water stress, waste, travel exposure, and overall climate risk — into **one coherent system**
instead of several disconnected single-purpose tools. A user opens the dashboard and can answer:

1. What is happening environmentally right now?
2. Is the air safe or unhealthy?
3. Why might pollution be changing?
4. Is there heat, flood, or wildfire risk?
5. Is there water stress?
6. What risks are increasing?
7. What should I do about it?
8. What evidence supports this conclusion?

The single most important constraint on the product: **it must be trustworthy**. EcoGuard AI
never presents fabricated or unavailable data as real-world live data (see RULES.md and
DATA-SOURCES.md — this is treated as more important than feature completeness).

## Major features (capability summary)

Each of these maps to one or more agents (AGENTS.md) and a route/page (UI-UX.md).

| Feature | Purpose | Priority |
|---|---|---|
| Main Dashboard / **ClimatePulse** | High-level combined view: air, heat, flood, wildfire, water, alerts | P0 |
| Air Quality Intelligence | AQI, PM2.5, PM10, NO2, O3, CO, SO2, trends, comparisons, risk level | P0 |
| Pollution Source Detective | Possible contributing factors to AQI changes, with evidence/confidence | P0 |
| AI Environmental Assistant | Conversational access to all agents, grounded in real/demo data | P0 |
| **HeatShield** (Heat Risk) | Heat index, heatwave detection, outdoor-activity guidance | P0 |
| Demo Mode | Deterministic offline demo of the full product | P0 |
| **FloodSense** (Flood Risk) | Rainfall/flood risk level, warning indicators, precautions | P1 |
| **WildfireWatch** (Fire Risk) | Fire risk from dryness/wind/temperature/vegetation signals | P1 |
| **WaterGuard** (Water Stress) | Water stress level, trend, contributing factors | P1 |
| Reports | Structured environmental assessment export | P1 |
| Alerts | Notify user of elevated/severe risk conditions | P1 |
| **WasteWise** | Image-based waste classification + disposal/recycling guidance | P2 |
| **GreenRoute** | Route comparison by estimated environmental exposure | P2 |
| **EcoCity AI** | City-level priority areas / planning intelligence | P2 |
| Climate Emergency Agent | Combines simultaneous high-risk conditions into one summary | P2 |
| Clean Air Planner | "Should I go run today?" style activity planning | P0/P1 (bundled into Assistant + HeatShield + Air Quality) |

Full priority ordering and acceptance criteria: see [TASKS.md](./TASKS.md).

## Product principles (do not violate)

- **No fabrication.** Never invent AQI, temperature, rainfall, flood/fire events, water levels,
  government alerts, sensor readings, or pollution sources. If data isn't available, say so.
- **Live vs. demo vs. estimate must always be visually distinguishable.** Never let demo/fallback
  data look like live data. See DATA-SOURCES.md for the exact labeling contract.
- **Causal language is guarded.** Pollution/risk "explanations" use hedged language (*possible
  contributor*, *associated factor*, *likely influence*) — never unqualified causal claims.
- **Selective agent invocation.** The Orchestrator only calls agents relevant to the user's
  request; it does not fan out to all 12 agents on every query. See AGENTS.md.
- **No exposed chain-of-thought.** Agents return structured summaries and short reasoning notes
  ("Assessment based on AQI, PM2.5, temperature and humidity"), never raw model deliberation.
- **Hackathon-appropriate scope.** Practical and shippable beats architecturally impressive. Do
  not over-engineer; do not add a database, a queue, or a new dependency "just in case."

## Non-goals (explicitly out of scope unless a task says otherwise)

- Real-time government emergency alerting / acting as an authoritative disaster-warning system.
- Guaranteeing scientific accuracy of any given number — the product surfaces available data and
  clearly-labeled AI interpretation, not certified environmental science.
- Building a native mobile app (responsive web is the target).
- Building more than a minimal persistence layer — only what a feature actually needs (see
  ARCHITECTURE.md § Database policy).

## How to use this document set

Before writing code, read PROJECT.md (this file) fully, then read whichever of
ARCHITECTURE.md / AGENTS.md / RULES.md / DATA-SOURCES.md / UI-UX.md / TASKS.md is relevant to
the task at hand. See the workflow checklist at the bottom of TASKS.md before starting any
change, and keep these files updated as the project evolves (each file states at its top which
kinds of changes require updating it).
