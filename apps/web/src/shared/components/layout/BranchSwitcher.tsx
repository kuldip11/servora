import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, GitBranch } from "lucide-react";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { userHasPermission } from "@/shared/auth/permissions";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/shared/utils";
import { persistActiveContext } from "@/shared/auth/active-context";

export const BranchSwitcher = () => {
  const { memberships, membershipId, branchId, setContext, user } =
    useAuthStore();
  const membership = memberships.find(
    (item) => item.membershipId === membershipId,
  );
  const tenantWide =
    membership?.roles.some((role) => role.scope === "TENANT") ?? false;
  const canReadBranches = userHasPermission(user, "branch:read");
  const branchQuery = useBranches({ enabled: tenantWide && canReadBranches });
  const branchSource =
    tenantWide && canReadBranches
      ? (branchQuery.data ?? membership?.branches ?? [])
      : (membership?.branches ?? []);
  const branches = branchSource.filter((branch) => branch.isActive);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (!membership) return null;
  const activeMembership = membership;

  const selectedValue =
    branchId &&
    (branchId === "all" || branches.some((branch) => branch.id === branchId))
      ? branchId
      : tenantWide
        ? "all"
        : (branches[0]?.id ?? "");

  const selectedBranch = branches.find((branch) => branch.id === selectedValue);
  const selectedLabel =
    selectedValue === "all"
      ? "All Branches"
      : (selectedBranch?.name ?? "No branches");

  async function handleChange(value: string) {
    if (value === selectedValue) {
      setOpen(false);
      return;
    }

    setSwitching(true);
    try {
      setContext({
        membershipId: activeMembership.membershipId,
        franchiseId: activeMembership.tenant.id,
        branchId: value === "all" ? null : value,
      });
      persistActiveContext({
        membershipId: activeMembership.membershipId,
        franchiseId: activeMembership.tenant.id,
        branchId: value,
      });
      setOpen(false);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={switching}
        className={cn(
          "flex h-12 items-center gap-3 min-w-0 max-w-[280px] rounded-xl border border-border bg-surface px-3.5 text-left",
          "shadow-sm transition-all hover:bg-surface-secondary hover:border-primary/30",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60",
        )}
      >
        <span className="w-9 h-9 shrink-0 rounded-lg bg-primary-surface flex items-center justify-center">
          <GitBranch
            aria-hidden="true"
            className="w-[18px] h-[18px] text-primary"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-[0.08em] font-semibold leading-4 text-text-secondary">
            Branch
          </span>
          <span className="block text-sm font-semibold leading-5 text-text-primary truncate">
            {selectedLabel}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "w-4 h-4 shrink-0 text-text-secondary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close branch menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Branch selection"
            className="absolute right-0 top-full mt-2 z-40 w-[320px] rounded-xl border border-border bg-surface shadow-elevated p-2"
          >
            <div className="px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Your branches
              </p>
              <p className="text-xs text-text-disabled mt-0.5 truncate">
                {membership.tenant.name}
              </p>
            </div>

            {branches.length > 0 || tenantWide ? (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {tenantWide && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void handleChange("all")}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-surface-secondary flex items-center justify-center">
                      <GitBranch
                        aria-hidden="true"
                        className="w-4 h-4 text-text-secondary"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary truncate">
                        All Branches
                      </span>
                      <span className="block text-xs text-text-secondary truncate">
                        View the whole franchise
                      </span>
                    </span>
                    {selectedValue === "all" && (
                      <Check
                        aria-hidden="true"
                        className="w-4 h-4 text-primary shrink-0"
                      />
                    )}
                  </button>
                )}

                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    type="button"
                    role="menuitem"
                    onClick={() => void handleChange(branch.id)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-lg bg-surface-secondary flex items-center justify-center">
                      <GitBranch
                        aria-hidden="true"
                        className="w-4 h-4 text-text-secondary"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-text-primary truncate">
                        {branch.name}
                      </span>
                      <span className="block text-xs text-text-secondary truncate">
                        {branch.tablesEnabled
                          ? "Tables enabled"
                          : "Tables disabled"}
                      </span>
                    </span>
                    {selectedValue === branch.id && (
                      <Check
                        aria-hidden="true"
                        className="w-4 h-4 text-primary shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-3 py-4 text-sm text-text-secondary">
                No active branches yet.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
