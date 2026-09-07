import { useCallback, useEffect, useState } from "react";
import { ChefHat } from "lucide-react";
import type { KitchenTicketStatus } from "@pos/types";
import { Grid } from "@pos/ui";
import {
  useKitchenStations,
  useKitchenTickets,
} from "@/features/kitchen/hooks/useKitchenTickets";
import { useUpdateTicketStatus } from "@/features/kitchen/hooks/useUpdateTicketStatus";
import { useKitchenRealtime } from "@/features/kitchen/hooks/useKitchenRealtime";
import {
  groupTicketsByStatus,
  isUrgent,
} from "@/features/kitchen/utils/ticket";
import { BOARD_COLUMNS } from "@/features/kitchen/constants";
import { useKitchenAttention } from "@/features/kitchen/hooks/useKitchenAttention";
import {
  getTerminalStationId,
  getVoidAlertsEnabled,
  setTerminalStationId,
  setVoidAlertsEnabled,
} from "@/features/kitchen/terminal-storage";
import { KitchenStatusColumn } from "@/features/kitchen/components/KitchenStatusColumn";
import { KitchenSummaryBar } from "@/features/kitchen/components/KitchenSummaryBar";
import { KitchenToolbar } from "@/features/kitchen/components/KitchenToolbar";

interface KitchenBoardProps {
  onLogout: () => void;
}

export const KitchenBoard = ({ onLogout }: KitchenBoardProps) => {
  const [stationId, setStationId] = useState<string | undefined>(
    () =>
      new URLSearchParams(window.location.search).get("stationId") ??
      getTerminalStationId(),
  );
  const [isVoidAlertsEnabled, setIsVoidAlertsEnabled] = useState(() =>
    getVoidAlertsEnabled(),
  );
  const { data: stations = [] } = useKitchenStations();
  const {
    data: tickets = [],
    isLoading,
    refetch,
    isFetching,
  } = useKitchenTickets(stationId);
  const updateMutation = useUpdateTicketStatus();
  const { connected: isConnected } = useKitchenRealtime(stationId);

  useKitchenAttention(stationId);

  useEffect(() => {
    setTerminalStationId(stationId);
  }, [stationId]);

  const isTicketUpdating = useCallback(
    (ticketId: string) =>
      updateMutation.isPending && updateMutation.variables?.id === ticketId,
    [updateMutation.isPending, updateMutation.variables],
  );

  const handleUpdateStatus = useCallback(
    (ticketId: string, status: KitchenTicketStatus) =>
      updateMutation.mutate({ id: ticketId, status }),
    [updateMutation],
  );

  const handleVoidAlertsChange = (isEnabled: boolean) => {
    setIsVoidAlertsEnabled(isEnabled);
    setVoidAlertsEnabled(isEnabled);
  };

  const urgentCount = tickets.filter((ticket) =>
    isUrgent(ticket.firedAt),
  ).length;
  const readyCount = tickets.filter(
    (ticket) => ticket.status === "READY",
  ).length;
  const hasQueueOverflow = tickets.length > 200;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">
              Kitchen Display
            </h1>
            <p className="text-xs text-text-secondary">
              {tickets.length} active tickets
            </p>
          </div>
        </div>
        <KitchenToolbar
          stations={stations}
          stationId={stationId}
          isVoidAlertsEnabled={isVoidAlertsEnabled}
          isConnected={isConnected}
          isRefreshing={isFetching}
          onStationChange={setStationId}
          onVoidAlertsChange={handleVoidAlertsChange}
          onRefresh={() => void refetch()}
          onLogout={onLogout}
        />
      </header>

      <KitchenSummaryBar
        activeCount={tickets.length}
        urgentCount={urgentCount}
        readyCount={readyCount}
      />

      {hasQueueOverflow && (
        <div
          role="alert"
          className="border-b border-danger/30 bg-danger-surface px-4 py-2.5 text-sm font-semibold text-danger"
        >
          High kitchen load: {tickets.length} active tickets. No tickets are
          hidden; select a station to reduce the visible workload.
        </div>
      )}

      <Grid
        columns={{ base: 1, sm: 2, lg: 4 }}
        gap="none"
        className="flex-1 gap-px overflow-hidden bg-border"
      >
        {BOARD_COLUMNS.map((column) => (
          <KitchenStatusColumn
            key={column.status}
            title={column.title}
            status={column.status}
            colorClassName={column.color}
            tickets={groupTicketsByStatus(tickets, column.status)}
            isLoading={isLoading}
            isTicketUpdating={isTicketUpdating}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </Grid>
    </div>
  );
};
