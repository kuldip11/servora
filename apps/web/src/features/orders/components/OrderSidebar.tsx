import { MapPin, Plus } from "lucide-react";
import { Button, Card } from "@pos/ui";
import type { Order } from "@pos/types";
import { useUpdateOrderStatus } from "@/features/orders/hooks/useUpdateOrderStatus";

type UpdateStatusMutation = ReturnType<typeof useUpdateOrderStatus>;

interface Transition {
  label: string;
  next: string;
}

interface OrderSidebarProps {
  order: Order;
  transitions: Transition[];
  canAddItems: boolean;
  updateStatusMutation: UpdateStatusMutation;
  onAddItems: () => void;
  onCancel: () => void;
}

export const OrderSidebar = ({
  order,
  transitions,
  canAddItems,
  updateStatusMutation,
  onAddItems,
  onCancel,
}: OrderSidebarProps) => (
  <div className="space-y-4">
    <Card>
      <h2 className="text-base font-semibold text-text-primary mb-3">
        Order Info
      </h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4 text-text-disabled" />
          <span className="text-text-secondary">
            Type:{" "}
            <span className="font-medium text-text-primary">
              {order.type?.replace("_", " ")}
            </span>
          </span>
        </div>
        {order.table && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-text-disabled" />
            <span className="text-text-secondary">
              Table:{" "}
              <span className="font-medium text-text-primary">
                {order.table.name}
              </span>
            </span>
          </div>
        )}
        {order.notes && (
          <div className="text-sm">
            <p className="text-text-secondary text-xs mb-1">Notes</p>
            <p className="text-text-primary bg-surface-secondary rounded p-2 text-xs">
              {order.notes}
            </p>
          </div>
        )}
      </div>
    </Card>

    {(transitions.length > 0 || canAddItems) && (
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          Actions
        </h2>
        <div className="space-y-2">
          {canAddItems && (
            <Button variant="secondary" className="w-full" onClick={onAddItems}>
              <Plus className="w-4 h-4" />
              Add More Items
            </Button>
          )}
          {transitions.map((transition) => (
            <Button
              key={transition.next}
              variant={transition.next === "CANCELLED" ? "danger" : "primary"}
              className="w-full"
              loading={updateStatusMutation.isPending}
              onClick={() =>
                transition.next === "CANCELLED"
                  ? onCancel()
                  : updateStatusMutation.mutate({ status: transition.next })
              }
            >
              {transition.label}
            </Button>
          ))}
        </div>
      </Card>
    )}
  </div>
);
