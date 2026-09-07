import { LogOut, Palette, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { KitchenStation } from "@pos/types";
import { IconButton, Popover, ThemeSwitcher } from "@pos/ui";

interface KitchenToolbarProps {
  stations: KitchenStation[];
  stationId: string | undefined;
  isVoidAlertsEnabled: boolean;
  isConnected: boolean;
  isRefreshing: boolean;
  onStationChange: (stationId?: string) => void;
  onVoidAlertsChange: (isEnabled: boolean) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export const KitchenToolbar = ({
  stations,
  stationId,
  isVoidAlertsEnabled,
  isConnected,
  isRefreshing,
  onStationChange,
  onVoidAlertsChange,
  onRefresh,
  onLogout,
}: KitchenToolbarProps) => (
  <div className="flex items-center gap-3">
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      Station
      <select
        aria-label="KDS station"
        className="rounded-md border border-border bg-surface-secondary px-2 py-1 text-text-primary"
        value={stationId ?? ""}
        onChange={(event) => onStationChange(event.target.value || undefined)}
      >
        <option value="">All / unassigned</option>
        {stations.map((station) => (
          <option key={station.id} value={station.id}>
            {station.name}
          </option>
        ))}
      </select>
    </label>
    <label className="flex items-center gap-1 text-xs text-text-secondary">
      <input
        type="checkbox"
        checked={isVoidAlertsEnabled}
        onChange={(event) => onVoidAlertsChange(event.target.checked)}
      />{" "}
      Void alerts
    </label>
    <IconButton
      icon={RefreshCw}
      aria-label="Refresh tickets"
      onClick={onRefresh}
      className={isRefreshing ? "animate-spin" : ""}
    />
    <Popover
      align="end"
      trigger={<IconButton icon={Palette} aria-label="Change theme" />}
    >
      <div className="w-48">
        <ThemeSwitcher label="Theme" />
      </div>
    </Popover>
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? "text-emerald-400" : "text-text-secondary"}`}
    >
      {isConnected ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      {isConnected ? "Live" : "Polling"}
    </div>
    <IconButton
      icon={LogOut}
      aria-label="Log out"
      onClick={onLogout}
      className="hover:text-danger"
    />
  </div>
);
