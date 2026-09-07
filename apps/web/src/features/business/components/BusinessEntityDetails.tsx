import type { ReactNode } from "react";
import {
  Building2,
  GitBranch,
  MapPin,
  Pencil,
  Plus,
  Store,
} from "lucide-react";
import { Button } from "@pos/ui";
import type { Branch, OrganizationSummary, Tenant } from "@pos/types";

export type BusinessBranch = {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  address: string;
  city?: string | null;
  stateProvince?: string | null;
  phone?: string | null;
  timezone?: string;
  tablesEnabled: boolean;
  isActive: boolean;
};

type EntityDetailsHeaderProps = {
  icon: ReactNode;
  name: string;
  type: string;
  description?: string;
  actions?: ReactNode;
};

const EntityDetailsHeader = ({
  icon,
  name,
  type,
  description,
  actions,
}: EntityDetailsHeaderProps) => (
  <div className="flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-surface text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {type}
        </p>
        <h2 className="truncate text-xl font-semibold">{name}</h2>
        {description && (
          <p className="mt-1 text-sm capitalize text-text-secondary">
            {description.toLowerCase()}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

type DetailItemProps = {
  label: string;
  value: string | null | undefined;
  icon?: ReactNode;
};

const DetailItem = ({ label, value, icon }: DetailItemProps) => (
  <div className="rounded-lg border border-border bg-background p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
      {label}
    </p>
    <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-text-primary">
      {icon}
      {value || "Not provided"}
    </p>
  </div>
);

type BusinessEntityDetailsProps = {
  organization: OrganizationSummary | undefined;
  franchise: Tenant | undefined;
  branch: BusinessBranch | undefined;
  franchiseCount: number;
  branchCount: number;
  canCreateFranchise: boolean;
  canEditOrganization: boolean;
  canCreateBranch: boolean;
  canEditFranchise: boolean;
  canEditBranch: boolean;
  onAddFranchise: (organization: OrganizationSummary) => void;
  onEditOrganization: (organization: OrganizationSummary) => void;
  onAddBranch: () => void;
  onEditFranchise: (franchise: Tenant) => void;
  onEditBranch: (branch: BusinessBranch) => void;
};

export const BusinessEntityDetails = ({
  organization,
  franchise,
  branch,
  franchiseCount,
  branchCount,
  canCreateFranchise,
  canEditOrganization,
  canCreateBranch,
  canEditFranchise,
  canEditBranch,
  onAddFranchise,
  onEditOrganization,
  onAddBranch,
  onEditFranchise,
  onEditBranch,
}: BusinessEntityDetailsProps) => {
  if (organization) {
    return (
      <>
        <EntityDetailsHeader
          icon={<Building2 className="h-5 w-5" />}
          name={organization.name}
          type="Organization"
          description={
            organization.businessType?.replace(/_/g, " ") || "Business profile"
          }
          actions={
            <>
              {canCreateFranchise && (
                <Button onClick={() => onAddFranchise(organization)}>
                  <Plus className="h-4 w-4" /> Add franchise
                </Button>
              )}
              {canEditOrganization && (
                <Button
                  variant="secondary"
                  onClick={() => onEditOrganization(organization)}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
            </>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Business type"
            value={organization.businessType?.replace(/_/g, " ")}
          />
          <DetailItem label="Franchises" value={String(franchiseCount)} />
          <DetailItem
            label="Primary contact"
            value={organization.primaryContactName}
          />
          <DetailItem
            label="Business email"
            value={organization.businessEmail}
          />
          <DetailItem
            label="Business phone"
            value={organization.businessPhone}
          />
          <DetailItem
            label="Location"
            value={[
              organization.city,
              organization.stateProvince,
              organization.country,
            ]
              .filter(Boolean)
              .join(", ")}
          />
        </div>
      </>
    );
  }

  if (franchise) {
    return (
      <>
        <EntityDetailsHeader
          icon={<Store className="h-5 w-5" />}
          name={franchise.displayName || franchise.name}
          type="Franchise"
          description={
            franchise.businessModel?.replace(/_/g, " ") || "Restaurant brand"
          }
          actions={
            <>
              {canCreateBranch && (
                <Button onClick={onAddBranch}>
                  <Plus className="h-4 w-4" /> Add branch
                </Button>
              )}
              {canEditFranchise && (
                <Button
                  variant="secondary"
                  onClick={() => onEditFranchise(franchise)}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
            </>
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailItem
            label="Business model"
            value={franchise.businessModel?.replace(/_/g, " ")}
          />
          <DetailItem
            label="Cuisine"
            value={franchise.cuisineTypes?.join(", ")}
          />
          <DetailItem
            label="Default currency"
            value={franchise.defaultCurrency}
          />
          <DetailItem
            label="Default timezone"
            value={franchise.defaultTimezone}
          />
          <DetailItem label="Branches" value={String(branchCount)} />
          <DetailItem
            label="Status"
            value={franchise.isActive ? "Active" : "Inactive"}
          />
        </div>
      </>
    );
  }

  if (branch) {
    return (
      <>
        <EntityDetailsHeader
          icon={<GitBranch className="h-5 w-5" />}
          name={branch.name}
          type="Branch"
          description={branch.isActive ? "Active" : "Inactive"}
          actions={
            canEditBranch ? (
              <Button variant="secondary" onClick={() => onEditBranch(branch)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            ) : undefined
          }
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DetailItem label="Branch code" value={branch.code} />
          <DetailItem
            label="Status"
            value={branch.isActive ? "Active" : "Inactive"}
          />
          <DetailItem
            label="Location"
            value={
              branch.address ||
              [branch.city, branch.stateProvince].filter(Boolean).join(", ")
            }
            icon={<MapPin className="h-4 w-4" />}
          />
          <DetailItem label="Phone" value={branch.phone} />
          <DetailItem label="Timezone" value={branch.timezone} />
          <DetailItem
            label="Tables"
            value={branch.tablesEnabled ? "Enabled" : "Disabled"}
          />
        </div>
      </>
    );
  }

  return null;
};
