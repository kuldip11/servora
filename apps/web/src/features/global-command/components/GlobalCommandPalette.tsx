import { Dialog, SearchInput, Spinner } from "@pos/ui";
import { ArrowUpRight, CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/shared/utils";
import { useGlobalCommandSearch } from "@/features/global-command/hooks/useGlobalCommandSearch";
import type { GlobalCommandResult } from "@/features/global-command/types";

interface GlobalCommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const ResultRow = ({
  result,
  active,
  onMouseEnter,
}: {
  result: GlobalCommandResult;
  active: boolean;
  onMouseEnter: () => void;
}) => {
  const Icon = result.icon;
  return (
    <button
      type="button"
      data-command-result
      onMouseEnter={onMouseEnter}
      onClick={result.action}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        active
          ? "bg-primary-surface text-primary"
          : "text-text-primary hover:bg-surface-secondary",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface">
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {result.label}
        </span>
        <span className="block truncate text-xs text-text-secondary">
          {result.description}
        </span>
      </span>
      {active ? (
        <CornerDownLeft
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-text-secondary"
        />
      ) : (
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-text-disabled"
        />
      )}
    </button>
  );
};

export const GlobalCommandPalette = ({
  open,
  onClose,
}: GlobalCommandPaletteProps) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigationResults, entityResults, isSearching } =
    useGlobalCommandSearch(query, open, onClose);
  const results = useMemo(
    () => [...navigationResults, ...entityResults],
    [navigationResults, entityResults],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (activeIndex < results.length) return;
    setActiveIndex(Math.max(0, results.length - 1));
  }, [activeIndex, results.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length ? (current + 1) % results.length : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        results.length ? (current - 1 + results.length) % results.length : 0,
      );
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      results[activeIndex].action();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Command & Search"
      size="lg"
      bodyClassName="p-0 overflow-hidden"
      description="Search Servora and jump to permitted areas using the keyboard."
    >
      <div className="border-b border-border p-3">
        <SearchInput
          ref={inputRef}
          aria-label="Search Servora"
          placeholder="Search orders, menu, staff, inventory, tables…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="max-h-[56vh] overflow-y-auto p-2">
        {navigationResults.length > 0 && (
          <section aria-label="Navigation results">
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
              Navigation
            </p>
            {navigationResults.map((result) => {
              const index = results.indexOf(result);
              return (
                <ResultRow
                  key={result.id}
                  result={result}
                  active={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              );
            })}
          </section>
        )}

        {entityResults.length > 0 && (
          <section
            aria-label="Search results"
            className="mt-2 border-t border-border pt-2"
          >
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-disabled">
              Results
            </p>
            {entityResults.map((result) => {
              const index = results.indexOf(result);
              return (
                <ResultRow
                  key={result.id}
                  result={result}
                  active={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                />
              );
            })}
          </section>
        )}

        {isSearching && (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-text-secondary">
            <Spinner className="h-4 w-4" /> Searching…
          </div>
        )}

        {!isSearching && results.length === 0 && (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <Search
              aria-hidden="true"
              className="mb-3 h-8 w-8 text-text-disabled"
            />
            <p className="text-sm font-medium text-text-primary">
              No permitted results found
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Try an order ID, menu item, staff member, inventory item, table,
              branch, or page name.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-surface-secondary px-4 py-2 text-[11px] text-text-secondary">
        <span>↑ ↓ navigate · Enter open · Esc close</span>
        <span>Ctrl/Cmd + K</span>
      </div>
    </Dialog>
  );
};
