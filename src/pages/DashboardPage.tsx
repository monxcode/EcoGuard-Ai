import { useApp } from "../context/AppContext";
import { useApi } from "../hooks/useApi";
import type { DashboardPayload } from "../../shared/types";
import { DashboardView } from "../components/dashboard/DashboardView";
import { ErrorState, PageSkeleton } from "../components/ui/states";

export default function DashboardPage() {
  const { settings } = useApp();
  const { data, loading, error, reload } = useApi<DashboardPayload>(
    `/api/dashboard?locationId=${settings.locationId}`,
  );

  if (loading && !data) return <PageSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <ErrorState message="No dashboard data returned." onRetry={reload} />;
  return <DashboardView data={data} />;
}
