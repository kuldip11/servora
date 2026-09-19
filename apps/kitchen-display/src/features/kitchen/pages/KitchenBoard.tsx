import { useCallback, useEffect, useState } from "react";
import { ChefHat } from "lucide-react";
import type { KitchenTicketStatus } from "@pos/types";
import { Grid, QueryErrorState, StaleDataBanner } from "@pos/ui";
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
import { extractApiError } from "@pos/api-client";
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
  const stationsQuery = useKitchenStations();
  const ticketsQuery = useKitchenTickets(stationId);
  const stations = stationsQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];
  const hasTicketData = ticketsQuery.data !== undefined;
  const hasStationData = stationsQuery.data !== undefined;
  const hasInitialTicketError = ticketsQuery.isError && !hasTicketData;
  const hasStaleTicketError = ticketsQuery.isError && hasTicketData;
  const hasStationError = stationsQuery.isError && !hasStationData;
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
              {hasInitialTicketError
                ? "Tickets unavailable"
                : `${tickets.length} active tickets`}
            </p>
          </div>
        </div>
        <KitchenToolbar
          stations={stations}
          stationId={stationId}
          isVoidAlertsEnabled={isVoidAlertsEnabled}
          isConnected={isConnected}
          isRefreshing={ticketsQuery.isFetching || stationsQuery.isFetching}
          onStationChange={setStationId}
          onVoidAlertsChange={handleVoidAlertsChange}
          onRefresh={() => {
            void ticketsQuery.refetch();
            if (stationsQuery.isError) void stationsQuery.refetch();
          }}
          onLogout={onLogout}
        />
      </header>

      {hasStationError ? (
        <StaleDataBanner
          message="Kitchen stations could not be loaded. Station filtering may be unavailable."
          isRetrying={stationsQuery.isFetching}
          onRetry={() => void stationsQuery.refetch()}
        />
      ) : null}

      {hasStaleTicketError ? (
        <StaleDataBanner
          message="Kitchen tickets could not be refreshed — showing the latest ticket data available."
          isRetrying={ticketsQuery.isFetching}
          onRetry={() => void ticketsQuery.refetch()}
        />
      ) : null}

      {!hasInitialTicketError ? (
        <KitchenSummaryBar
          activeCount={tickets.length}
          urgentCount={urgentCount}
          readyCount={readyCount}
        />
      ) : null}

      {hasQueueOverflow && (
        <div
          role="alert"
          className="border-b border-danger/30 bg-danger-surface px-4 py-2.5 text-sm font-semibold text-danger"
        >
          High kitchen load: {tickets.length} active tickets. No tickets are
          hidden; select a station to reduce the visible workload.
        </div>
      )}

      {hasInitialTicketError ? (
        <div className="flex flex-1 items-center justify-center bg-background p-6">
          <QueryErrorState
            className="w-full max-w-xl"
            title="Unable to load kitchen tickets"
            description={extractApiError(
              ticketsQuery.error,
              "The kitchen queue may be incomplete. Retry before relying on the displayed workload.",
            )}
            isRetrying={ticketsQuery.isFetching}
            onRetry={() => void ticketsQuery.refetch()}
          />
        </div>
      ) : (
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
              isLoading={ticketsQuery.isLoading}
              isTicketUpdating={isTicketUpdating}
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </Grid>
      )}
    </div>
  );
};
