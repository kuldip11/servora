import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, toast } from "@pos/ui";
import { createApprovalsApi } from "@pos/api-client";
import {
  DIFFERENTIATORS_INPUT_CLASS,
  DIFFERENTIATORS_SELECT_CLASS,
} from "@/features/differentiators/constants";
import { apiClient, extractApiError } from "@/shared/lib/api-client";

const approvalsApi = createApprovalsApi(apiClient);

type ApprovalAction = "VOID" | "COMP";

export const ApprovalRulesPanel = () => {
  const [action, setAction] = useState<ApprovalAction>("COMP");
  const [threshold, setThreshold] = useState("500");
  const [requiresRole, setRequiresRole] = useState("Manager");
  const saveMutation = useMutation({
    mutationFn: () =>
      approvalsApi.setThreshold(action, {
        thresholdAmount: Number(threshold),
        requiresRole: requiresRole.trim(),
      }),
    onSuccess: () =>
      toast({
        title: `${action === "COMP" ? "Comp" : "Void"} threshold saved`,
        tone: "success",
      }),
    onError: (error) =>
      toast({ title: extractApiError(error), tone: "danger" }),
  });

  return (
    <Card>
      <h2 className="font-semibold">Manager approval threshold</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Void/comp actions above the configured amount require a short-lived,
        single-use approval from the selected role.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-4 md:items-end">
        <label className="text-sm font-medium text-text-primary">
          Action
          <select
            className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
            value={action}
            onChange={(event) =>
              setAction(event.target.value as ApprovalAction)
            }
          >
            <option value="COMP">Comp</option>
            <option value="VOID">Void</option>
          </select>
        </label>
        <label className="text-sm font-medium text-text-primary">
          Threshold amount
          <input
            className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-text-primary">
          Required role
          <input
            className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
            value={requiresRole}
            onChange={(event) => setRequiresRole(event.target.value)}
            placeholder="Manager"
          />
        </label>
        <Button
          loading={saveMutation.isPending}
          disabled={!requiresRole.trim() || Number(threshold) < 0}
          onClick={() => saveMutation.mutate()}
        >
          Save threshold
        </Button>
      </div>
    </Card>
  );
};
