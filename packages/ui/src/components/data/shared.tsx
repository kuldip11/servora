import {
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useState,
} from "react";

export type SortDirection = "asc" | "desc";

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export type ColumnAlign = "left" | "right" | "center";

export interface Column<T> {
  id: string;
  header: ReactNode;

  cell: (row: T, rowIndex: number) => ReactNode;

  sortable?: boolean | undefined;

  sortValue?: ((row: T) => string | number | Date) | undefined;
  align?: ColumnAlign | undefined;
  width?: string | undefined;
  minWidth?: string | undefined;

  hidden?: boolean | undefined;

  sticky?: "left" | "right" | undefined;
}

export const ALIGN_CLASSES: Record<ColumnAlign, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export type TableDensity = "compact" | "comfortable";

export const CELL_PADDING: Record<TableDensity, string> = {
  compact: "px-3 py-2",
  comfortable: "px-4 py-3",
};

export const SORT_BUTTON_FOCUS_CLASSES =
  "rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1";

export const CLICKABLE_ROW_FOCUS_CLASSES =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary";

export function clickableRowKeyDown<T>(
  row: T,
  onRowClick: ((row: T) => void) | undefined,
) {
  if (!onRowClick) return undefined;
  return (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRowClick(row);
    }
  };
}

export function sortRows<T>(
  rows: T[],
  columns: Column<T>[],
  sort: SortState | null | undefined,
): T[] {
  if (!sort) return rows;
  const col = columns.find((c) => c.id === sort.columnId);
  if (!col?.sortValue) return rows;
  const getValue = col.sortValue;
  const dir = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export const nextSortState = (
  current: SortState | null,
  columnId: string,
): SortState | null => {
  if (!current || current.columnId !== columnId)
    return { columnId, direction: "asc" };
  if (current.direction === "asc") return { columnId, direction: "desc" };
  return null;
};

export const useVirtualizedRows = (
  count: number,
  containerRef: RefObject<HTMLElement | null>,
  rowHeight: number,
  overscan = 8,
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    setViewportHeight(el.clientHeight);
    const resizeObserver = new ResizeObserver(() =>
      setViewportHeight(el.clientHeight),
    );
    resizeObserver.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  const totalHeight = count * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    count,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan,
  );

  return { totalHeight, startIndex, endIndex, offsetY: startIndex * rowHeight };
};

export const STICKY_FALLBACK_WIDTH = 150;

const parseWidthPx = (width: string | undefined): number => {
  if (!width) return STICKY_FALLBACK_WIDTH;
  const n = parseFloat(width);
  return Number.isFinite(n) && width.trim().endsWith("px")
    ? n
    : STICKY_FALLBACK_WIDTH;
};

export function computeStickyOffsets<T>(
  visibleColumns: Column<T>[],
): Map<string, { left?: number; right?: number }> {
  const offsets = new Map<string, { left?: number; right?: number }>();
  let leftAcc = 0;
  for (const col of visibleColumns) {
    if (col.sticky === "left") {
      offsets.set(col.id, { left: leftAcc });
      leftAcc += parseWidthPx(col.width);
    }
  }
  let rightAcc = 0;
  for (let i = visibleColumns.length - 1; i >= 0; i--) {
    const col = visibleColumns[i]!;
    if (col.sticky === "right") {
      offsets.set(col.id, { right: rightAcc });
      rightAcc += parseWidthPx(col.width);
    }
  }
  return offsets;
}

export const matchesGlobalFilter = (
  searchableText: string,
  query: string,
): boolean => {
  if (!query.trim()) return true;
  return searchableText.toLowerCase().includes(query.trim().toLowerCase());
};
