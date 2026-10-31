import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "../../utils/cn";
import { IconButton } from "../IconButton";
import { Select } from "../Select";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;

  totalItems?: number | undefined;
  pageSize?: number | undefined;
  onPageSizeChange?: ((pageSize: number) => void) | undefined;
  pageSizeOptions?: number[] | undefined;
  className?: string | undefined;
}

const buildPageWindow = (
  page: number,
  pageCount: number,
): (number | "ellipsis")[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= pageCount)
    .sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (p - prev === 2) out.push(prev + 1);
      else if (p - prev > 2) out.push("ellipsis");
    }
    out.push(p);
  });
  return out;
};

export const Pagination = ({
  page,
  pageCount,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: PaginationProps) => {
  const safePageCount = Math.max(1, pageCount);
  const pageWindow = buildPageWindow(page, safePageCount);

  const rangeStart = pageSize ? (page - 1) * pageSize + 1 : undefined;
  const rangeEnd =
    pageSize && totalItems !== undefined
      ? Math.min(page * pageSize, totalItems)
      : undefined;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 flex-wrap",
        className,
      )}
    >
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        {totalItems !== undefined &&
          rangeStart !== undefined &&
          rangeEnd !== undefined && (
            <span>
              Showing{" "}
              <span className="font-medium text-text-primary">
                {rangeStart}
              </span>
              –<span className="font-medium text-text-primary">{rangeEnd}</span>{" "}
              of{" "}
              <span className="font-medium text-text-primary">
                {totalItems}
              </span>
            </span>
          )}
        {onPageSizeChange && pageSize !== undefined && (
          <Select
            aria-label="Rows per page"
            value={String(pageSize)}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            containerClassName="min-w-32"
            className="py-1 text-sm"
          />
        )}
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          aria-label="Previous page"
          variant="ghost"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />

        {pageWindow.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`e${i}`}
              className="w-8 h-8 flex items-center justify-center text-text-disabled"
            >
              <MoreHorizontal className="w-4 h-4" />
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={cn(
                "w-8 h-8 rounded-md text-sm font-medium transition-colors duration-fast ease-standard",
                p === page
                  ? "bg-primary text-primary-foreground"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary",
              )}
            >
              {p}
            </button>
          ),
        )}

        <IconButton
          icon={ChevronRight}
          aria-label="Next page"
          variant="ghost"
          size="sm"
          disabled={page >= safePageCount}
          onClick={() => onPageChange(page + 1)}
        />
      </nav>
    </div>
  );
};
