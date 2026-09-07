import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input } from "@pos/ui";
import type { CustomerLoyaltyTier, PriceRule } from "@pos/types";
import { createMenuApi, createOrganizationsApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const organizationsApi = createOrganizationsApi(apiClient);
const menuApi = createMenuApi(apiClient);
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { usePermissions } from "@/shared/auth/permissions";
import { useOrganizationDefaultsFormState } from "@/features/menu/hooks/useOrganizationDefaultsFormState";

interface OrgMembership {
  organizationId: string;
  organization: { id: string; name: string };
}
interface OrgMenu {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED";
  isDefault: boolean;
  organizationItems: Array<{
    id: string;
    itemSku: string;
    categoryName: string | null;
  }>;
}
interface OrganizationTenantSummary {
  id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
}

export const OrganizationManagementSection = () => {
  const { has } = usePermissions();
  const canManage = has("organization:manage");
  const { data: memberships = [] } = useQuery<OrgMembership[]>({
    queryKey: ["organizations"],
    queryFn: () => organizationsApi.list<OrgMembership>(),
    enabled: canManage,
  });
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
  const { data: tenants = [] } = useQuery<OrganizationTenantSummary[]>({
    queryKey: ["organizations", organizationId, "tenants"],
    queryFn: () =>
      organizationsApi.tenants<OrganizationTenantSummary>(organizationId),
    enabled: !!organizationId && canManage,
  });
  const { data: menus = [] } = useQuery<OrgMenu[]>({
    queryKey: menusKey,
    queryFn: () => organizationsApi.menus<OrgMenu>(organizationId),
    enabled: !!organizationId && canManage,
  });
  const { data: rules = [] } = useQuery<PriceRule[]>({
    queryKey: rulesKey,
    queryFn: () => menuApi.listPriceRulesFor<PriceRule>({ organizationId }),
    enabled: !!organizationId && canManage,
  });
  const { data: loyaltyTiers = [] } = useQuery<CustomerLoyaltyTier[]>({
    queryKey: loyaltyKey,
    queryFn: () =>
      organizationsApi.loyaltyTiers<CustomerLoyaltyTier>(organizationId),
    enabled: !!organizationId && canManage,
  });
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
  });
  const deleteMenu = useMutation({
    mutationFn: (menuId: string) =>
      organizationsApi.removeMenu(organizationId, menuId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: menusKey }),
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
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Organization defaults
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          HQ-level menus, SKU prices, and loyalty tiers are inherited only when
          no more-specific tenant rule applies.
        </p>
      </div>
      {memberships.length > 1 && (
        <label className="block max-w-sm text-sm font-medium text-text-primary">
          Organization
          <select
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2"
            value={organizationId}
            onChange={(event) => setSelectedOrgId(event.target.value)}
          >
            {memberships.map((entry) => (
              <option
                key={entry.organizationId || entry.organization.id}
                value={entry.organizationId || entry.organization.id}
              >
                {entry.organization.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <p className="text-xs text-text-secondary">
        {organization?.name ?? "Organization"} · {tenants.length} member
        tenant(s)
      </p>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Inherited menu
          </h3>
          <Input
            label="Menu name"
            value={menuName}
            onChange={(event) => setField("menuName", event.target.value)}
          />
          <label className="block text-sm font-medium text-text-primary">
            Tenant item SKUs
            <textarea
              className="mt-1.5 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              value={menuSkus}
              onChange={(event) => setField("menuSkus", event.target.value)}
              placeholder="PIZZA-MARGHERITA, DRINK-COLA"
            />
          </label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={menuDefault}
                onChange={(event) =>
                  setField("menuDefault", event.target.checked)
                }
              />
              Default
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={menuPublished}
                onChange={(event) =>
                  setField("menuPublished", event.target.checked)
                }
              />
              Publish now
            </label>
          </div>
          <Button
            type="button"
            disabled={!menuName.trim() || !menuSkus.trim()}
            loading={createMenu.isPending}
            onClick={() => createMenu.mutate()}
          >
            Create organization menu
          </Button>
          {menus.map((menu) => (
            <div
              key={menu.id}
              className="rounded bg-surface-secondary p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">
                  {menu.name} · {menu.status}
                  {menu.isDefault ? " · Default" : ""}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-primary"
                    onClick={() =>
                      toggleMenu.mutate({
                        menuId: menu.id,
                        status:
                          menu.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                      })
                    }
                  >
                    {menu.status === "PUBLISHED" ? "Draft" : "Publish"}
                  </button>
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() => deleteMenu.mutate(menu.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-text-secondary">
                {menu.organizationItems
                  .map((item) => item.itemSku)
                  .join(", ") || "No SKUs"}
              </p>
            </div>
          ))}
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Inherited SKU prices
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Menu item SKU"
              value={ruleSku}
              onChange={(event) => setField("ruleSku", event.target.value)}
            />
            <Input
              label="Price"
              type="number"
              min="0"
              step="0.01"
              value={rulePrice}
              onChange={(event) => setField("rulePrice", event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={!ruleSku.trim() || !rulePrice}
            loading={createRule.isPending}
            onClick={() => createRule.mutate()}
          >
            Create organization price
          </Button>
          {rules
            .filter((rule) => !rule.isPerCover)
            .map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-sm"
              >
                <span>
                  {rule.menuItemSku ?? "General"} · ₹
                  {Number(rule.price ?? 0).toFixed(2)}
                </span>
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => deleteRule.mutate(rule.id)}
                >
                  Remove
                </button>
              </div>
            ))}
        </div>
        <div className="space-y-3 rounded-lg border border-border p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Organization loyalty tiers
          </h3>
          <p className="text-xs text-text-secondary">
            Customers linked by the shared organization identity receive these
            tiers at every sibling tenant. Tenant-local tiers remain local and
            take no schema migration.
          </p>
          <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end">
            <Input
              label="Tier name"
              value={loyaltyName}
              onChange={(event) => setField("loyaltyName", event.target.value)}
            />
            <label className="text-sm font-medium text-text-primary">
              Discount type
              <select
                className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2"
                value={loyaltyMode}
                onChange={(event) =>
                  setField(
                    "loyaltyMode",
                    event.target.value as "PERCENT" | "FIXED",
                  )
                }
              >
                <option value="PERCENT">Percent</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <Input
              label={loyaltyMode === "PERCENT" ? "Percent" : "Amount"}
              type="number"
              min="0.01"
              max={loyaltyMode === "PERCENT" ? "100" : undefined}
              step="0.01"
              value={loyaltyValue}
              onChange={(event) => setField("loyaltyValue", event.target.value)}
            />
            <Button
              type="button"
              disabled={
                !loyaltyName.trim() ||
                Number(loyaltyValue) <= 0 ||
                (loyaltyMode === "PERCENT" && Number(loyaltyValue) > 100)
              }
              loading={createLoyaltyTier.isPending}
              onClick={() => createLoyaltyTier.mutate()}
            >
              Create tier
            </Button>
          </div>
          {loyaltyTiers.map((tier) => (
            <div
              key={tier.id}
              className="flex items-center justify-between rounded bg-surface-secondary px-3 py-2 text-sm"
            >
              <span className="text-text-primary">
                {tier.name} ·{" "}
                {tier.discountPercent !== null
                  ? `${Number(tier.discountPercent)}% off`
                  : `₹${Number(tier.discountFixed ?? 0).toFixed(2)} off`}{" "}
                · organization-wide
              </span>
              <button
                type="button"
                className="text-danger"
                onClick={() => deleteLoyaltyTier.mutate(tier.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
