import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoadingState } from "./components/ui/states";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const AirPage = lazy(() => import("./pages/AirPage"));
const ClimatePage = lazy(() => import("./pages/ClimatePage"));
const DisasterPage = lazy(() => import("./pages/DisasterPage"));
const WaterPage = lazy(() => import("./pages/WaterPage"));
const WastePage = lazy(() => import("./pages/WastePage"));
const RoutePage = lazy(() => import("./pages/RoutePage"));
const AssistantPage = lazy(() => import("./pages/AssistantPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const DemoPage = lazy(() => import("./pages/DemoPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DataSourcesPage = lazy(() => import("./pages/DataSourcesPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<LoadingState label="Loading page…" />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/air" element={<AirPage />} />
          <Route path="/climate" element={<ClimatePage />} />
          <Route path="/disaster" element={<DisasterPage />} />
          <Route path="/water" element={<WaterPage />} />
          <Route path="/waste" element={<WastePage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/routes" element={<RoutePage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
