import {
  Button,
  Card,
  FilterBar,
  Pagination,
  QueryErrorState,
  SearchInput,
  Select,
  Table,
} from "@pos/ui";
import { Plus, Users } from "lucide-react";
import type { StaffRow } from "@/features/staff/services/staff.service";
import type { Column } from "@pos/ui";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

interface StaffTeamContentProps {
  search: string;
  statusFilter: string;
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  staff: StaffRow[];
  columns: Column<StaffRow>[];
  loading: boolean;
  errorMessage?: string | undefined;
  retrying: boolean;
  canCreate: boolean;
  onSearch: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onClearFilters: () => void;
  onAdd: () => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const StaffTeamContent = ({
  search,
  statusFilter,
  page,
  pageCount,
  total,
  pageSize,
  staff,
  columns,
  loading,
  errorMessage,
  retrying,
  canCreate,
  onSearch,
  onStatusFilter,
  onClearFilters,
  onAdd,
  onRetry,
  onPageChange,
  onPageSizeChange,
}: StaffTeamContentProps) => (
  <>
    <Card padding="sm">
      <FilterBar
        onClearAll={search && statusFilter ? onClearFilters : undefined}
      >
        <SearchInput
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onClear={() => onSearch("")}
          placeholder="Search name or email"
          aria-label="Search staff"
          className="w-full sm:w-72"
        />
        <Select
          aria-label="Filter staff by status"
          valuePrefix="Status"
          value={statusFilter || undefined}
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          onChange={(value) => onStatusFilter(value ?? "")}
          className="w-44"
        />
      </FilterBar>
    </Card>

    {errorMessage ? (
      <QueryErrorState
        title="Unable to load staff"
        description={errorMessage}
        isRetrying={retrying}
        onRetry={onRetry}
      />
    ) : (
      <Card padding="none" className="overflow-hidden">
        <Table
          columns={columns}
          data={staff}
          getRowId={(member) => member.id}
          loading={loading}
          maxHeight="min(55vh, 36rem)"
          emptyIcon={Users}
          emptyTitle="No staff members"
          emptyDescription="Add your team to get started."
          emptyAction={
            canCreate ? (
              <Button onClick={onAdd}>
                <Plus className="w-4 h-4" /> Add Staff
              </Button>
            ) : undefined
          }
        />
        <Pagination
          className="border-t border-border p-4"
          page={page}
          pageCount={pageCount}
          totalItems={total}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </Card>
    )}
  </>
);
