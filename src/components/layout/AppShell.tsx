import { NavLink, Link } from "react-router-dom";
import {
  BarChart3,
  CloudSun,
  Database,
  Droplets,
  FolderCheck,
  Leaf,
  Map,
  Menu,
  Recycle,
  Settings,
  Sparkles,
  TestTube,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "../../context/AppContext";
import { LocationSearch } from "../ui/LocationSearch";
import { AlertsBell } from "./AlertsBell";
import { DataStateBadge } from "../ui/DataStateBadge";

const NAV_SECTIONS = [
  {
    label: "Intelligence",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { to: "/air", label: "Air Quality", icon: Wind },
      { to: "/climate", label: "Climate & Heat", icon: CloudSun },
      { to: "/disaster", label: "Disaster Risk", icon: Waves },
      { to: "/water", label: "Water", icon: Droplets },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/assistant", label: "AI Assistant", icon: Sparkles },
      { to: "/waste", label: "Waste Classifier", icon: Recycle },
      { to: "/route", label: "Green Route", icon: Map },
      { to: "/reports", label: "Reports", icon: FolderCheck },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/demo", label: "Demo Mode", icon: TestTube },
      { to: "/data-sources", label: "Data Sources", icon: Database },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function ModeBanner() {
  const { settings } = useApp();
  if (settings.demoMode) {
    return (
      <div
        className="bg-slate-900 text-slate-100 text-center text-xs font-semibold tracking-wide py-1.5 px-4 flex items-center justify-center gap-2"
        role="status"
      >
        <TestTube className="w-3.5 h-3.5 text-amber-400" aria-hidden />
        DEMO MODE — deterministic demo data, not live measurements
        <Link to="/settings" className="underline text-slate-300 hover:text-white font-normal">
          manage
        </Link>
      </div>
    );
  }
  return (
    <div
      className="bg-white text-slate-500 border-b border-slate-200 text-center text-[11px] py-1.5 px-4 flex items-center justify-center gap-1.5"
      role="status"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
      Live provider data
      <Link to="/settings" className="underline hover:text-slate-800">
        manage
      </Link>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-200">
      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white">
        <Leaf className="w-4.5 h-4.5" aria-hidden />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-900 leading-tight">EcoGuard AI</span>
        <span className="block text-[11px] text-slate-500 leading-tight">Environmental Intelligence</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { settings, health } = useApp();

  const dataModeState = settings.demoMode ? "demo" : health ? (health.preferredProvider === "live" ? "live" : "demo") : "demo";

  return (
    <div className="min-h-screen flex flex-col">
      <ModeBanner />
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-slate-200">
          <Brand />
          <SidebarNav />
          <div className="px-4 py-3 border-t border-slate-200">
            <DataStateBadge state={dataModeState} />
            <p className="mt-1.5 text-[11px] text-slate-400">
              {health?.geminiConfigured ? "Gemini configured" : "Gemini off — rules-based AI"}
            </p>
          </div>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/40"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
              <div className="flex items-center justify-between pr-3">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-5 h-5" aria-hidden />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 shrink-0 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-6 no-print">
            <button
              type="button"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" aria-hidden />
            </button>
            <LocationSearch variant="header" label="Search location" id="header-location" />
            <div className="flex-1" />
            <AlertsBell />
          </header>

          <main className="flex-1 min-w-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
