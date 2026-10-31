import { IconButton, QueryErrorState, Spinner } from "@pos/ui";
import { X } from "lucide-react";
import { extractApiError, toApiClientError } from "@pos/api-client";

type OrderDetailFeedbackProps = {
  loading: boolean;
  error: unknown;
  fetching: boolean;
  onBack: () => void;
  onRetry: () => void;
};

const DetailShell = ({
  onBack,
  children,
}: {
  onBack: () => void;
  children: React.ReactNode;
}) => (
  <div className="flex h-screen flex-col bg-background">
    <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
      <IconButton
        icon={X}
        aria-label="Back to Orders"
        size="lg"
        className="h-9 w-9 rounded-xl bg-surface-secondary hover:bg-surface-secondary"
        onClick={onBack}
      />
      <h2 className="font-bold text-text-primary">Order Detail</h2>
    </div>
    {children}
  </div>
);

export const OrderDetailLoading = ({ onBack }: { onBack: () => void }) => (
  <DetailShell onBack={onBack}>
    <div className="flex justify-center py-12">
      <Spinner className="h-6 w-6" />
    </div>
  </DetailShell>
);

export const OrderDetailError = ({
  error,
  fetching,
  onBack,
  onRetry,
}: Omit<OrderDetailFeedbackProps, "loading">) => {
  const apiError = toApiClientError(error);
  const notFound = apiError.status === 404;
  const forbidden = apiError.status === 403;

  return (
    <DetailShell onBack={onBack}>
      <div className="flex flex-1 items-center justify-center p-4">
        <QueryErrorState
          className="w-full max-w-lg"
          title={
            notFound
              ? "Order not found"
              : forbidden
                ? "You do not have access to this order"
                : "Unable to load order"
          }
          description={
            notFound
              ? "This order no longer exists or the link is invalid."
              : extractApiError(
                  error,
                  forbidden
                    ? "Your current role does not allow access to this order."
                    : "The order could not be loaded. Please retry before acting on it.",
                )
          }
          isRetrying={fetching}
          onRetry={notFound || forbidden ? undefined : onRetry}
        />
      </div>
    </DetailShell>
  );
};
