import type { DemoScenario } from "../../shared/types";
import { findLocation } from "../../shared/locations";

/** Guided 3-5 minute hackathon walkthrough (Udaipur scenario). */
export const DEMO_SCENARIO: DemoScenario = {
  title: "EcoGuard AI — 4 minute guided demo",
  location: findLocation("udaipur"),
  durationMinutes: "3-5",
  steps: [
    {
      id: "overview",
      title: "1. Environmental overview",
      talkingPoints: [
        "Open the ClimatePulse dashboard for Udaipur.",
        "Point out the data-state badges: everything is clearly labeled Demo Data — nothing is faked as live.",
        "Show AQI, temperature, heat risk and the five-domain risk overview in one screen.",
      ],
      route: "/dashboard",
      dataLabel: "Demo overview",
    },
    {
      id: "aqi-problem",
      title: "2. AQI problem",
      talkingPoints: [
        "Open Air Intelligence: AQI is elevated and rising over 24 hours.",
        "Show pollutant breakdown vs WHO guidelines — PM2.5 dominates.",
        "Highlight risk level, trend, and health recommendations.",
      ],
      route: "/air",
      dataLabel: "Demo air quality",
    },
    {
      id: "pollution-analysis",
      title: "3. Pollution analysis",
      talkingPoints: [
        "Press 'Why is AQI changing?' — the Pollution Source Detective runs.",
        "Observed data and AI interpretation are shown in separate sections.",
        "Note hedged language: possible contributors, never unproven causes.",
      ],
      route: "/air",
      dataLabel: "Demo + AI interpretation",
    },
    {
      id: "heat-risk",
      title: "4. Heat risk (HeatShield)",
      talkingPoints: [
        "Open Climate: heat index, hot-spell indicator, vulnerable windows.",
        "Show risk level, confidence, factors, evidence, recommendations, limitations.",
      ],
      route: "/climate",
      dataLabel: "Demo heat assessment",
    },
    {
      id: "multi-agent",
      title: "5. Multi-agent analysis",
      talkingPoints: [
        "Ask in the Assistant: 'Is my city at environmental risk?'",
        "The Orchestrator invokes Air, Heat, Flood, Wildfire and Water agents — selectively, not all 12.",
        "Risk Analyst combines them into one overall assessment.",
      ],
      route: "/assistant",
      dataLabel: "Orchestrated agents",
    },
    {
      id: "assistant",
      title: "6. AI assistant question",
      talkingPoints: [
        "Ask: 'Should I run this evening?'",
        "Reply cites agents used (Air, Weather, Heat) plus evidence and sources.",
        "No chain-of-thought is exposed — only concise reasoning summaries.",
      ],
      route: "/assistant",
      dataLabel: "Grounded assistant reply",
    },
    {
      id: "recommendation",
      title: "7. Environmental recommendation",
      talkingPoints: [
        "Show the advisory summary: practical next-step guidance.",
        "Clearly labeled as AI/rules-based interpretation, not an official advisory.",
      ],
      route: "/dashboard",
      dataLabel: "Advisory",
    },
    {
      id: "overall-risk",
      title: "8. Overall climate risk",
      talkingPoints: [
        "Show the combined risk card — multiple elevated domains recognized together.",
        "Point at alerts: elevated risks surface automatically in-app.",
      ],
      route: "/dashboard",
      dataLabel: "Risk Analyst output",
    },
    {
      id: "report",
      title: "9. Report generation",
      talkingPoints: [
        "Generate an environmental assessment report.",
        "Observed data, AI interpretation and recommendations are visually separated.",
        "Data sources and limitations are listed for every section.",
      ],
      route: "/reports",
      dataLabel: "Structured report",
    },
  ],
};
