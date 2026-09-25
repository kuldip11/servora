import { usePermissions } from "@/shared/auth/permissions";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Modal,
  Page,
  PageHeader,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { useBranches } from "@/features/branches";
import { useStaff } from "@/features/staff/hooks/useStaff";
import { useRoles } from "@/features/staff/hooks/useRoles";
import { useAddStaff } from "@/features/staff/hooks/useAddStaff";
import { useDeleteStaff } from "@/features/staff/hooks/useDeleteStaff";
import { useUpdateStaffStatus } from "@/features/staff/hooks/useUpdateStaffStatus";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import type { StaffRow } from "@/features/staff/services/staff.service";
import { useUpdateStaff } from "@/features/staff/hooks/useUpdateStaff";
import { AddStaffForm } from "@/features/staff/components/forms/AddStaffForm";
import { EditStaffForm } from "@/features/staff/components/forms/EditStaffForm";
import { RoleManager } from "@/features/staff/components/roles/RoleManager";
import { useStaffPageState } from "@/features/staff/hooks/useStaffPageState";
import { extractApiError } from "@/shared/lib/api-client";
import { buildStaffColumns } from "@/features/staff/components/page/staff-columns";
import { StaffTeamContent } from "@/features/staff/components/page/StaffTeamContent";

export const StaffPage = () => {
  const { has } = usePermissions();
  const {
    showAdd,
    editing,
    page,
    search,
    statusFilter,
    activeTab,
    pageSize,
    setShowAdd,
    setEditing,
    setPage,
    setSearch,
    setStatusFilter,
    setActiveTab,
    setPageSize,
    clearFilters,
  } = useStaffPageState();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [search]);

  const staffQuery = useStaff({
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter,
  });
  const staffResult = staffQuery.data;
  const staff = staffResult?.items ?? [];
  const staffTotal = staffResult?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(staffTotal / pageSize));
  const rolesQuery = useRoles();
  const branchesQuery = useBranches();
  const rolesData = rolesQuery.data;
  const branches = branchesQuery.data;

  const addMutation = useAddStaff();
  const deleteMutation = useDeleteStaff();
  const updateStatusMutation = useUpdateStaffStatus();
  const updateMutation = useUpdateStaff();

  const columns = buildStaffColumns({
    canUpdate: has("staff:update"),
    canDeactivate: has("staff:deactivate"),
    onEdit: setEditing,
    onStatusChange: (id, status) => updateStatusMutation.mutate({ id, status }),
    onRemove: (member) => {
      if (confirm("Remove this staff member?"))
        deleteMutation.mutate(member.id);
    },
  });

  return (
    <Page>
      <PageHeader
        title="Staff"
        description={
          staffQuery.isError && staffResult === undefined
            ? "Team data is currently unavailable"
            : `${staffTotal.toLocaleString()} team members`
        }
        actions={
          activeTab === "team" &&
          has("staff:create") && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" />
              Add Staff
            </Button>
          )
        }
      />

      {staffQuery.isError && staffResult !== undefined ? (
        <StaleDataBanner
          message="Staff refresh failed — showing the latest team data available."
          isRetrying={staffQuery.isFetching}
          onRetry={() => void staffQuery.refetch()}
        />
      ) : null}

      <div className="flex gap-1 border-b border-border">
        {(["team", "roles"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold capitalize ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
          >
            {tab === "team" ? "Team" : "Roles & permissions"}
          </button>
        ))}
      </div>

      {activeTab === "team" ? (
        <StaffTeamContent
          search={search}
          statusFilter={statusFilter}
          page={page}
          pageCount={pageCount}
          total={staffTotal}
          pageSize={pageSize}
          staff={staff}
          columns={columns}
          loading={staffQuery.isLoading}
          errorMessage={
            staffQuery.isError && staffResult === undefined
              ? extractApiError(
                  staffQuery.error,
                  "Staff could not be loaded. Retry before relying on the team list.",
                )
              : undefined
          }
          retrying={staffQuery.isFetching}
          canCreate={has("staff:create")}
          onSearch={setSearch}
          onStatusFilter={setStatusFilter}
          onClearFilters={clearFilters}
          onAdd={() => setShowAdd(true)}
          onRetry={() => void staffQuery.refetch()}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}

      {activeTab === "roles" &&
      rolesQuery.isError &&
      rolesData === undefined ? (
        <QueryErrorState
          title="Unable to load roles"
          description={extractApiError(
            rolesQuery.error,
            "Roles and permissions could not be loaded.",
          )}
          isRetrying={rolesQuery.isFetching}
          onRetry={() => void rolesQuery.refetch()}
        />
      ) : activeTab === "roles" ? (
        <RoleManager
          roles={rolesData ?? []}
          canManage={has("roles:create")}
          canManagePermissions={has("roles:assign_permissions")}
        />
      ) : null}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Staff Member"
      >
        <AddStaffForm
          roles={rolesData ?? []}
          branches={branches ?? []}
          loading={addMutation.isPending}
          onCancel={() => setShowAdd(false)}
          onSubmit={async (values) => {
            await addMutation.mutateAsync(values);
            setShowAdd(false);
          }}
        />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Staff Member"
      >
        {editing && (
          <EditStaffForm
            member={editing}
            roles={rolesData ?? []}
            branches={branches ?? []}
            onCancel={() => setEditing(null)}
            onSubmit={async (input) => {
              await updateMutation.mutateAsync({ id: editing.id, input });
              notifySuccess("Staff member updated");
              setEditing(null);
            }}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </Page>
  );
};
