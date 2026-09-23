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

function useIsDemo() {
  const { settings, health } = useApp();
  return settings.demoMode || health?.preferredProvider !== "live";
}

/** Full two-line mode indicator — sidebar footer (desktop) + drawer (mobile). */
function ModeIndicator() {
  const { health } = useApp();
  const isDemo = useIsDemo();

  return (
    <Link
      to="/settings"
      title={health?.geminiConfigured ? "Gemini enabled" : "Rules-based AI"}
      className="block rounded-lg border border-line bg-surface px-3 py-2.5 hover:border-[#d8d5cc] transition-colors"
    >
      <div className="flex items-center gap-2">
        {isDemo ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ochre" />
          </span>
        ) : (
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
        )}
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
            isDemo ? "text-ochre" : "text-accent"
          }`}
        >
          {isDemo ? "Demo" : "Live"}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-tight text-ink-2">
        {isDemo ? "Demo dataset" : "Real environmental data"}
      </p>
    </Link>
  );
}

/** Compact top-bar indicator — visible on small screens where the sidebar is hidden. */
function ModeChip() {
  const isDemo = useIsDemo();
  return (
    <Link
      to="/settings"
      aria-label={isDemo ? "Demo mode — demo dataset" : "Live mode — real environmental data"}
      className="inline-flex items-center gap-1.5 h-7 pl-2 pr-2.5 rounded-full border border-line bg-surface transition-colors hover:border-[#d8d5cc]"
    >
      {isDemo ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ochre opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ochre" />
        </span>
      ) : (
        <span className="inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
      )}
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
          isDemo ? "text-ochre" : "text-accent"
        }`}
      >
        {isDemo ? "Demo" : "Live"}
      </span>
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6" aria-label="Primary">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">
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
                      `flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-[13px] border transition-colors duration-150 ${
                        isActive
                          ? "bg-surface text-ink font-medium border-line shadow-[0_1px_2px_rgba(26,29,26,0.05)]"
                          : "text-ink-2 font-normal border-transparent hover:bg-black/[0.04] hover:text-ink"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-accent" : "text-ink-3"}`}
                          aria-hidden
                        />
                        {item.label}
                      </>
                    )}
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
    <Link to="/dashboard" className="flex items-center gap-2.5 px-5 h-14 shrink-0">
      <span className="flex items-center justify-center w-7 h-7 rounded-[7px] bg-ink text-white">
        <Leaf className="w-4 h-4" aria-hidden />
      </span>
      <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">
        EcoGuard <span className="text-ink-3 font-medium">AI</span>
      </span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand />
      <SidebarNav onNavigate={onNavigate} />
      <div className="px-3 pb-4 mt-auto">
        <ModeIndicator />
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="app-shell h-dvh flex bg-canvas font-sans text-ink overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:left-3 focus:top-3 focus:px-3 focus:py-2 focus:bg-ink focus:text-white focus:rounded-lg focus:text-sm"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="app-sidebar hidden lg:flex w-[240px] shrink-0 flex-col border-r border-line bg-canvas-2 no-print">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden no-print">
          <button
            type="button"
            className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[264px] bg-canvas-2 shadow-[8px_0_40px_-16px_rgba(26,29,26,0.25)] border-r border-line flex flex-col fade-in">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-ink-3 hover:text-ink rounded-lg hover:bg-black/5 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <header className="app-header h-14 shrink-0 border-b border-line flex items-center gap-2.5 px-3 sm:px-5 bg-canvas/85 backdrop-blur-md sticky top-0 z-30 no-print">
          <button
            type="button"
            className="lg:hidden p-2 -ml-1 text-ink-2 hover:bg-black/5 rounded-lg transition-colors"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" aria-hidden />
          </button>
          <div className="flex-1 min-w-0 max-w-sm">
            <LocationSearch variant="header" label="Search location" id="header-location" />
          </div>
          <div className="flex-1 hidden sm:block" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="lg:hidden">
              <ModeChip />
            </span>
            <AlertsBell />
          </div>
        </header>

        <main id="main-content" className="app-main flex-1 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-7 pb-16 lg:pb-12">
            <div key={pathname} className="page-enter">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
