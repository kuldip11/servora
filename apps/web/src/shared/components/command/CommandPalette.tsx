import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@pos/ui";
import { usePermissions } from "@/shared/auth/permissions";

import { NAVIGATION_COMMANDS } from "./commands";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { has } = usePermissions();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const commands = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return NAVIGATION_COMMANDS.filter((command) => !command.permission || has(command.permission)).filter(
      (command) =>
        !normalized ||
        command.label.toLowerCase().includes(normalized) ||
        command.description.toLowerCase().includes(normalized) ||
        command.keywords.some((keyword) => keyword.includes(normalized)),
    );
  }, [has, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 min-w-9 items-center justify-center gap-2 rounded-lg border border-border bg-surface-secondary px-2 text-sm text-text-secondary transition hover:text-text-primary lg:px-3"
        aria-label="Open command palette"
      >
        <span aria-hidden="true" className="lg:hidden">⌕</span>
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium lg:inline">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Search Servora" size="lg">
        <div className="space-y-3">
          <label className="sr-only" htmlFor="servora-command-search">
            Search commands
          </label>
          <input
            ref={inputRef}
            id="servora-command-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders, menu, inventory, business…"
            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />

          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border">
            {commands.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-secondary">
                No commands match “{query}”.
              </p>
            ) : (
              <ul className="divide-y divide-divider" aria-label="Available commands">
                {commands.map((command) => (
                  <li key={command.id}>
                    <Link
                      to={command.to}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <span className="block text-sm font-medium text-text-primary">
                        {command.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-secondary">
                        {command.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-text-muted">
            Tip: press Ctrl+K from anywhere in Servora to open search.
          </p>
        </div>
      </Dialog>
    </>
  );
};
