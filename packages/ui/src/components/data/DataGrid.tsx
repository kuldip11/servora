import {
  type ComponentType,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../utils/cn";
import { EmptyState } from "../EmptyState";
import { SkeletonTable } from "./SkeletonLoader";
import { Pagination, type PaginationProps } from "./Pagination";
import { DataGridToolbar } from "./DataGridToolbar";
import { DataGridTable } from "./DataGridTable";
import {
  ALIGN_CLASSES,
  CELL_PADDING,
  CLICKABLE_ROW_FOCUS_CLASSES,
  clickableRowKeyDown,
  type Column,
  computeStickyOffsets,
  matchesGlobalFilter,
  nextSortState,
  SORT_BUTTON_FOCUS_CLASSES,
  sortRows,
  type SortState,
  type TableDensity,
  useVirtualizedRows,
} from "./shared";

export type { Column, SortState, TableDensity };

export interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];

  getRowId: (row: T) => string;
  loading?: boolean | undefined;
  skeletonRows?: number | undefined;
  emptyIcon?: ComponentType<{ className?: string }> | undefined;
  emptyTitle?: string | undefined;
  emptyDescription?: string | undefined;
  emptyAction?: ReactNode;
  onRowClick?: ((row: T) => void) | undefined;

  sort?: SortState | null | undefined;
  onSortChange?: ((sort: SortState | null) => void) | undefined;
  defaultSort?: SortState | null | undefined;

  density?: TableDensity | undefined;

  rowHeight?: number | undefined;

  maxHeight?: string | undefined;
  className?: string | undefined;

  selectable?: boolean | undefined;

  selectedIds?: Set<string> | undefined;
  onSelectedIdsChange?: ((ids: Set<string>) => void) | undefined;
  defaultSelectedIds?: Set<string> | undefined;

  disabledSelectionIds?: Set<string> | undefined;

  enableColumnVisibility?: boolean | undefined;

  columnVisibility?: Record<string, boolean> | undefined;
  onColumnVisibilityChange?:
    ((visibility: Record<string, boolean>) => void) | undefined;

  enableGlobalFilter?: boolean | undefined;
  globalFilter?: string | undefined;
  onGlobalFilterChange?: ((value: string) => void) | undefined;

  getGlobalFilterValue?: ((row: T) => string) | undefined;
  globalFilterPlaceholder?: string | undefined;

  pagination?: Omit<PaginationProps, "className"> | undefined;

  toolbarActions?: ReactNode;
}

