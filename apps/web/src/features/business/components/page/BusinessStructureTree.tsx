import { Building2, GitBranch, Store } from "lucide-react";
import { Card } from "@pos/ui";
import type { OrganizationSummary, Tenant } from "@pos/types";
import type { BusinessBranch } from "@/features/business/components/BusinessEntityDetails";

export type SelectedBusinessEntity =
  | { type: "organization"; id: string }
  | { type: "franchise"; id: string }
  | { type: "branch"; id: string };

interface BusinessStructureTreeProps {
  organizations: OrganizationSummary[];
  franchises: Tenant[];
  branchesByTenant: Map<string, BusinessBranch[]>;
  selectedEntity: SelectedBusinessEntity | null;
  onSelect: (entity: SelectedBusinessEntity, organizationId?: string) => void;
}

export const BusinessStructureTree = ({
  organizations,
  franchises,
  branchesByTenant,
  selectedEntity,
  onSelect,
}: BusinessStructureTreeProps) => (
  <Card padding="none" className="overflow-hidden">
    <div className="border-b border-divider px-4 py-4">
      <p className="text-sm font-semibold">Business structure</p>
      <p className="mt-1 text-xs text-text-secondary">
        Select an entity to view or manage it.
      </p>
    </div>
    <div className="max-h-[680px] overflow-y-auto p-2">
      {organizations.map((organization) => {
        const organizationFranchises = franchises.filter(
          (franchise) => franchise.organizationId === organization.id,
        );
        return (
          <div key={organization.id} className="mb-1">
            <button
              type="button"
              onClick={() =>
                onSelect(
                  { type: "organization", id: organization.id },
                  organization.id,
                )
              }
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${selectedEntity?.type === "organization" && selectedEntity.id === organization.id ? "bg-primary-surface text-primary" : "hover:bg-surface-secondary"}`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{organization.name}</span>
            </button>
            <div className="ml-5 border-l border-divider pl-2">
              {organizationFranchises.map((franchise) => (
                <div key={franchise.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelect(
                        { type: "franchise", id: franchise.id },
                        organization.id,
                      )
                    }
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedEntity?.type === "franchise" && selectedEntity.id === franchise.id ? "bg-primary-surface font-semibold text-primary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"}`}
                  >
                    <Store className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {franchise.displayName || franchise.name}
                    </span>
                  </button>
                  <div className="ml-5 space-y-0.5 border-l border-divider pl-2">
                    {(branchesByTenant.get(franchise.id) ?? []).map(
                      (branch) => (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() =>
                            onSelect({ type: "branch", id: branch.id })
                          }
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedEntity?.type === "branch" && selectedEntity.id === branch.id ? "bg-primary-surface font-semibold text-primary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"}`}
                        >
                          <GitBranch className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{branch.name}</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);
