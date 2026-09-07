import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, GitBranch, Plus, Store } from "lucide-react";
import { Button, Card, Page, PageHeader, Spinner } from "@pos/ui";
import type { OrganizationSummary, Tenant, Branch } from "@pos/types";
import { businessService } from "@/features/business/services/business.service";
import { OrganizationModal } from "@/features/business/components/forms/OrganizationModal";
import { FranchiseModal } from "@/features/business/components/forms/FranchiseModal";
import { BranchModal } from "@/features/business/components/forms/BranchModal";
import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/store/auth";
import { usePermissions } from "@/shared/auth/permissions";
import { BusinessOnboardingCard } from "@/features/business/components/BusinessOnboardingCard";
import {
  BusinessEntityDetails,
  type BusinessBranch,
} from "@/features/business/components/BusinessEntityDetails";

const businessKeys = { all: ["business"] as const };
type BusinessData = {
  organizations: OrganizationSummary[];
  franchises: Tenant[];
};

type SelectedEntity =
  | { type: "organization"; id: string }
  | { type: "franchise"; id: string }
  | { type: "branch"; id: string };

export const BusinessPage = () => {
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const { memberships, membershipId, user } = useAuthStore();
  const [organizationModal, setOrganizationModal] = useState(false);
  const [franchiseModal, setFranchiseModal] = useState(false);
  const [branchModal, setBranchModal] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(
    null,
  );
  const [editingOrganization, setEditingOrganization] =
    useState<OrganizationSummary | null>(null);
  const [editingFranchise, setEditingFranchise] = useState<Tenant | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const query = useQuery({
    queryKey: businessKeys.all,
    queryFn: async (): Promise<BusinessData> => {
      const organizations = await businessService.organizations();
      const franchiseGroups = await Promise.all(
        organizations.map((organization) =>
          businessService.franchises(organization.id).catch(() => []),
        ),
      );
      return { organizations, franchises: franchiseGroups.flat() };
    },
  });

  const activeMembership = memberships.find(
    (item) => item.membershipId === membershipId,
  );
  const isOwner = user?.roles.some((role) => role.name === "OWNER") ?? false;
  const canCreateOrganization = isOwner;
  const canCreateFranchise = isOwner && has("tenant:create");
  const branches: BusinessBranch[] = memberships.flatMap((membership) =>
    membership.branches.map((branch) => ({
      ...branch,
      tenantId: membership.tenant.id,
    })),
  );
  const data = query.data ?? { organizations: [], franchises: [] };
  const onboardingStep = !data.organizations.length
    ? 1
    : !data.franchises.length
      ? 2
      : !branches.length
        ? 3
        : 4;
  const onboarding = onboardingStep < 4;

  useEffect(() => {
    if (!selectedOrganizationId && data.organizations[0]) {
      setSelectedOrganizationId(data.organizations[0].id);
    }
    if (!selectedEntity && data.organizations[0]) {
      setSelectedEntity({ type: "organization", id: data.organizations[0].id });
    }
  }, [data.organizations, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedEntity) return;
    const selectionStillExists =
      (selectedEntity.type === "organization" &&
        data.organizations.some((item) => item.id === selectedEntity.id)) ||
      (selectedEntity.type === "franchise" &&
        data.franchises.some((item) => item.id === selectedEntity.id)) ||
      (selectedEntity.type === "branch" &&
        branches.some((item) => item.id === selectedEntity.id));
    if (!selectionStillExists && data.organizations[0]) {
      setSelectedEntity({ type: "organization", id: data.organizations[0].id });
    }
  }, [branches, data.franchises, data.organizations, selectedEntity]);

  const selectedOrganization =
    selectedEntity?.type === "organization"
      ? data.organizations.find((item) => item.id === selectedEntity.id)
      : undefined;
  const selectedFranchise =
    selectedEntity?.type === "franchise"
      ? data.franchises.find((item) => item.id === selectedEntity.id)
      : undefined;
  const selectedBranch =
    selectedEntity?.type === "branch"
      ? branches.find((item) => item.id === selectedEntity.id)
      : undefined;

  const refresh = async () => {
    const nextMemberships = await authService.memberships();
    useAuthStore.getState().setContext({
      membershipId: useAuthStore.getState().membershipId,
      franchiseId: useAuthStore.getState().franchiseId,
      branchId: useAuthStore.getState().branchId,
      memberships: nextMemberships,
    });
    await queryClient.invalidateQueries({ queryKey: businessKeys.all });
  };

  if (query.isLoading)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );

  return (
    <Page>
      <PageHeader
        title={onboarding ? "Set up your business" : "Business"}
        description={
          onboarding
            ? "Complete the minimum Organization → Franchise → Branch hierarchy to start operating."
            : "Manage your Organization → Franchise → Branch hierarchy and operational status."
        }
        actions={
          canCreateOrganization ? (
            <Button
              onClick={() => {
                setEditingOrganization(null);
                setOrganizationModal(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add business
            </Button>
          ) : undefined
        }
      />

      {onboarding && (
        <BusinessOnboardingCard
          onboardingStep={onboardingStep}
          canCreateOrganization={canCreateOrganization}
          canCreateFranchise={canCreateFranchise}
          canCreateBranch={has("branch:create")}
          onCreateOrganization={() => setOrganizationModal(true)}
          onCreateFranchise={() => setFranchiseModal(true)}
          onCreateBranch={() => setBranchModal(true)}
        />
      )}

      {!!data.organizations.length && (
        <div className="grid min-h-[560px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-divider px-4 py-4">
              <p className="text-sm font-semibold">Business structure</p>
              <p className="mt-1 text-xs text-text-secondary">
                Select an entity to view or manage it.
              </p>
            </div>
            <div className="max-h-[680px] overflow-y-auto p-2">
              {data.organizations.map((organization) => {
                const organizationFranchises = data.franchises.filter(
                  (franchise) => franchise.organizationId === organization.id,
                );
                return (
                  <div key={organization.id} className="mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEntity({
                          type: "organization",
                          id: organization.id,
                        });
                        setSelectedOrganizationId(organization.id);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition-colors ${selectedEntity?.type === "organization" && selectedEntity.id === organization.id ? "bg-primary-surface text-primary" : "hover:bg-surface-secondary"}`}
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{organization.name}</span>
                    </button>
                    <div className="ml-5 border-l border-divider pl-2">
                      {organizationFranchises.map((franchise) => {
                        const membership = memberships.find(
                          (item) => item.tenant.id === franchise.id,
                        );
                        return (
                          <div key={franchise.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEntity({
                                  type: "franchise",
                                  id: franchise.id,
                                });
                                setSelectedOrganizationId(organization.id);
                              }}
                              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedEntity?.type === "franchise" && selectedEntity.id === franchise.id ? "bg-primary-surface font-semibold text-primary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"}`}
                            >
                              <Store className="h-4 w-4 shrink-0" />
                              <span className="truncate">
                                {franchise.displayName || franchise.name}
                              </span>
                            </button>
                            <div className="ml-5 space-y-0.5 border-l border-divider pl-2">
                              {(membership?.branches ?? []).map((branch) => (
                                <button
                                  key={branch.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedEntity({
                                      type: "branch",
                                      id: branch.id,
                                    })
                                  }
                                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${selectedEntity?.type === "branch" && selectedEntity.id === branch.id ? "bg-primary-surface font-semibold text-primary" : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"}`}
                                >
                                  <GitBranch className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">
                                    {branch.name}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="min-w-0">
            <BusinessEntityDetails
              organization={selectedOrganization}
              franchise={selectedFranchise}
              branch={selectedBranch}
              franchiseCount={
                selectedOrganization
                  ? data.franchises.filter(
                      (item) => item.organizationId === selectedOrganization.id,
                    ).length
                  : 0
              }
              branchCount={
                selectedFranchise
                  ? (memberships.find(
                      (item) => item.tenant.id === selectedFranchise.id,
                    )?.branches.length ?? 0)
                  : 0
              }
              canCreateFranchise={canCreateFranchise}
              canEditOrganization={has("organization:manage")}
              canCreateBranch={
                selectedFranchise?.id === activeMembership?.tenant.id &&
                has("branch:create")
              }
              canEditFranchise={
                selectedFranchise?.id === activeMembership?.tenant.id &&
                has("tenant:update")
              }
              canEditBranch={
                selectedBranch?.tenantId === activeMembership?.tenant.id &&
                has("branch:update")
              }
              onAddFranchise={(organization) => {
                setSelectedOrganizationId(organization.id);
                setEditingFranchise(null);
                setFranchiseModal(true);
              }}
              onEditOrganization={(organization) => {
                setEditingOrganization(organization);
                setOrganizationModal(true);
              }}
              onAddBranch={() => {
                setEditingBranch(null);
                setBranchModal(true);
              }}
              onEditFranchise={(franchise) => {
                setEditingFranchise(franchise);
                setSelectedOrganizationId(franchise.organizationId ?? "");
                setFranchiseModal(true);
              }}
              onEditBranch={(branch) => {
                setEditingBranch(branch as Branch);
                setBranchModal(true);
              }}
            />
          </Card>
        </div>
      )}

      <OrganizationModal
        open={organizationModal}
        organization={editingOrganization}
        onClose={() => {
          setOrganizationModal(false);
          setEditingOrganization(null);
        }}
        onSaved={refresh}
      />
      <FranchiseModal
        open={franchiseModal}
        franchise={editingFranchise}
        organizations={data.organizations}
        organizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        onClose={() => {
          setFranchiseModal(false);
          setEditingFranchise(null);
        }}
        onSaved={refresh}
      />
      <BranchModal
        open={branchModal}
        branch={editingBranch}
        currency={activeMembership?.tenant.defaultCurrency || "INR"}
        onClose={() => {
          setBranchModal(false);
          setEditingBranch(null);
        }}
        onSaved={refresh}
      />
    </Page>
  );
};