export function DataGrid<T>({
  columns,
  data,
  getRowId,
  loading = false,
  skeletonRows = 8,
  emptyIcon = Inbox,
  emptyTitle = "No data",
  emptyDescription,
  emptyAction,
  onRowClick,
  sort: sortProp,
  onSortChange,
  defaultSort = null,
  density = "comfortable",
  rowHeight = 44,
  maxHeight = "560px",
  className,
  selectable = false,
  selectedIds: selectedIdsProp,
  onSelectedIdsChange,
  defaultSelectedIds,
  disabledSelectionIds,
  enableColumnVisibility = false,
  columnVisibility: visibilityProp,
  onColumnVisibilityChange,
  enableGlobalFilter = false,
  globalFilter: globalFilterProp,
  onGlobalFilterChange,
  getGlobalFilterValue,
  globalFilterPlaceholder = "Search...",
  pagination,
  toolbarActions,
}: DataGridProps<T>) {
  const [internalSort, setInternalSort] = useState<SortState | null>(
    defaultSort,
  );
  const sort = sortProp !== undefined ? sortProp : internalSort;

  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(
    defaultSelectedIds ?? new Set(),
  );
  const selectedIds =
    selectedIdsProp !== undefined ? selectedIdsProp : internalSelectedIds;

  const [internalVisibility, setInternalVisibility] = useState<
    Record<string, boolean>
  >(() => Object.fromEntries(columns.map((c) => [c.id, !c.hidden])));
  const visibility =
    visibilityProp !== undefined ? visibilityProp : internalVisibility;

  const [internalGlobalFilter, setInternalGlobalFilter] = useState("");
  const globalFilter =
    globalFilterProp !== undefined ? globalFilterProp : internalGlobalFilter;

  const scrollRef = useRef<HTMLDivElement>(null);

  function handleHeaderClick(col: Column<T>) {
    if (!col.sortable) return;
    const next = nextSortState(sort, col.id);
    onSortChange?.(next);
    if (sortProp === undefined) setInternalSort(next);
  }

  function setSelectedIds(next: Set<string>) {
    onSelectedIdsChange?.(next);
    if (selectedIdsProp === undefined) setInternalSelectedIds(next);
  }

  function setVisibility(next: Record<string, boolean>) {
    onColumnVisibilityChange?.(next);
    if (visibilityProp === undefined) setInternalVisibility(next);
  }

  function setGlobalFilter(next: string) {
    onGlobalFilterChange?.(next);
    if (globalFilterProp === undefined) setInternalGlobalFilter(next);
  }

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibility[c.id] !== false),
    [columns, visibility],
  );
  const stickyOffsets = useMemo(
    () => computeStickyOffsets(visibleColumns),
    [visibleColumns],
  );

  const filtered = useMemo(() => {
    if (!enableGlobalFilter || !getGlobalFilterValue || !globalFilter.trim())
      return data;
    return data.filter((row) =>
      matchesGlobalFilter(getGlobalFilterValue(row), globalFilter),
    );
  }, [data, enableGlobalFilter, getGlobalFilterValue, globalFilter]);

  const rows = useMemo(
    () => sortRows(filtered, columns, sort),
    [filtered, columns, sort],
  );

  const selectableRowIds = useMemo(
    () => rows.map(getRowId).filter((id) => !disabledSelectionIds?.has(id)),
    [rows, getRowId, disabledSelectionIds],
  );
  const selectedOnPageCount = selectableRowIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allOnPageSelected =
    selectableRowIds.length > 0 &&
    selectedOnPageCount === selectableRowIds.length;
  const someOnPageSelected = selectedOnPageCount > 0 && !allOnPageSelected;

  function toggleSelectAll() {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      selectableRowIds.forEach((id) => next.delete(id));
    } else {
      selectableRowIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  const { totalHeight, startIndex, endIndex, offsetY } = useVirtualizedRows(
    rows.length,
    scrollRef,
    rowHeight,
  );
  const visibleRows = rows.slice(startIndex, endIndex);

  const showToolbar =
    enableGlobalFilter || enableColumnVisibility || !!toolbarActions;

  return (
    <div className={cn("w-full", className)}>
      {showToolbar ? (
        <DataGridToolbar
          columns={columns}
          visibility={visibility}
          enableGlobalFilter={enableGlobalFilter}
          globalFilter={globalFilter}
          globalFilterPlaceholder={globalFilterPlaceholder}
          enableColumnVisibility={enableColumnVisibility}
          toolbarActions={toolbarActions}
          onGlobalFilterChange={setGlobalFilter}
          onVisibilityChange={setVisibility}
        />
      ) : null}

      {loading ? (
        <SkeletonTable
          rows={skeletonRows}
          columns={visibleColumns.length + (selectable ? 1 : 0)}
          density={density}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          size="sm"
        />
      ) : (
        <DataGridTable
          scrollRef={scrollRef}
          columns={visibleColumns}
          rows={rows}
          visibleRows={visibleRows}
          startIndex={startIndex}
          endIndex={endIndex}
          offsetY={offsetY}
          totalHeight={totalHeight}
          rowHeight={rowHeight}
          maxHeight={maxHeight}
          density={density}
          sort={sort}
          stickyOffsets={stickyOffsets}
          selectable={selectable}
          selectedIds={selectedIds}
          disabledSelectionIds={disabledSelectionIds}
          allOnPageSelected={allOnPageSelected}
          someOnPageSelected={someOnPageSelected}
          getRowId={getRowId}
          onHeaderClick={handleHeaderClick}
          onToggleSelectAll={toggleSelectAll}
          onToggleRow={toggleRow}
          onRowClick={onRowClick}
        />
      )}

      {pagination && rows.length > 0 && (
        <div className="mt-4">
          <Pagination {...pagination} />
        </div>
      )}
    </div>
  );
}
