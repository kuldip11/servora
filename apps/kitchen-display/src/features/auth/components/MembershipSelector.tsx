import { Building2 } from "lucide-react";
import type { AvailableMembershipDto as AvailableMembership } from "@pos/api-client";

export const MembershipSelector = ({
  memberships,
  onSelect,
}: {
  memberships: AvailableMembership[];
  onSelect: (id: string) => void;
}) => {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary mb-4">
        Choose your business
      </p>
      {memberships.map((m) => (
        <button
          key={m.membershipId}
          type="button"
          onClick={() => onSelect(m.membershipId)}
          className="w-full text-left px-4 py-4 rounded-2xl border-2 border-border flex items-center gap-3 hover:border-primary"
        >
          <Building2 className="w-5 h-5 text-primary" />
          <span>
            <span className="block font-semibold text-text-primary">
              {m.tenant.name}
            </span>
            <span className="text-xs text-text-secondary">
              {m.roles.map((r) => r.name).join(", ")}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
};
