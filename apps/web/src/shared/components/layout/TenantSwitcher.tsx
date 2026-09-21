import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth";
import { getAuthorizedHomePath } from "@/shared/auth/default-route";
import { activateMembershipContext } from "@/shared/auth/active-context";
import { cn } from "@/shared/utils";

export const TenantSwitcher = () => {
  const router = useRouter();
  const { membershipId, memberships } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current = memberships.find(
    (item) => item.membershipId === membershipId,
  );

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!memberships.length) return null;

  async function activate(next: (typeof memberships)[number]) {
    if (next.membershipId === membershipId) return setOpen(false);
    setSwitching(true);
    try {
      await activateMembershipContext(next, memberships);
      setOpen(false);
      router.navigate({
        to: getAuthorizedHomePath(useAuthStore.getState().user),
      });
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 lg:flex-none">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={switching}
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 text-left sm:h-11 sm:gap-2 sm:px-2.5 lg:h-12 lg:w-[220px] lg:gap-3 lg:rounded-xl lg:px-3.5 xl:w-[260px]",
          "shadow-sm transition-all hover:bg-surface-secondary hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
        )}
      >
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-surface xl:flex">
          <Building2 className="h-[18px] w-[18px] text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="hidden text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-text-secondary sm:block">
            Franchise
          </span>
          <span className="block truncate text-sm font-semibold leading-5 text-text-primary">
            {current?.tenant.displayName ||
              current?.tenant.name ||
              "Select franchise"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-secondary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Franchise selection"
          className="absolute left-0 top-full z-40 mt-2 w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-border bg-surface p-2 shadow-elevated"
        >
          <div className="px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Your franchises
            </p>
            <p className="mt-0.5 text-xs text-text-disabled">
              Manage businesses on the Business page.
            </p>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {memberships.map((item) => (
              <button
                key={item.membershipId}
                type="button"
                role="menuitem"
                onClick={() => void activate(item)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
                  <Building2 className="h-4 w-4 text-text-secondary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {item.tenant.displayName || item.tenant.name}
                  </span>
                  <span className="block truncate text-xs text-text-secondary">
                    {item.roles.map((role) => role.name).join(", ")}
                  </span>
                </span>
                {item.membershipId === membershipId && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
