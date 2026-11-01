import { StaleDataBanner } from "@pos/ui";

type QueryWarning = {
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
};

type TablesDataWarningsProps = {
  tables: QueryWarning & { hasData: boolean };
  openOrders: QueryWarning;
};

export const TablesDataWarnings = ({
  tables,
  openOrders,
}: TablesDataWarningsProps) => (
  <>
    {tables.isError && tables.hasData ? (
      <StaleDataBanner
        message="Tables refresh failed — showing the latest table data available."
        isRetrying={tables.isFetching}
        onRetry={tables.onRetry}
      />
    ) : null}
    {openOrders.isError ? (
      <StaleDataBanner
        message="Open orders are unavailable. Table transfer and merge actions are blocked until they reload."
        isRetrying={openOrders.isFetching}
        onRetry={openOrders.onRetry}
      />
    ) : null}
  </>
);
