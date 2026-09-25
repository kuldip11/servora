import { useMemo, useState } from "react";
import { QueryErrorState, Select, StaleDataBanner } from "@pos/ui";
import { usePermissions } from "@/shared/auth/permissions";
import { useOrganizationDefaultsFormState } from "@/features/menu/hooks/useOrganizationDefaultsFormState";
import {
  useCreateOrganizationLoyaltyTier,
  useCreateOrganizationMenu,
  useCreateOrganizationPriceRule,
  useDeleteOrganizationLoyaltyTier,
  useDeleteOrganizationMenu,
  useDeleteOrganizationPriceRule,
  useManagedOrganizations,
  useOrganizationLoyaltyTiers,
  useOrganizationMenus,
  useOrganizationPriceRules,
  useOrganizationTenants,
  useUpdateOrganizationMenu,
} from "@/features/menu/hooks/useOrganizationManagement";

import { OrganizationMenuPanel } from "@/features/menu/components/organization-management/OrganizationMenuPanel";
import { OrganizationPriceRulesPanel } from "@/features/menu/components/organization-management/OrganizationPriceRulesPanel";
import { OrganizationLoyaltyPanel } from "@/features/menu/components/organization-management/OrganizationLoyaltyPanel";
import type {
  OrgMenu,
  OrganizationSummary,
} from "@/features/menu/components/organization-management/types";

export const OrganizationManagementSection = () => {
  const { has } = usePermissions();
  const canManage = has("organization:manage");
  const organizationsQuery = useManagedOrganizations(canManage);
  const organizations = organizationsQuery.data ?? [];
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const organizationId = selectedOrgId || organizations[0]?.id || "";
  const organization = useMemo(
    () => organizations.find((entry) => entry.id === organizationId),
    [organizations, organizationId],
  );
  const tenantsQuery = useOrganizationTenants(organizationId, canManage);
  const menusQuery = useOrganizationMenus(organizationId, canManage);
  const rulesQuery = useOrganizationPriceRules(organizationId, canManage);
  const loyaltyTiersQuery = useOrganizationLoyaltyTiers(
    organizationId,
    canManage,
  );
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

  const createMenu = useCreateOrganizationMenu(organizationId);
  const toggleMenu = useUpdateOrganizationMenu(organizationId);
  const deleteMenu = useDeleteOrganizationMenu(organizationId);
  const createRule = useCreateOrganizationPriceRule(organizationId);
  const deleteRule = useDeleteOrganizationPriceRule(organizationId);
  const createLoyaltyTier = useCreateOrganizationLoyaltyTier(organizationId);
  const deleteLoyaltyTier = useDeleteOrganizationLoyaltyTier(organizationId);

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
  if (organizationsQuery.isError && !organizationsQuery.data)
    return (
      <QueryErrorState
        title="Unable to load organizations"
        description="Organizations could not be loaded. Retry before managing organization defaults."
        onRetry={() => void organizationsQuery.refetch()}
        isRetrying={organizationsQuery.isFetching}
      />
    );
  if (!organizations.length)
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
      {organizationsQuery.isError && organizationsQuery.data ? (
        <StaleDataBanner
          message="Organizations could not be refreshed. Showing cached organizations."
          onRetry={() => void organizationsQuery.refetch()}
          isRetrying={organizationsQuery.isFetching}
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
        {organizations.length > 1 && (
          <Select
            label="Organization"
            value={organizationId}
            onChange={setSelectedOrgId}
            containerClassName="max-w-sm"
            options={organizations.map((entry) => ({
              value: entry.id,
              label: entry.name,
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
            onCreate={() =>
              createMenu.mutate(
                {
                  name: menuName.trim(),
                  status: menuPublished ? "PUBLISHED" : "DRAFT",
                  isDefault: menuDefault,
                  items: menuSkus
                    .split(/[,\n]/)
                    .map((value) => value.trim())
                    .filter(Boolean)
                    .map((itemSku, index) => ({ itemSku, sortOrder: index })),
                },
                { onSuccess: resetMenu },
              )
            }
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
            onCreate={() =>
              createRule.mutate(
                { menuItemSku: ruleSku.trim(), price: Number(rulePrice) },
                { onSuccess: resetRule },
              )
            }
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
            onCreate={() =>
              createLoyaltyTier.mutate(
                {
                  name: loyaltyName.trim(),
                  ...(loyaltyMode === "PERCENT"
                    ? { discountPercent: Number(loyaltyValue) }
                    : { discountFixed: Number(loyaltyValue) }),
                },
                { onSuccess: resetLoyalty },
              )
            }
            onDelete={(id) => deleteLoyaltyTier.mutate(id)}
          />
        </div>
      </fieldset>
    </section>
  );
};
