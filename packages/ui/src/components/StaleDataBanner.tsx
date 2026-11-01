import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../utils/cn";

export interface StaleDataBannerProps {
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
  isRetrying?: boolean | undefined;
  className?: string | undefined;
}

export const StaleDataBanner = ({
  message = "Connection interrupted — showing the latest data available on this device.",
  onRetry,
  isRetrying = false,
  className,
}: StaleDataBannerProps) => (
  <div
    role="status"
    aria-live="polite"
    className={cn(
      "flex flex-wrap items-center justify-between gap-3 border-b border-warning/30 bg-warning-surface px-4 py-2.5 text-sm text-text-primary",
      className,
    )}
  >
    <span className="flex items-center gap-2">
      <AlertTriangle aria-hidden="true" className="h-4 w-4 text-warning" />
      {message}
    </span>
    {onRetry ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        loading={isRetrying}
        onClick={onRetry}
      >
        {!isRetrying ? (
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        ) : null}
        {isRetrying ? "Retrying…" : "Retry"}
      </Button>
    ) : null}
  </div>
);
