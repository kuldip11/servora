import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, toast } from "@pos/ui";
import type { AvailableMembershipDto as AvailableMembership } from "@pos/api-client";
export const BranchSelector = ({
  branches,
  onSelect,
  onBack,
}: {
  branches: AvailableMembership["branches"];
  onSelect: (id: string) => void;
  onBack: () => void;
}) => {
  const [selected, setSelected] = useState("");
  function confirm() {
    if (!selected) {
      toast({ title: "Please select a branch", tone: "danger" });
      return;
    }
    onSelect(selected);
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary text-center mb-4">
        Select the branch for this kitchen
      </p>
      {branches.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setSelected(b.id)}
          className={`w-full text-left px-4 py-3 rounded-xl border-2 flex items-center justify-between ${selected === b.id ? "border-primary bg-primary-surface" : "border-border bg-surface"}`}
        >
          <div>
            <p className="font-semibold text-text-primary">{b.name}</p>
            <p className="text-xs text-text-secondary">{b.address}</p>
          </div>
          {selected === b.id && (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          )}
        </button>
      ))}
      <Button
        type="button"
        onClick={confirm}
        disabled={!selected}
        className="w-full"
      >
        Enter Kitchen
      </Button>
      <Button type="button" variant="ghost" onClick={onBack} className="w-full">
        ← Back
      </Button>
    </div>
  );
};
