import { useState } from "react";
import { Button, Input, Modal, toast } from "@pos/ui";
import { extractApiError } from "@/shared/lib/api-client";
import { useRequestManagerApproval } from "@/features/orders/hooks/useRequestManagerApproval";

export interface ManagerApprovalRequest {
  action: "void" | "comp";
  itemId: string;
  reason: { cancellationReasonId?: string; reason?: string };
}

export const ManagerApprovalDialog = ({
  open,
  orderId,
  request,
  onClose,
  onApproved,
}: {
  open: boolean;
  orderId: string;
  request: ManagerApprovalRequest | null;
  onClose: () => void;
  onApproved: (token: string) => void;
}) => {
  const [managerEmail, setManagerEmail] = useState("");
  const [password, setPassword] = useState("");
  const approvalMutation = useRequestManagerApproval();

  async function approve() {
    if (!request) return;
    try {
      const response = await approvalMutation.mutateAsync({
        actionType: request.action === "void" ? "VOID" : "COMP",
        orderId,
        orderItemId: request.itemId,
        managerEmail: managerEmail.trim(),
        password,
      });
      onApproved(response.token);
      setPassword("");
    } catch (error) {
      toast({ title: extractApiError(error), tone: "danger" });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manager approval required">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This {request?.action ?? "adjustment"} exceeds the configured approval
          threshold. An authorized manager must approve it.
        </p>
        <Input
          label="Manager email"
          required
          type="email"
          value={managerEmail}
          onChange={(event) => setManagerEmail(event.target.value)}
        />
        <Input
          label="Manager password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={approvalMutation.isPending}
            disabled={!managerEmail.trim() || !password}
            onClick={approve}
          >
            Approve and continue
          </Button>
        </div>
      </div>
    </Modal>
  );
};
