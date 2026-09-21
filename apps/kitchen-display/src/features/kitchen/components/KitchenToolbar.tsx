import { LogOut, Palette, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { KitchenStation } from "@pos/types";
import { IconButton, Popover, Select, ThemeSwitcher } from "@pos/ui";

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
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span>Station</span>
      <Select
        aria-label="KDS station"
        className="min-h-0 px-2 py-1 text-xs"
        containerClassName="gap-0"
        value={stationId ?? ""}
        onChange={(value) => onStationChange(value || undefined)}
        options={[
          { value: "", label: "All / unassigned" },
          ...stations.map((station) => ({
            value: station.id,
            label: station.name,
          })),
        ]}
      />
    </div>
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
