import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, toast } from "@pos/ui";
import { createOrdersApi } from "@pos/api-client";
import { DIFFERENTIATORS_INPUT_CLASS } from "@/features/differentiators/constants";
import { apiClient, extractApiError } from "@/shared/lib/api-client";

const ordersApi = createOrdersApi(apiClient);

export const OrderExplainPanel = () => {
  const [orderId, setOrderId] = useState("");
  const explainMutation = useMutation({
    mutationFn: (id: string) => ordersApi.explain<Record<string, unknown>>(id),
    onError: (error) =>
      toast({ title: extractApiError(error), tone: "danger" }),
  });

  return (
    <Card>
      <h2 className="font-semibold">Reconstruct an order</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Uses the order's immutable resolution timestamp and fire-time resolver
        snapshots.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          className={`min-w-0 flex-1 ${DIFFERENTIATORS_INPUT_CLASS}`}
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          placeholder="Order UUID"
        />
        <Button
          loading={explainMutation.isPending}
          disabled={!orderId.trim()}
          onClick={() => explainMutation.mutate(orderId.trim())}
        >
          Explain
        </Button>
      </div>
      {explainMutation.data && (
        <pre className="mt-4 max-h-[32rem] overflow-auto rounded-lg bg-surface-secondary p-4 text-xs">
          {JSON.stringify(explainMutation.data, null, 2)}
        </pre>
      )}
    </Card>
  );
};
