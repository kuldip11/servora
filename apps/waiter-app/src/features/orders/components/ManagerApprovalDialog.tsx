import { useState } from "react";
import { Button, Input, Modal, toast } from "@pos/ui";
import { createApprovalsApi, extractApiError } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const approvalsApi = createApprovalsApi(apiClient);

export interface ManagerApprovalRequest {
  action: "void" | "comp";
  itemId: string;
  reason: { cancellationReasonId?: string; reason?: string };
}

export const requestManagerApproval = async ({
  orderId,
  request,
  managerEmail,
  password,
}: {
  orderId: string;
  request: ManagerApprovalRequest;
  managerEmail: string;
  password: string;
}): Promise<string> => {
  const response = await approvalsApi.requestManagerApproval({
    actionType: request.action === "void" ? "VOID" : "COMP",
    orderId,
    orderItemId: request.itemId,
    managerEmail: managerEmail.trim(),
    password,
  });
  return response.token;
};

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
  const [loading, setLoading] = useState(false);

  async function approve() {
    if (!request) return;
    setLoading(true);
    try {
      const token = await requestManagerApproval({
        orderId,
        request,
        managerEmail,
        password,
      });
      onApproved(token);
      setPassword("");
    } catch (error) {
      toast({ title: extractApiError(error), tone: "danger" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manager approval required">
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          This adjustment exceeds the configured threshold. An authorized
          manager must approve it.
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
            loading={loading}
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
