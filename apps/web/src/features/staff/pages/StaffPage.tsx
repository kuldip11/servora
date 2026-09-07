import { usePermissions } from "@/shared/auth/permissions";
import { useEffect, useState } from "react";
import { Plus, Users, Trash2, UserCheck, UserX, Pencil } from "lucide-react";
import {
  Button,
  Card,
  Modal,
  IconButton,
  StatusBadge,
  Page,
  PageHeader,
  Pagination,
  SearchInput,
  SelectMenu,
  FilterBar,
  Table,
  type Column,
  type StatusTone,
} from "@pos/ui";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useStaff } from "@/features/staff/hooks/useStaff";
import { useRoles } from "@/features/staff/hooks/useRoles";
import { useAddStaff } from "@/features/staff/hooks/useAddStaff";
import { useDeleteStaff } from "@/features/staff/hooks/useDeleteStaff";
import { useUpdateStaffStatus } from "@/features/staff/hooks/useUpdateStaffStatus";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import {
  staffService,
  type StaffRow,
} from "@/features/staff/services/staff.service";
import { staffKeys } from "@/features/staff/query-keys";
import { AddStaffForm } from "@/features/staff/components/forms/AddStaffForm";
import { EditStaffForm } from "@/features/staff/components/forms/EditStaffForm";
import { RoleManager } from "@/features/staff/components/roles/RoleManager";
import { useStaffPageState } from "@/features/staff/hooks/useStaffPageState";

const STATUS_TONES: Record<string, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
};

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

  const { data: staffResult, isLoading } = useStaff({
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: statusFilter,
  });
  const staff = staffResult?.items ?? [];
  const staffTotal = staffResult?.pagination.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(staffTotal / pageSize));
  const { data: rolesData } = useRoles();
  const { data: branches } = useBranches();

  const addMutation = useAddStaff();
  const deleteMutation = useDeleteStaff();
  const updateStatusMutation = useUpdateStaffStatus();
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: {
        firstName: string;
        lastName: string;
        roleId: string;
        branchIds: string[];
      };
    }) => staffService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.list() });
      notifySuccess("Staff member updated");
      setEditing(null);
    },
    onError: (err) => notifyError(err, "Failed to update staff"),
  });

  const columns: Column<StaffRow>[] = [
    {
      id: "name",
      header: "Name",
      sortable: true,
      sortValue: (member) =>
        `${member.firstName ?? ""} ${member.lastName ?? ""}`,
      cell: (member) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-surface rounded-full flex items-center justify-center text-xs font-semibold text-primary">
            {member.firstName?.[0]}
            {member.lastName?.[0]}
          </div>
          <span className="font-medium text-text-primary">
            {member.firstName} {member.lastName}
          </span>
        </div>
      ),
    },
    {
      id: "email",
      header: "Email",
      cell: (member) => (
        <span className="text-text-secondary">{member.email}</span>
      ),
    },
    {
      id: "branch",
      header: "Branch",
      cell: (member: StaffRow) => (
        <span className="text-text-secondary">
          {member.assignedBranches
            ?.map((branch) => branch.name)
            .filter(Boolean)
            .join(", ") || "—"}
        </span>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (member) =>
        member.roles?.[0]?.name ? (
          <StatusBadge tone="info" dot={false} label={member.roles[0].name} />
        ) : null,
    },
    {
      id: "status",
      header: "Status",
      cell: (member) => (
        <StatusBadge
          tone={STATUS_TONES[member.status] ?? "neutral"}
          label={member.status}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (member) => (
        <div className="flex items-center justify-end gap-1">
          {has("staff:update") && (
            <IconButton
              icon={Pencil}
              size="sm"
              aria-label="Edit staff member"
              title="Edit staff member"
              onClick={() => setEditing(member)}
            />
          )}
          {has("staff:update") &&
            (member.status === "ACTIVE" ? (
              <IconButton
                icon={UserX}
                size="sm"
                aria-label="Deactivate"
                title="Deactivate"
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: member.id,
                    status: "INACTIVE",
                  })
                }
              />
            ) : (
              <IconButton
                icon={UserCheck}
                size="sm"
                aria-label="Activate"
                title="Activate"
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: member.id,
                    status: "ACTIVE",
                  })
                }
              />
            ))}
          {has("staff:deactivate") && (
            <IconButton
              icon={Trash2}
              size="sm"
              aria-label="Remove staff member"
              onClick={() => {
                if (confirm("Remove this staff member?"))
                  deleteMutation.mutate(member.id);
              }}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        title="Staff"
        description={`${staffTotal.toLocaleString()} team members`}
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

      {activeTab === "team" && (
        <Card padding="sm">
          <FilterBar
            onClearAll={search && statusFilter ? clearFilters : undefined}
          >
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search name or email"
              aria-label="Search staff"
              className="w-full sm:w-72"
            />
            <SelectMenu
              aria-label="Filter staff by status"
              valuePrefix="Status"
              value={statusFilter || undefined}
              placeholder="All statuses"
              options={[
                { value: "", label: "All statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "SUSPENDED", label: "Suspended" },
              ]}
              onChange={(value) => setStatusFilter(value ?? "")}
              className="w-44"
            />
          </FilterBar>
        </Card>
      )}

      {activeTab === "team" && (
        <Card padding="none" className="overflow-hidden">
          <Table
            columns={columns}
            data={staff}
            getRowId={(member) => member.id}
            loading={isLoading}
            maxHeight="min(55vh, 36rem)"
            emptyIcon={Users}
            emptyTitle="No staff members"
            emptyDescription="Add your team to get started."
            emptyAction={
              has("staff:create") && (
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="w-4 h-4" /> Add Staff
                </Button>
              )
            }
          />
          <Pagination
            className="border-t border-border p-4"
            page={page}
            pageCount={pageCount}
            totalItems={staffTotal}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </Card>
      )}

      {activeTab === "roles" && (
        <RoleManager
          roles={rolesData ?? []}
          canManage={has("roles:create")}
          canManagePermissions={has("roles:assign_permissions")}
        />
      )}

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
          onSubmit={(values) =>
            addMutation.mutate(values, { onSuccess: () => setShowAdd(false) })
          }
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
            onSubmit={(input) =>
              updateMutation.mutate({ id: editing.id, input })
            }
            loading={updateMutation.isPending}
          />
        )}
      </Modal>
    </Page>
  );
};
