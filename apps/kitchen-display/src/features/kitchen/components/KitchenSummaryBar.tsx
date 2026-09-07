import { Volume2 } from "lucide-react";

interface KitchenSummaryBarProps {
  activeCount: number;
  urgentCount: number;
  readyCount: number;
}

export const KitchenSummaryBar = ({
  activeCount,
  urgentCount,
  readyCount,
}: KitchenSummaryBarProps) => (
  <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-2 text-xs">
    <span className="rounded-full bg-info-surface px-2.5 py-1 font-semibold text-info">
      {activeCount} active
    </span>
    <span
      className={`rounded-full px-2.5 py-1 font-semibold ${urgentCount > 0 ? "bg-danger-surface text-danger" : "bg-surface-secondary text-text-secondary"}`}
    >
      {urgentCount} urgent
    </span>
    <span
      className={`rounded-full px-2.5 py-1 font-semibold ${readyCount > 0 ? "bg-success-surface text-success" : "bg-surface-secondary text-text-secondary"}`}
    >
      {readyCount} ready
    </span>
    <span className="ml-auto inline-flex items-center gap-1 text-text-secondary">
      <Volume2 className="h-3.5 w-3.5" /> New-ticket alerts enabled
    </span>
  </div>
);
