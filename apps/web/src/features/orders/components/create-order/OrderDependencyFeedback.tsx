import { QueryErrorState, StaleDataBanner } from "@pos/ui";

type OrderDependencyFeedbackProps = {
  failed: boolean;
  stale: boolean;
  retrying: boolean;
  onRetry: () => void;
};

export const OrderDependencyFeedback = ({
  failed,
  stale,
  retrying,
  onRetry,
}: OrderDependencyFeedbackProps) => (
  <>
    {failed ? (
      <QueryErrorState
        title="Unable to load order-entry data"
        description="Branch capabilities, menu data, or required table data could not be loaded. Retry before creating an order."
        onRetry={onRetry}
        isRetrying={retrying}
      />
    ) : null}
    {stale ? (
      <StaleDataBanner
        message="Some order-entry data could not be refreshed. Showing cached data; verify availability before submitting."
        onRetry={onRetry}
        isRetrying={retrying}
      />
    ) : null}
  </>
);
