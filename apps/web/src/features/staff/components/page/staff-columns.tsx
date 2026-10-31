import type { Column, StatusTone } from "@pos/ui";
import { IconButton, StatusBadge } from "@pos/ui";
import { Pencil, Trash2, UserCheck, UserX } from "lucide-react";
import type { StaffRow } from "@/features/staff/services/staff.service";

const STATUS_TONES: Record<string, StatusTone> = {
  ACTIVE: "success",
  INACTIVE: "neutral",
  SUSPENDED: "danger",
};

export const buildStaffColumns = ({
  canUpdate,
  canDeactivate,
  onEdit,
  onStatusChange,
  onRemove,
}: {
  canUpdate: boolean;
  canDeactivate: boolean;
  onEdit: (member: StaffRow) => void;
  onStatusChange: (id: string, status: "ACTIVE" | "INACTIVE") => void;
  onRemove: (member: StaffRow) => void;
}): Column<StaffRow>[] => [
  {
    id: "name",
    header: "Name",
    sortable: true,
    sortValue: (member) => `${member.firstName ?? ""} ${member.lastName ?? ""}`,
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
    cell: (member) => (
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
        {canUpdate && (
          <IconButton
            icon={Pencil}
            size="sm"
            aria-label="Edit staff member"
            title="Edit staff member"
            onClick={() => onEdit(member)}
          />
        )}
        {canUpdate && (
          <IconButton
            icon={member.status === "ACTIVE" ? UserX : UserCheck}
            size="sm"
            aria-label={member.status === "ACTIVE" ? "Deactivate" : "Activate"}
            title={member.status === "ACTIVE" ? "Deactivate" : "Activate"}
            onClick={() =>
              onStatusChange(
                member.id,
                member.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
              )
            }
          />
        )}
        {canDeactivate && (
          <IconButton
            icon={Trash2}
            size="sm"
            aria-label="Remove staff member"
            onClick={() => onRemove(member)}
          />
        )}
      </div>
    ),
  },
];
