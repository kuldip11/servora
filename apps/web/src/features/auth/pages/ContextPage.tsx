import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { Button, Input, toast } from "@pos/ui";
import type { AvailableMembership, OrganizationSummary } from "@pos/types";

import { extractApiError } from "@/shared/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { getAuthorizedHomePath } from "@/shared/auth/default-route";
import { authService } from "@/features/auth/services/auth.service";
import { activateMembershipContext } from "@/shared/auth/active-context";

export const ContextPage = () => {
  const router = useRouter();
  const { memberships, setContext } = useAuthStore();
  const [items, setItems] = useState<AvailableMembership[]>(memberships);
  const [loading, setLoading] = useState(!memberships.length);
  const [franchiseName, setFranchiseName] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [creatingFranchise, setCreatingFranchise] = useState(false);

  useEffect(() => {
    Promise.all([
      memberships.length
        ? Promise.resolve(memberships)
        : authService.memberships(),
      authService.organizations(),
    ])
      .then(([nextMemberships, nextOrganizations]) => {
        const activeOrganizations = nextOrganizations.filter(
          (item) => item.isActive,
        );
        setItems(nextMemberships);
        setOrganizations(activeOrganizations);
        setOrganizationId(
          (current) => current || activeOrganizations[0]?.id || "",
        );
      })
      .catch(() =>
        toast({ title: "Could not load your organizations", tone: "danger" }),
      )
      .finally(() => setLoading(false));
  }, [memberships]);

  const activate = async (membership: AvailableMembership) => {
    try {
      await activateMembershipContext(membership, items);
      router.navigate({
        to: getAuthorizedHomePath(useAuthStore.getState().user),
      });
    } catch (err: unknown) {
      toast({ title: extractApiError(err), tone: "danger" });
    }
  };

  const createOrganization = async () => {
    const name = organizationName.trim();
    if (!name) return;

    setCreatingOrganization(true);
    try {
      const created = await authService.createOrganization(name);
      setOrganizations((current) => [...current, created.organization]);
      setOrganizationId(created.organization.id);
      setOrganizationName("");
      toast({
        title: "Organization created. You can now create a franchise.",
        tone: "success",
      });
    } catch (err: unknown) {
      toast({ title: extractApiError(err), tone: "danger" });
    } finally {
      setCreatingOrganization(false);
    }
  };

  const createFranchise = async () => {
    const name = franchiseName.trim();
    if (!name || !organizationId) return;

    setCreatingFranchise(true);
    try {
      const created = await authService.createTenant(name, organizationId);
      const next = await authService.memberships();
      const membership = next.find(
        (item) => item.membershipId === created.membershipId,
      );
      if (!membership)
        throw new Error("Created franchise membership not found");
      await activateMembershipContext(membership, next, organizationId);
      toast({
        title: "Franchise created. Add a branch to get started.",
        tone: "success",
      });
      router.navigate({ to: "/branches" });
    } catch (err: unknown) {
      toast({ title: extractApiError(err), tone: "danger" });
    } finally {
      setCreatingFranchise(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-secondary">
        Loading your businesses…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-card p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Choose a franchise
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Select an existing franchise or create your organization and first
            franchise.
          </p>
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            {items.map((membership) => (
              <button
                key={membership.membershipId}
                onClick={() => void activate(membership)}
                className="w-full flex items-center gap-4 p-4 border border-border rounded-lg text-left hover:border-primary transition-colors"
              >
                <Building2 className="w-5 h-5 text-primary" />
                <span className="flex-1">
                  <strong className="block text-text-primary">
                    {membership.tenant.name}
                  </strong>
                  <span className="text-xs text-text-secondary">
                    {membership.roles.map((role) => role.name).join(", ")}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-text-disabled" />
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-5 space-y-4">
          <div className="space-y-3">
            <h2 className="font-semibold text-text-primary">Organization</h2>
            {organizations.length > 0 && (
              <label className="block text-sm font-medium text-text-primary">
                Existing organization
                <select
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary"
                >
                  <option value="">Select organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex items-end gap-2">
              <Input
                label={
                  organizations.length
                    ? "New organization name"
                    : "Organization name"
                }
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                placeholder="My Restaurant Group"
                className="flex-1"
              />
              <Button
                type="button"
                loading={creatingOrganization}
                disabled={!organizationName.trim()}
                onClick={createOrganization}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </div>
            {!organizations.length && (
              <p className="text-xs text-text-secondary">
                Create an organization first. It will be selected automatically
                for your franchise.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <h2 className="font-semibold text-text-primary">
              Create a franchise
            </h2>
            <Input
              label="Franchise name"
              value={franchiseName}
              onChange={(event) => setFranchiseName(event.target.value)}
              placeholder="My Restaurant"
            />
            <Button
              type="button"
              loading={creatingFranchise}
              onClick={createFranchise}
              disabled={!franchiseName.trim() || !organizationId}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create franchise
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
