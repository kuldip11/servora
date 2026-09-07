import { Badge, Grid, Page, PageHeader } from "@pos/ui";
import { useDashboardRealtimeSync } from "@/features/analytics/hooks/useDashboardRealtimeSync";
import { useAuthStore } from "@/store/auth";
import { DashboardOverview } from "@/features/analytics/components/DashboardOverview";
import { DashboardSalesInsights } from "@/features/analytics/components/DashboardSalesInsights";
import { CostMarginPanel } from "@/features/analytics/components/CostMarginPanel";
import { ActiveOrdersPanel } from "@/features/analytics/components/ActiveOrdersPanel";
import { DashboardQuickActions } from "@/features/analytics/components/DashboardQuickActions";

export const DashboardPage = () => {
  const branchId = useAuthStore((state) => state.branchId);
  useDashboardRealtimeSync();
  const scopeLabel = branchId === "all" ? "All branches" : "Selected branch";

  return (
    <Page>
      <PageHeader
        title="Owner dashboard"
        description="Live sales, orders, and operational signals for the current restaurant scope."
        actions={<Badge variant="info">{scopeLabel}</Badge>}
      />
      <DashboardOverview scopeLabel={scopeLabel} />
      <DashboardSalesInsights scopeLabel={scopeLabel} />
      <CostMarginPanel branchId={branchId} />
      <Grid columns={{ base: 1, lg: 2 }} gap="lg">
        <ActiveOrdersPanel />
        <DashboardQuickActions />
      </Grid>
    </Page>
  );
};
