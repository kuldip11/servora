import { Columns3, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../Button";
import { Popover } from "../overlay/Popover";
import { cn } from "../../utils/cn";
import type { Column } from "./shared";

type Props<T> = {
  columns: Column<T>[];
  visibility: Record<string, boolean>;
  enableGlobalFilter: boolean;
  globalFilter: string;
  globalFilterPlaceholder: string;
  enableColumnVisibility: boolean;
  toolbarActions?: ReactNode;
  onGlobalFilterChange: (value: string) => void;
  onVisibilityChange: (visibility: Record<string, boolean>) => void;
};

const VisibilityCheckbox = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) => (
  <input
    type="checkbox"
    aria-label={label}
    checked={checked}
    onChange={(event) => onChange(event.target.checked)}
    className="h-4 w-4 cursor-pointer rounded border-border text-primary focus:outline-none focus:ring-2 focus:ring-primary"
  />
);

export const DataGridToolbar = <T,>({
  columns,
  visibility,
  enableGlobalFilter,
  globalFilter,
  globalFilterPlaceholder,
  enableColumnVisibility,
  toolbarActions,
  onGlobalFilterChange,
  onVisibilityChange,
}: Props<T>) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    {enableGlobalFilter ? (
      <div className="relative min-w-[200px] max-w-xs flex-1">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          value={globalFilter}
          onChange={(event) => onGlobalFilterChange(event.target.value)}
          placeholder={globalFilterPlaceholder}
          aria-label={globalFilterPlaceholder}
          className={cn(
            "w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary",
            "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary",
          )}
        />
      </div>
    ) : (
      <div />
    )}
    <div className="flex items-center gap-2">
      {toolbarActions}
      {enableColumnVisibility ? (
        <Popover
          align="end"
          trigger={
            <Button variant="outline" size="sm">
              <Columns3 aria-hidden="true" className="h-3.5 w-3.5" />
              Columns
            </Button>
          }
        >
          <div className="flex min-w-[160px] flex-col gap-1">
            {columns.map((column) => (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-text-primary hover:bg-surface-secondary"
              >
                <VisibilityCheckbox
                  label={`Toggle ${String(column.header)} column`}
                  checked={visibility[column.id] !== false}
                  onChange={(checked) =>
                    onVisibilityChange({ ...visibility, [column.id]: checked })
                  }
                />
                {column.header}
              </label>
            ))}
          </div>
        </Popover>
      ) : null}
    </div>
  </div>
);
