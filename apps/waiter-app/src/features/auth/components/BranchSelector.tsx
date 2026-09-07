import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { AvailableMembership } from "@pos/types";

interface Props {
  branches: AvailableMembership["branches"];
  onSelect: (branchId: string) => void;
  onBack: () => void;
}
export const BranchSelector = ({ branches, onSelect, onBack }: Props) => {
  const [selected, setSelected] = useState("");
  const confirm = () => onSelect(selected);
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary mb-4">
        Which branch today?
      </p>
      {branches.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setSelected(b.id)}
          className={`w-full text-left px-4 py-4 rounded-2xl border-2 flex items-center justify-between ${selected === b.id ? "border-primary bg-primary-surface" : "border-border"}`}
        >
          <div>
            <p className="font-semibold text-text-primary">{b.name}</p>
            <p className="text-xs text-text-disabled mt-0.5">{b.address}</p>
          </div>
          {selected === b.id && (
            <CheckCircle2 className="w-5 h-5 text-primary" />
          )}
        </button>
      ))}
      <button
        type="button"
        onClick={confirm}
        disabled={!selected}
        className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl text-sm disabled:opacity-60"
      >
        Start Shift
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full py-2 text-text-disabled text-sm"
      >
        ← Back
      </button>
    </div>
  );
};
