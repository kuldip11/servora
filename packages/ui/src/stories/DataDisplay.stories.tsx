import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { PackageSearch } from "lucide-react";
import {
  Button,
  DataGrid,
  FilterBar,
  Pagination,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  Table,
  TextInput,
  Toolbar,
  type Column,
} from "../index";

type OrderRow = { id: string; order: string; status: string; total: number };
const rows: OrderRow[] = [
  { id: "1", order: "ORD-1024", status: "Preparing", total: 780 },
  { id: "2", order: "ORD-1025", status: "Ready", total: 1240 },
  { id: "3", order: "ORD-1026", status: "Served", total: 540 },
];
const columns: Column<OrderRow>[] = [
  {
    id: "order",
    header: "Order",
    cell: (row) => row.order,
    sortable: true,
    sortValue: (row) => row.order,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => row.status,
    sortable: true,
    sortValue: (row) => row.status,
  },
  {
    id: "total",
    header: "Total",
    cell: (row) => `₹${row.total}`,
    align: "right",
    sortable: true,
    sortValue: (row) => row.total,
  },
];

const meta = {
  title: "Foundation/Data Display",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const TablesAndFilters: Story = {
  render: () => {
    const Example = () => {
      const [page, setPage] = useState(1);
      return (
        <div className="grid gap-8">
          <Toolbar
            title="Orders"
            subtitle="Reusable data toolbar"
            actions={<Button>Export</Button>}
          />
          <FilterBar onClearAll={() => undefined}>
            <TextInput aria-label="Filter orders" placeholder="Filter orders" />
          </FilterBar>
          <Table
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            defaultSort={{ columnId: "order", direction: "asc" }}
          />
          <DataGrid
            columns={columns}
            data={rows}
            getRowId={(row) => row.id}
            selectable
            enableGlobalFilter
            enableColumnVisibility
            pagination={{
              page,
              pageCount: 3,
              onPageChange: setPage,
              totalItems: 25,
              pageSize: 10,
            }}
          />
          <Pagination
            page={page}
            pageCount={5}
            onPageChange={setPage}
            totalItems={50}
            pageSize={10}
          />
        </div>
      );
    };
    return <Example />;
  },
};

export const EmptyLoadingAndSkeletons: Story = {
  render: () => (
    <div className="grid gap-8">
      <DataGrid
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        emptyIcon={PackageSearch}
        emptyTitle="No orders"
        emptyDescription="No matching orders were found."
      />
      <Table
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        loading
        skeletonRows={3}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonCard withMedia />
        <div className="space-y-3">
          <Skeleton width="45%" height="24px" />
          <SkeletonText lines={4} />
          <Skeleton radius="full" width="48px" height="48px" />
        </div>
      </div>
      <SkeletonTable rows={4} columns={4} />
    </div>
  ),
};
