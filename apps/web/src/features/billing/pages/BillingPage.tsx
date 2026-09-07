import { useState } from "react";
import { CreditCard, Printer, Receipt, Scissors } from "lucide-react";
import {
  Button,
  Card,
  Page,
  PageHeader,
  Pagination,
  Table,
  type Column,
} from "@pos/ui";
import type { Order } from "@pos/types";
import { PaymentDialog } from "@/features/billing/components/PaymentDialog";
import { PrintBillsDialog } from "@/features/billing/components/PrintBillsDialog";
import { SplitBillDialog } from "@/features/billing/components/SplitBillDialog";
import { useOrdersPage } from "@/features/orders/hooks/useOrders";
import { usePermissions } from "@/shared/auth/permissions";
import { formatCurrency, formatTime } from "@/shared/utils/format";

export const BillingPage = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [splitOrder, setSplitOrder] = useState<Order | null>(null);
  const { has } = usePermissions();

  const { data: billableResult, isLoading } = useOrdersPage({
    status: "BILL_REQUESTED",
    page,
    limit: pageSize,
  });
  const billableOrders = billableResult?.items ?? [];
  const billableTotal = billableResult?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(billableTotal / pageSize));

  const columns: Column<Order>[] = [
    {
      id: "table",
      header: "Guest / Fulfilment",
      cell: (order) => (
        <div>
          <p className="font-semibold text-text-primary">
            {order.table?.name
              ? `Table ${order.table.name}`
              : order.type?.replace("_", " ")}
          </p>
          <p className="font-mono text-[11px] text-text-disabled">
            #{order.id.slice(-8).toUpperCase()}
          </p>
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      cell: (order) => (
        <span className="text-text-secondary">
          {order.items?.length ?? 0} items
        </span>
      ),
    },
    {
      id: "total",
      header: "Total",
      sortable: true,
      sortValue: (order) => parseFloat(String(order.totalAmount)),
      cell: (order) => (
        <span className="text-base font-bold text-text-primary">
          {formatCurrency(parseFloat(String(order.totalAmount)))}
        </span>
      ),
    },
    {
      id: "paid",
      header: "Paid",
      align: "right",
      cell: (order) => {
        const paid = (order.payments ?? [])
          .filter((payment) => payment.status === "SUCCESS")
          .reduce((sum, payment) => sum + Number(payment.amount), 0);
        return <span className="text-success">{formatCurrency(paid)}</span>;
      },
    },
    {
      id: "outstanding",
      header: "Outstanding",
      align: "right",
      cell: (order) => {
        const paid = (order.payments ?? [])
          .filter((payment) => payment.status === "SUCCESS")
          .reduce((sum, payment) => sum + Number(payment.amount), 0);
        return (
          <span className="font-bold text-warning">
            {formatCurrency(Math.max(0, Number(order.totalAmount) - paid))}
          </span>
        );
      },
    },
    {
      id: "time",
      header: "Time",
      sortable: true,
      sortValue: (order) => new Date(order.createdAt).getTime(),
      cell: (order) => (
        <span className="text-xs text-text-secondary">
          {formatTime(order.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (order) => (
        <div className="flex justify-end gap-2">
          {has("billing:create") && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSplitOrder(order)}
            >
              <Scissors className="h-3.5 w-3.5" /> Split
            </Button>
          )}
          <Button size="sm" onClick={() => setPaymentOrder(order)}>
            <CreditCard className="h-3.5 w-3.5" /> Collect Payment
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPrintOrder(order)}
          >
            <Printer className="h-3.5 w-3.5" /> Print Bill
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Page
      contained={false}
      className="mx-auto h-full min-h-0 w-full max-w-screen-xl overflow-hidden px-4 py-4 sm:px-6 lg:px-8"
    >
      <PageHeader
        title="Billing"
        description="Process payments for tabs where the bill has been requested"
      />
      <Card
        padding="none"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <Table
          columns={columns}
          data={billableOrders}
          getRowId={(order) => order.id}
          loading={isLoading}
          emptyIcon={Receipt}
          emptyTitle="No pending payments"
          emptyDescription="Tabs will appear here once the waiter requests the bill."
          maxHeight="100%"
          className="min-h-0 flex-1"
        />
        <Pagination
          className="border-t border-border p-4"
          page={page}
          pageCount={pageCount}
          totalItems={billableTotal}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </Card>

      <PaymentDialog
        order={paymentOrder}
        onClose={() => setPaymentOrder(null)}
      />
      <PrintBillsDialog
        order={printOrder}
        onClose={() => setPrintOrder(null)}
      />
      <SplitBillDialog order={splitOrder} onClose={() => setSplitOrder(null)} />
    </Page>
  );
};
