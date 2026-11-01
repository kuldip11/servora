import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../utils/cn";

export interface QueryErrorStateProps {
  title: string;
  description?: string | undefined;
  onRetry?: (() => void) | undefined;
  isRetrying?: boolean | undefined;
  retryLabel?: string | undefined;
  className?: string | undefined;
}

export const QueryErrorState = ({
  title,
  description,
  onRetry,
  isRetrying = false,
  retryLabel = "Retry",
  className,
}: QueryErrorStateProps) => (
  <div
    role="alert"
    className={cn(
      "flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger-surface px-4 py-8 text-center",
      className,
    )}
  >
    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-danger/10">
      <AlertTriangle aria-hidden="true" className="h-5 w-5 text-danger" />
    </div>
    <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    {description ? (
      <p className="mt-1 max-w-md text-sm text-text-secondary">{description}</p>
    ) : null}
    {onRetry ? (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-4"
        loading={isRetrying}
        onClick={onRetry}
      >
        {!isRetrying ? (
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        ) : null}
        {isRetrying ? "Retrying…" : retryLabel}
      </Button>
    ) : null}
  </div>
);
