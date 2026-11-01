import type { RefObject } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  ALIGN_CLASSES,
  CELL_PADDING,
  CLICKABLE_ROW_FOCUS_CLASSES,
  clickableRowKeyDown,
  type Column,
  type SortState,
  SORT_BUTTON_FOCUS_CLASSES,
  type TableDensity,
} from "./shared";

const CHECKBOX_COL_WIDTH = 40;

const SortIcon = ({ direction }: { direction: "asc" | "desc" | undefined }) => {
  if (direction === "asc")
    return <ChevronUp aria-hidden="true" className="w-3.5 h-3.5" />;
  if (direction === "desc")
    return <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />;
  return (
    <ChevronsUpDown aria-hidden="true" className="w-3.5 h-3.5 opacity-40" />
  );
};

const GridCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) => (
  <input
    type="checkbox"
    aria-label={label}
    checked={checked}
    disabled={disabled}
    ref={(el) => {
      if (el) el.indeterminate = !checked && indeterminate;
    }}
    onChange={(event) => onChange(event.target.checked)}
    onClick={(event) => event.stopPropagation()}
    className={cn(
      "w-4 h-4 rounded border-border text-primary cursor-pointer",
      "focus:outline-none focus:ring-2 focus:ring-primary",
      disabled && "opacity-50 cursor-not-allowed",
    )}
  />
);

interface DataGridTableProps<T> {
  scrollRef: RefObject<HTMLDivElement | null>;
  columns: Column<T>[];
  rows: T[];
  visibleRows: T[];
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  rowHeight: number;
  maxHeight: string;
  density: TableDensity;
  sort: SortState | null;
  stickyOffsets: Map<string, { left?: number; right?: number }>;
  selectable: boolean;
  selectedIds: Set<string>;
  disabledSelectionIds?: Set<string> | undefined;
  allOnPageSelected: boolean;
  someOnPageSelected: boolean;
  getRowId: (row: T) => string;
  onHeaderClick: (column: Column<T>) => void;
  onToggleSelectAll: () => void;
  onToggleRow: (id: string) => void;
  onRowClick?: ((row: T) => void) | undefined;
}

export const DataGridTable = <T,>({
  scrollRef,
  columns,
  rows,
  visibleRows,
  startIndex,
  endIndex,
  offsetY,
  totalHeight,
  rowHeight,
  maxHeight,
  density,
  sort,
  stickyOffsets,
  selectable,
  selectedIds,
  disabledSelectionIds,
  allOnPageSelected,
  someOnPageSelected,
  getRowId,
  onHeaderClick,
  onToggleSelectAll,
  onToggleRow,
  onRowClick,
}: DataGridTableProps<T>) => (
  <div
    ref={scrollRef}
    className="w-full overflow-auto border border-border rounded-lg"
    style={{ maxHeight }}
  >
    <table
      className="w-full text-sm border-collapse"
      style={{ tableLayout: "fixed" }}
    >
      <thead>
        <tr className="sticky top-0 z-20 bg-surface">
          {selectable && (
            <th
              scope="col"
              style={{ width: CHECKBOX_COL_WIDTH }}
              className={cn(
                CELL_PADDING[density],
                "border-b border-border sticky left-0 z-30 bg-surface",
              )}
            >
              <GridCheckbox
                label="Select all rows on this page"
                checked={allOnPageSelected}
                indeterminate={someOnPageSelected}
                onChange={onToggleSelectAll}
              />
            </th>
          )}
          {columns.map((column) => {
            const isSorted = sort?.columnId === column.id;
            const sticky = stickyOffsets.get(column.id);
            return (
              <th
                key={column.id}
                scope="col"
                style={{
                  width: column.width,
                  minWidth: column.minWidth,
                  ...(sticky?.left !== undefined
                    ? {
                        position: "sticky",
                        left:
                          sticky.left + (selectable ? CHECKBOX_COL_WIDTH : 0),
                        zIndex: 30,
                      }
                    : sticky?.right !== undefined
                      ? { position: "sticky", right: sticky.right, zIndex: 30 }
                      : {}),
                }}
                className={cn(
                  CELL_PADDING[density],
                  ALIGN_CLASSES[column.align ?? "left"],
                  "font-semibold text-xs text-text-secondary uppercase tracking-wide border-b border-border whitespace-nowrap",
                  column.sortable &&
                    "cursor-pointer select-none hover:text-text-primary",
                  column.sticky && "bg-surface",
                )}
                aria-sort={
                  isSorted
                    ? sort!.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => onHeaderClick(column)}
                    className={cn(
                      "inline-flex items-center gap-1",
                      column.align === "right" && "flex-row-reverse",
                      column.align === "center" && "justify-center w-full",
                      SORT_BUTTON_FOCUS_CLASSES,
                    )}
                  >
                    {column.header}
                    <SortIcon
                      direction={isSorted ? sort!.direction : undefined}
                    />
                  </button>
                ) : (
                  column.header
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="relative divide-y divide-divider">
        {startIndex > 0 && (
          <tr style={{ height: offsetY }} aria-hidden="true">
            <td
              colSpan={columns.length + (selectable ? 1 : 0)}
              className="p-0"
            />
          </tr>
        )}
        {visibleRows.map((row, index) => {
          const rowIndex = startIndex + index;
          const id = getRowId(row);
          const disabled = disabledSelectionIds?.has(id) ?? false;
          const selected = selectedIds.has(id);
          return (
            <tr
              key={id}
              style={{ height: rowHeight }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={clickableRowKeyDown(row, onRowClick)}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                onRowClick && "cursor-pointer",
                "bg-surface hover:bg-surface-secondary transition-colors duration-fast ease-standard",
                selected && "bg-primary-surface",
                onRowClick && CLICKABLE_ROW_FOCUS_CLASSES,
              )}
            >
              {selectable && (
                <td
                  className={cn(
                    CELL_PADDING[density],
                    "sticky left-0 z-10 bg-inherit",
                  )}
                >
                  <GridCheckbox
                    label={`Select row ${rowIndex + 1}`}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onToggleRow(id)}
                  />
                </td>
              )}
              {columns.map((column) => {
                const sticky = stickyOffsets.get(column.id);
                return (
                  <td
                    key={column.id}
                    style={
                      sticky?.left !== undefined
                        ? {
                            position: "sticky",
                            left:
                              sticky.left +
                              (selectable ? CHECKBOX_COL_WIDTH : 0),
                            zIndex: 10,
                          }
                        : sticky?.right !== undefined
                          ? {
                              position: "sticky",
                              right: sticky.right,
                              zIndex: 10,
                            }
                          : undefined
                    }
                    className={cn(
                      CELL_PADDING[density],
                      ALIGN_CLASSES[column.align ?? "left"],
                      "text-text-primary truncate",
                      column.sticky && "bg-inherit",
                    )}
                  >
                    {column.cell(row, rowIndex)}
                  </td>
                );
              })}
            </tr>
          );
        })}
        {endIndex < rows.length && (
          <tr
            style={{ height: totalHeight - endIndex * rowHeight }}
            aria-hidden="true"
          >
            <td
              colSpan={columns.length + (selectable ? 1 : 0)}
              className="p-0"
            />
          </tr>
        )}
      </tbody>
    </table>
  </div>
);
