# UI-UX.md — EcoGuard AI

> Update this file if the design system, routing/app areas, or accessibility approach changes
> meaningfully. Feature scope lives in [PROJECT.md](./PROJECT.md); data-state labeling (which
> this file's badges depend on) lives in [DATA-SOURCES.md](./DATA-SOURCES.md).

## Design direction

The product should feel: **premium, modern, clean, trustworthy, environmental, professional,
data-driven.**

Avoid: cyberpunk styling, excessive neon, excessive glassmorphism, gaming-style UI, overly
futuristic interfaces, unnecessary animation, and visual clutter. This is an environmental
intelligence tool, not a sci-fi dashboard — restraint reads as trustworthy.

Prioritize, in this order, when a screen has to make trade-offs:
1. Readability
2. Hierarchy (what matters most is visually dominant)
3. Environmental data itself (numbers, charts, risk levels)
4. Alerts / risk indicators
5. Evidence and source attribution
6. Maps, where they add real value (not decoratively)

## Component and library choices

- **Icons:** Lucide only — no emoji-based UI, no mixing in a second icon library.
- **Charts:** Recharts for trends/time-series/comparisons.
- **Styling:** Tailwind CSS utility classes; keep a small set of reusable primitives
  (card, badge, risk-level pill, data-source tag) rather than one-off styles per screen.
- **Maps:** only where a feature genuinely needs spatial context (e.g. GreenRoute, EcoCity AI
  priority areas) — don't add a map to screens that don't need one.

## Data-state visual language (must be consistent everywhere)

Every widget/card that shows environmental data must visibly indicate its data state (see
DATA-SOURCES.md for the five states). Use one consistent badge/label component across the whole
app rather than ad hoc text per screen:

- `Live` — real-time badge (e.g. subtle green/neutral, not alarmist)
- `Demo Data` — clearly distinct, unmistakably "this is not real" (e.g. a dashed border or a
  neutral gray badge with the words "Demo Data" — don't use a color that could read as a status
  indicator)
- `Historical` — labeled with the time range it covers
- `Estimated` — labeled with what it was derived from, briefly
- `Unavailable` — an explicit empty/unavailable state, never a blank space or a silently-omitted
  card

Risk levels (`low / moderate / high / severe / unknown`) get their own consistent color+icon
mapping, used identically across Dashboard, agent detail pages, alerts, and reports. Define this
mapping once (e.g. in `src/utils`) and reuse it everywhere rather than re-deriving colors per
component.

## Application areas / routing

Suggested routes (exact paths can be decided at implementation time; keep this list updated if
routing changes):

- `/` — Dashboard (ClimatePulse: combined overview)
- `/air` — Air Intelligence
- `/climate` — Climate/Heat Intelligence (HeatShield)
- `/disaster` — Disaster Intelligence (FloodSense, WildfireWatch)
- `/water` — Water Intelligence (WaterGuard)
- `/waste` — Waste Intelligence (WasteWise)
- `/routes` — Green Route
- `/assistant` — AI Environmental Assistant
- `/reports` — Reports
- `/settings` — Settings (units, saved locations, alert preferences)
- `/data-sources` — Data Sources (attribution + current live/demo status per provider)
- `/demo` — Demo Mode entry point, tuned for a 3–5 minute walkthrough

Keep the underlying architecture modular enough that routes can be added/reordered without
restructuring agents or services (see ARCHITECTURE.md).

## AI Assistant UX

- Present itself as grounded in the same agents/data as the dashboard, not as a generic chatbot
  — e.g. show "Agents used: Air Quality, Weather, Heat Risk" alongside a reply, matching
  RULES.md's chain-of-thought restriction (concise reasoning summary only, never raw
  deliberation).
- Any data referenced in an assistant reply must carry the same Live/Demo/Estimated/Unavailable
  labeling as the dashboard — the assistant is not exempt from the data-integrity rules.

## Reports UX

Reports must visually separate **observed data** (numbers actually retrieved from a
provider/demo fixture) from **AI-generated interpretation** (summaries, recommendations,
inferred contributing factors) — e.g. distinct sections or a clear typographic/label distinction
— never interleave them so it's unclear which is which.

## Responsiveness & accessibility

- Fully responsive: desktop and mobile both need to be genuinely usable, not just "doesn't
  break."
- Consider accessibility from the start: sufficient color contrast (especially for risk-level
  colors — don't rely on color alone, pair with text/icon), keyboard navigability for
  interactive elements, semantic HTML/ARIA labels for charts and risk indicators.
- Don't rely on hover-only interactions for information that's needed to understand a screen.

## What "premium and trustworthy" looks like in practice

- Generous whitespace over dense cramming.
- One accent color family for actual environmental risk signaling (risk-level colors); avoid
  competing with it via unrelated bright decorative colors elsewhere in the UI.
- Typography hierarchy that makes the single most important number on a screen (e.g. current
  AQI) immediately obvious, with supporting detail visually secondary.
- Motion, if used at all, should be functional (loading states, value transitions) — not
  decorative.
