# TASKS.md — EcoGuard AI

> Update this file as priorities shift or items are completed. This is the roadmap; it does not
> restate architecture (ARCHITECTURE.md), agent responsibilities (AGENTS.md), or rules
> (RULES.md) — cross-reference them instead of duplicating.

## Priority tiers

**P0 — must work for the hackathon submission to be viable:**
1. Main Dashboard (ClimatePulse combined view)
2. Air Quality Intelligence
3. Multi-agent orchestration (Orchestrator selectively invoking agents)
4. AI Environmental Assistant
5. Climate/Heat Intelligence (HeatShield)
6. Demo Mode
7. Clear live/demo data separation, everywhere data is shown

**P1 — high value, build after P0 is solid:**
8. Flood Intelligence (FloodSense)
9. Wildfire Intelligence (WildfireWatch)
10. Water Intelligence (WaterGuard)
11. Reports
12. Alerts

**P2 — additional, only after P0 and P1 are working:**
13. Waste Intelligence (WasteWise)
14. Green Route
15. Advanced city intelligence (EcoCity AI)
16. Advanced analytics

**Hard rule:** do not sacrifice a working P0 feature to add multiple unfinished P2 features.
If time runs short, a smaller set of fully-working P0/P1 features beats a broad set of
half-working features across all tiers.

## Acceptance criteria per tier

### P0 acceptance criteria
- Dashboard loads and shows at least Air Quality + Heat Risk cards with correct data-state
  badges (Live or Demo — never unlabeled).
- Orchestrator demonstrably invokes only relevant agents for a given request (verify with at
  least one test or manual trace per request type).
- Assistant answers a representative query (e.g. "is it safe to run this evening?") using real
  agent output, not a canned/unrelated reply, and discloses which agents were used.
- Demo Mode works with **zero external API keys configured** and produces deterministic,
  clearly-labeled results.
- No agent output anywhere presents demo/fallback data without a "Demo Data" label.
- App builds with no TypeScript errors.

### P1 acceptance criteria
- FloodSense/WildfireWatch/WaterGuard each return a full `AgentResult` (including
  `limitations` when their optional data sources aren't available) rather than erroring or
  silently omitting the risk.
- Reports generate a structured document containing location, timestamp, the relevant
  environmental sections, key findings, recommendations, data sources, and limitations, with
  observed data visually separated from AI interpretation (see UI-UX.md § Reports UX).
- Alerts trigger on elevated/severe risk levels from at least one agent and are visible in the
  UI (exact delivery mechanism — in-app vs. notification — can be decided at implementation
  time).

### P2 acceptance criteria
- WasteWise classifies a demo set of example images correctly and never returns unsafe
  hazardous-waste disposal guidance.
- GreenRoute compares at least two routes with clearly labeled *estimated* exposure, and does
  not claim one is safer unless the underlying data supports it.
- EcoCity AI identifies priority areas with evidence/confidence/limitations, and is labeled as
  AI-generated guidance, not an official decision.

## Definition of done (apply to every task, any tier)

1. Install dependencies.
2. Run lint (if configured).
3. Run tests (if configured).
4. Run the production build.
5. Fix any errors from the above.
6. Manually verify the critical flow the change touched.
7. Update the relevant `agent-context/` file(s) — see table below.

## Keeping this documentation current

| If you changed... | Update... |
|---|---|
| Overall product scope, feature list, priorities framing | [PROJECT.md](./PROJECT.md) |
| Technical architecture, project structure, tech stack, data flow | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Agent responsibilities, inputs/outputs, orchestration logic | [AGENTS.md](./AGENTS.md) |
| Coding, security, AI-behavior, or data-integrity rules | [RULES.md](./RULES.md) |
| Data providers, live/demo status, attribution requirements | [DATA-SOURCES.md](./DATA-SOURCES.md) |
| Design system, routing/app areas, accessibility approach | [UI-UX.md](./UI-UX.md) |
| Priorities, acceptance criteria, roadmap | TASKS.md (this file) |

Do not let these files go stale relative to the actual codebase — a future agent relies on them
being accurate, not aspirational.

## Before starting any implementation task

1. Read the relevant file(s) in `agent-context/` for the area you're touching.
2. Inspect the existing codebase — don't assume functionality exists because it's described
   here; this directory describes the *intended* design, not necessarily what's built yet.
3. Understand current architecture before changing it.
4. Make a short implementation plan.
5. Implement the smallest maintainable solution that satisfies the relevant acceptance
   criteria above.
6. Reuse existing components/services where appropriate; avoid new dependencies unless
   necessary.
7. Validate the implementation (schema conformance for agent output, manual check for UI).
8. Run the definition-of-done checklist above.
9. Update documentation per the table above if anything architectural changed.

Never rewrite the whole project unnecessarily, and never delete working functionality without a
stated reason.
