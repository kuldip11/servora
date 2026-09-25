import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Card,
  Page,
  PageHeader,
  QueryErrorState,
  Spinner,
  StaleDataBanner,
} from "@pos/ui";
import type { OrganizationSummary, Tenant, Branch } from "@pos/types";
import { OrganizationModal } from "@/features/business/components/forms/OrganizationModal";
import { FranchiseModal } from "@/features/business/components/forms/FranchiseModal";
import { BranchModal } from "@/features/business/components/forms/BranchModal";
import { useAuthStore } from "@/store/auth";
import {
  useBusinessHierarchy,
  useRefreshBusiness,
} from "@/features/business/hooks/useBusiness";
import { usePermissions } from "@/shared/auth/permissions";
import { BusinessOnboardingCard } from "@/features/business/components/BusinessOnboardingCard";
import { extractApiError } from "@/shared/lib/api-client";
import {
  BusinessEntityDetails,
  type BusinessBranch,
} from "@/features/business/components/BusinessEntityDetails";
import {
  BusinessStructureTree,
  type SelectedBusinessEntity,
} from "@/features/business/components/page/BusinessStructureTree";

export const BusinessPage = () => {
  const { has } = usePermissions();
  const { memberships, membershipId, user } = useAuthStore();
  const [organizationModal, setOrganizationModal] = useState(false);
  const [franchiseModal, setFranchiseModal] = useState(false);
  const [branchModal, setBranchModal] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [selectedEntity, setSelectedEntity] =
    useState<SelectedBusinessEntity | null>(null);
  const [editingOrganization, setEditingOrganization] =
    useState<OrganizationSummary | null>(null);
  const [editingFranchise, setEditingFranchise] = useState<Tenant | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const query = useBusinessHierarchy();
  const refresh = useRefreshBusiness();

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
  const branchesByTenant = new Map<string, BusinessBranch[]>();
  for (const branch of branches) {
    const tenantBranches = branchesByTenant.get(branch.tenantId) ?? [];
    tenantBranches.push(branch);
    branchesByTenant.set(branch.tenantId, tenantBranches);
  }
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

  if (query.isLoading)
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );

  if (query.isError && query.data === undefined) {
    return (
      <Page>
        <PageHeader
          title="Business"
          description="Manage your Organization → Franchise → Branch hierarchy and operational status."
        />
        <QueryErrorState
          title="Unable to load business structure"
          description={extractApiError(
            query.error,
            "Your business structure could not be loaded. Retry before creating or changing business entities.",
          )}
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      </Page>
    );
  }

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

      {query.isError ? (
        <StaleDataBanner
          message="Business structure refresh failed — showing the latest data available."
          isRetrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      ) : null}

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
          <BusinessStructureTree
            organizations={data.organizations}
            franchises={data.franchises}
            branchesByTenant={branchesByTenant}
            selectedEntity={selectedEntity}
            onSelect={(entity, organizationId) => {
              setSelectedEntity(entity);
              if (organizationId) setSelectedOrganizationId(organizationId);
            }}
          />

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
