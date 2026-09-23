import { NavLink, Link, useLocation } from "react-router-dom";
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
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useApp } from "../../context/AppContext";
import { LocationSearch } from "../ui/LocationSearch";
import { AlertsBell } from "./AlertsBell";

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
      { to: "/data-sources", label: "Data Sources", icon: Database },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

function ModeIndicator() {
  const { settings, health } = useApp();
  const isDemo = settings.demoMode || (health?.preferredProvider !== "live");

  return (
    <Link 
      to="/settings" 
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#EAEAEA] shadow-sm hover:border-[#D0D0D0] transition-colors group cursor-pointer"
    >
      {isDemo ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      ) : (
        <span className="relative flex h-2 w-2">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      <div className="flex-1 overflow-hidden">
        <p className="text-[11px] font-medium text-slate-800 truncate">
          {isDemo ? "Demo Mode Active" : "Live Provider Data"}
        </p>
        <p className="text-[10px] text-slate-500 truncate">
          {health?.geminiConfigured ? "Gemini enabled" : "Rules-based AI"}
        </p>
      </div>
      <Zap className={`w-3.5 h-3.5 ${isDemo ? "text-amber-500" : "text-emerald-500"} group-hover:scale-110 transition-transform`} />
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8" aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.05em] text-[#888888]">
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
                      `flex items-center gap-3 px-2 py-1.5 rounded-md text-sm transition-all duration-200 ${
                        isActive
                          ? "text-[#111111] bg-white shadow-sm border border-[#EAEAEA] font-medium"
                          : "text-[#666666] hover:text-[#111111] hover:bg-black/5 font-normal border border-transparent"
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
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
    <Link to="/dashboard" className="flex items-center gap-3 px-6 h-16 shrink-0">
      <span className="flex items-center justify-center w-7 h-7 rounded-md bg-[#111111] text-white shadow-sm">
        <Leaf className="w-4 h-4" aria-hidden />
      </span>
      <span className="text-sm font-semibold tracking-tight text-[#111111]">
        EcoGuard
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[#FAFAFA] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-[240px] shrink-0 flex-col pt-2 pb-4">
        <Brand />
        <SidebarNav />
        <div className="px-6 mt-auto">
          <ModeIndicator />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[260px] bg-[#FAFAFA] shadow-2xl flex flex-col pt-2 pb-6 border-r border-[#EAEAEA]">
            <div className="flex items-center justify-between pr-4">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
            <div className="px-6 mt-auto">
              <ModeIndicator />
            </div>
          </div>
        </div>
      ) : null}

      {/* Main floating workspace */}
      <div className="flex-1 flex flex-col min-w-0 lg:p-2 lg:pl-0 h-screen">
        <div className="flex-1 flex flex-col bg-white lg:rounded-[20px] lg:shadow-sm lg:border border-[#EAEAEA] overflow-hidden relative">
          
          {/* Top bar inside the workspace */}
          <header className="h-14 shrink-0 border-b border-[#F0F0F0] flex items-center gap-3 px-4 sm:px-6 bg-white/80 backdrop-blur-md sticky top-0 z-30 no-print">
            <button
              type="button"
              className="lg:hidden p-1.5 -ml-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" aria-hidden />
            </button>
            <div className="flex-1 flex items-center max-w-md">
              <LocationSearch variant="header" label="Search location..." id="header-location" />
            </div>
            <div className="flex-1" />
            <AlertsBell />
          </header>

          <main className="flex-1 overflow-y-auto w-full">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 pb-20 lg:pb-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
