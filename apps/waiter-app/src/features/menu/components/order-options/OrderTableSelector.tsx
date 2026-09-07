import { useState } from "react";
import type { RestaurantTableDto } from "@pos/api-client";

interface Props {
  tables: RestaurantTableDto[];
  tableId: string;
  onTableChange: (id: string) => void;
}

const TABLE_STATUSES = [
  "ALL",
  "AVAILABLE",
  "OCCUPIED",
  "RESERVED",
  "CLEANING",
] as const;

export const OrderTableSelector = ({
  tables,
  tableId,
  onTableChange,
}: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof TABLE_STATUSES)[number]>("ALL");
  const [visibleCount, setVisibleCount] = useState(30);

  const filteredTables = tables.filter((table) => {
    const query = search.trim().toLowerCase();
    return (
      (!query ||
        `${table.name} ${table.section ?? ""}`.toLowerCase().includes(query)) &&
      (statusFilter === "ALL" || table.status === statusFilter)
    );
  });
  const availableCount = tables.filter(
    (table) => table.status === "AVAILABLE",
  ).length;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Select table
        </p>
        <span className="text-xs text-text-disabled">
          {availableCount} available
        </span>
      </div>
      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setVisibleCount(30);
        }}
        placeholder="Search table or section…"
        aria-label="Search tables"
        className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="scrollbar-hidden flex gap-1.5 overflow-x-auto">
        {TABLE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => {
              setStatusFilter(status);
              setVisibleCount(30);
            }}
            className={`min-h-9 shrink-0 rounded-full border px-3 text-[11px] font-semibold ${
              statusFilter === status
                ? "border-primary bg-primary-surface text-primary"
                : "border-border bg-surface text-text-secondary"
            }`}
          >
            {status === "ALL"
              ? "All"
              : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div
        className="scrollbar-hidden grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3"
        onScroll={(event) => {
          const target = event.currentTarget;
          if (
            target.scrollHeight - target.scrollTop - target.clientHeight <
            120
          ) {
            setVisibleCount((current) =>
              Math.min(filteredTables.length, current + 30),
            );
          }
        }}
      >
        {filteredTables.slice(0, visibleCount).map((table) => {
          const status = table.status ?? "AVAILABLE";
          const available = status === "AVAILABLE";
          const selected = table.id === tableId;
          return (
            <button
              key={table.id}
              type="button"
              disabled={!available}
              onClick={() => onTableChange(table.id)}
              className={`min-h-20 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${
                selected
                  ? "border-primary bg-primary-surface ring-1 ring-primary"
                  : "border-border bg-surface"
              }`}
            >
              <span className="block truncate text-sm font-semibold text-text-primary">
                {table.name}
              </span>
              <span className="mt-1 block truncate text-[11px] text-text-secondary">
                {available
                  ? `${table.capacity} seats${table.section ? ` · ${table.section}` : ""}`
                  : status.charAt(0) + status.slice(1).toLowerCase()}
              </span>
            </button>
          );
        })}
      </div>
      {!filteredTables.length && (
        <p className="rounded-xl bg-surface-secondary p-3 text-center text-xs text-text-secondary">
          No tables match these filters.
        </p>
      )}
      {!availableCount && (
        <p className="mt-2 rounded-xl bg-warning-surface p-3 text-xs text-warning">
          No table is currently available. Reserved, occupied, and cleaning
          tables cannot be selected.
        </p>
      )}
    </div>
  );
};
