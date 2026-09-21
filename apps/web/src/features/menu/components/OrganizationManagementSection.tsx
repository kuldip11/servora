import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryErrorState, Select, StaleDataBanner } from "@pos/ui";
import type { CustomerLoyaltyTier, PriceRule } from "@pos/types";
import { createMenuApi, createOrganizationsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const organizationsApi = createOrganizationsApi(apiClient);
const menuApi = createMenuApi(apiClient);
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { usePermissions } from "@/shared/auth/permissions";
import { useOrganizationDefaultsFormState } from "@/features/menu/hooks/useOrganizationDefaultsFormState";

import { OrganizationMenuPanel } from "@/features/menu/components/organization-management/OrganizationMenuPanel";
import { OrganizationPriceRulesPanel } from "@/features/menu/components/organization-management/OrganizationPriceRulesPanel";
import { OrganizationLoyaltyPanel } from "@/features/menu/components/organization-management/OrganizationLoyaltyPanel";
import type {
  OrgMembership,
  OrgMenu,
  OrganizationTenantSummary,
} from "@/features/menu/components/organization-management/types";

export const OrganizationManagementSection = () => {
  const { has } = usePermissions();
  const canManage = has("organization:manage");
  const membershipsQuery = useQuery<OrgMembership[]>({
    queryKey: ["organizations"],
    queryFn: () => organizationsApi.list<OrgMembership>(),
    enabled: canManage,
  });
  const memberships = membershipsQuery.data ?? [];
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const organizationId =
    selectedOrgId ||
    memberships[0]?.organizationId ||
    memberships[0]?.organization?.id ||
    "";
  const organization = useMemo(
    () =>
      memberships.find(
        (entry) =>
          (entry.organizationId || entry.organization.id) === organizationId,
      )?.organization,
    [memberships, organizationId],
  );
  const menusKey = ["organizations", organizationId, "menus"];
  const rulesKey = ["organizations", organizationId, "price-rules"];
  const loyaltyKey = ["organizations", organizationId, "loyalty-tiers"];
  const tenantsQuery = useQuery<OrganizationTenantSummary[]>({
    queryKey: ["organizations", organizationId, "tenants"],
    queryFn: () =>
      organizationsApi.tenants<OrganizationTenantSummary>(organizationId),
    enabled: !!organizationId && canManage,
  });
  const menusQuery = useQuery<OrgMenu[]>({
    queryKey: menusKey,
    queryFn: () => organizationsApi.menus<OrgMenu>(organizationId),
    enabled: !!organizationId && canManage,
  });
  const rulesQuery = useQuery<PriceRule[]>({
    queryKey: rulesKey,
    queryFn: () => menuApi.listPriceRulesFor<PriceRule>({ organizationId }),
    enabled: !!organizationId && canManage,
  });
  const loyaltyTiersQuery = useQuery<CustomerLoyaltyTier[]>({
    queryKey: loyaltyKey,
    queryFn: () =>
      organizationsApi.loyaltyTiers<CustomerLoyaltyTier>(organizationId),
    enabled: !!organizationId && canManage,
  });
  const tenants = tenantsQuery.data ?? [];
  const menus = menusQuery.data ?? [];
  const rules = rulesQuery.data ?? [];
  const loyaltyTiers = loyaltyTiersQuery.data ?? [];
  const organizationDataQueries = [
    tenantsQuery,
    menusQuery,
    rulesQuery,
    loyaltyTiersQuery,
  ];
  const organizationDataFailed = organizationDataQueries.some(
    (query) => query.isError && !query.data,
  );
  const organizationDataStale = organizationDataQueries.some(
    (query) => query.isError && Boolean(query.data),
  );
  const retryOrganizationData = () => {
    for (const query of organizationDataQueries) {
      if (query.isError) void query.refetch();
    }
  };

  const {
    menuName,
    menuSkus,
    menuPublished,
    menuDefault,
    ruleSku,
    rulePrice,
    loyaltyName,
    loyaltyMode,
    loyaltyValue,
    setField,
    resetMenu,
    resetRule,
    resetLoyalty,
  } = useOrganizationDefaultsFormState();

  const createMenu = useMutation({
    mutationFn: () =>
      organizationsApi.createMenu<OrgMenu>(organizationId, {
        name: menuName.trim(),
        status: menuPublished ? "PUBLISHED" : "DRAFT",
        isDefault: menuDefault,
        items: menuSkus
          .split(/[,\n]/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((itemSku, index) => ({ itemSku, sortOrder: index })),
      }),
    onSuccess: async () => {
      resetMenu();
      await queryClient.invalidateQueries({ queryKey: menusKey });
      notifySuccess("Organization menu created");
    },
    onError: (error) =>
      notifyError(error, "Failed to create organization menu"),
  });
  const toggleMenu = useMutation({
    mutationFn: ({
      menuId,
      status,
    }: {
      menuId: string;
      status: "DRAFT" | "PUBLISHED";
    }) =>
      organizationsApi.updateMenu<OrgMenu>(organizationId, menuId, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menusKey }),
    onError: (error) =>
      notifyError(error, "Failed to update organization menu"),
  });
  const deleteMenu = useMutation({
    mutationFn: (menuId: string) =>
      organizationsApi.removeMenu(organizationId, menuId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menusKey }),
    onError: (error) =>
      notifyError(error, "Failed to delete organization menu"),
  });
  const createRule = useMutation({
    mutationFn: () =>
      menuApi.createPriceRule<PriceRule>({
        organizationId,
        menuItemSku: ruleSku.trim(),
        price: Number(rulePrice),
        priority: 0,
      }),
    onSuccess: async () => {
      resetRule();
      await queryClient.invalidateQueries({ queryKey: rulesKey });
      notifySuccess("Organization price rule created");
    },
    onError: (error) =>
      notifyError(error, "Failed to create organization price rule"),
  });
  const deleteRule = useMutation({
    mutationFn: (id: string) => menuApi.removePriceRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rulesKey }),
    onError: (error) =>
      notifyError(error, "Failed to remove organization price rule"),
  });
  const createLoyaltyTier = useMutation({
    mutationFn: () =>
      organizationsApi.createLoyaltyTier<CustomerLoyaltyTier>(organizationId, {
        name: loyaltyName.trim(),
        ...(loyaltyMode === "PERCENT"
          ? { discountPercent: Number(loyaltyValue) }
          : { discountFixed: Number(loyaltyValue) }),
      }),
    onSuccess: async () => {
      resetLoyalty();
      await queryClient.invalidateQueries({ queryKey: loyaltyKey });
      notifySuccess("Organization loyalty tier created");
    },
    onError: (error) =>
      notifyError(error, "Failed to create organization loyalty tier"),
  });
  const deleteLoyaltyTier = useMutation({
    mutationFn: (id: string) =>
      organizationsApi.removeLoyaltyTier(organizationId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: loyaltyKey }),
    onError: (error) =>
      notifyError(error, "Failed to remove organization loyalty tier"),
  });

  if (!canManage)
    return (
      <section className="rounded-lg border border-border p-4">
        <h2 className="font-semibold text-text-primary">
          Organization defaults
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          You need the organization:manage permission to view or change
          cross-tenant menu and pricing defaults.
        </p>
      </section>
    );
  if (membershipsQuery.isError && !membershipsQuery.data)
    return (
      <QueryErrorState
        title="Unable to load organizations"
        description="Organization memberships could not be loaded. Retry before managing organization defaults."
        onRetry={() => void membershipsQuery.refetch()}
        isRetrying={membershipsQuery.isFetching}
      />
    );
  if (!memberships.length)
    return (
      <section>
        <h2 className="font-semibold text-text-primary">
          Organization defaults
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          This tenant is not linked to an organization you manage.
        </p>
      </section>
    );

  return (
    <section className="space-y-5">
      {membershipsQuery.isError && membershipsQuery.data ? (
        <StaleDataBanner
          message="Organization memberships could not be refreshed. Showing cached memberships."
          onRetry={() => void membershipsQuery.refetch()}
          isRetrying={membershipsQuery.isFetching}
        />
      ) : null}
      {organizationDataFailed ? (
        <QueryErrorState
          title="Unable to load organization defaults"
          description="One or more organization menu, pricing, loyalty, or tenant datasets failed to load. Retry before changing defaults."
          onRetry={retryOrganizationData}
          isRetrying={organizationDataQueries.some((query) => query.isFetching)}
        />
      ) : null}
      {organizationDataStale ? (
        <StaleDataBanner
          message="Some organization defaults could not be refreshed. Showing cached values; changes are disabled until refreshed."
          onRetry={retryOrganizationData}
          isRetrying={organizationDataQueries.some((query) => query.isFetching)}
        />
      ) : null}
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Organization defaults
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          HQ-level menus, SKU prices, and loyalty tiers are inherited only when
          no more-specific tenant rule applies.
        </p>
      </div>
      <fieldset
        disabled={organizationDataFailed || organizationDataStale}
        className="contents"
      >
        {memberships.length > 1 && (
          <Select
            label="Organization"
            value={organizationId}
            onChange={setSelectedOrgId}
            containerClassName="max-w-sm"
            options={memberships.map((entry) => ({
              value: entry.organizationId || entry.organization.id,
              label: entry.organization.name,
            }))}
          />
        )}
        <p className="text-xs text-text-secondary">
          {organization?.name ?? "Organization"} · {tenants.length} member
          tenant(s)
        </p>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <OrganizationMenuPanel
            menuName={menuName}
            menuSkus={menuSkus}
            menuDefault={menuDefault}
            menuPublished={menuPublished}
            menus={menus}
            creating={createMenu.isPending}
            onFieldChange={(field, value) => setField(field, value)}
            onCreate={() => createMenu.mutate()}
            onToggle={(menu) =>
              toggleMenu.mutate({
                menuId: menu.id,
                status: menu.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
              })
            }
            onDelete={(id) => deleteMenu.mutate(id)}
          />
          <OrganizationPriceRulesPanel
            ruleSku={ruleSku}
            rulePrice={rulePrice}
            rules={rules}
            creating={createRule.isPending}
            onSkuChange={(value) => setField("ruleSku", value)}
            onPriceChange={(value) => setField("rulePrice", value)}
            onCreate={() => createRule.mutate()}
            onDelete={(id) => deleteRule.mutate(id)}
          />
          <OrganizationLoyaltyPanel
            loyaltyName={loyaltyName}
            loyaltyMode={loyaltyMode}
            loyaltyValue={loyaltyValue}
            tiers={loyaltyTiers}
            creating={createLoyaltyTier.isPending}
            onNameChange={(value) => setField("loyaltyName", value)}
            onModeChange={(value) => setField("loyaltyMode", value)}
            onValueChange={(value) => setField("loyaltyValue", value)}
            onCreate={() => createLoyaltyTier.mutate()}
            onDelete={(id) => deleteLoyaltyTier.mutate(id)}
          />
        </div>
      </fieldset>
    </section>
  );
};
