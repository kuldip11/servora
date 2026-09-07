import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Modal, Select } from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import {
  createInventoryItemSchema,
  updateInventoryStockSchema,
  type CreateInventoryItemInput,
  type UpdateInventoryStockInput,
} from "@pos/validation";
import { useAddInventoryItem } from "@/features/inventory/hooks/useAddInventoryItem";
import { useUpdateInventoryStock } from "@/features/inventory/hooks/useUpdateInventoryStock";
import {
  INVENTORY_TRANSACTION_OPTIONS,
  INVENTORY_UNIT_OPTIONS,
} from "@/features/inventory/constants";

interface Props {
  addOpen: boolean;
  updateItem: InventoryItem | null;
  aggregate: boolean;
  branches: { id: string; name: string }[];
  onCloseAdd: () => void;
  onCloseUpdate: () => void;
}
export const InventoryItemDialogs = ({
  addOpen,
  updateItem,
  aggregate,
  branches,
  onCloseAdd,
  onCloseUpdate,
}: Props) => {
  const {
    register: registerAdd,
    handleSubmit: submitAdd,
    reset: resetAdd,
    formState: { errors: addErrors },
  } = useForm<CreateInventoryItemInput>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: {
      name: "",
      unit: "KG",
      currentStock: 0,
      minimumStock: 0,
      reorderPoint: 0,
      costPerUnit: 0,
      branchId: undefined,
    },
  });
  const {
    register: registerStock,
    handleSubmit: submitStock,
    reset: resetStock,
    formState: { errors: stockErrors },
  } = useForm<UpdateInventoryStockInput>({
    resolver: zodResolver(updateInventoryStockSchema),
    defaultValues: { quantity: 0, transactionType: "IN", notes: "" },
  });
  const addMutation = useAddInventoryItem();
  const updateMutation = useUpdateInventoryStock();
  const add = (values: CreateInventoryItemInput) =>
    addMutation.mutate(
      {
        ...values,
        currentStock: String(values.currentStock),
        minimumStock: String(values.minimumStock),
        reorderPoint: String(values.reorderPoint),
        costPerUnit: String(values.costPerUnit),
        ...(values.branchId ? { branchId: values.branchId } : {}),
      },
      {
        onSuccess: () => {
          onCloseAdd();
          resetAdd({
            name: "",
            unit: "KG",
            currentStock: 0,
            minimumStock: 0,
            reorderPoint: 0,
            costPerUnit: 0,
            branchId: undefined,
          });
        },
      },
    );
  const update = (values: UpdateInventoryStockInput) => {
    if (!updateItem) return;
    updateMutation.mutate(
      {
        itemId: updateItem.id,
        input: {
          ...values,
          quantity: String(values.quantity),
          notes: values.notes ?? "",
        },
      },
      {
        onSuccess: () => {
          onCloseUpdate();
          resetStock({ quantity: 0, transactionType: "IN", notes: "" });
        },
      },
    );
  };
  return (
    <>
      <Modal open={addOpen} onClose={onCloseAdd} title="Add Inventory Item">
        <form onSubmit={submitAdd(add)} className="space-y-4">
          <Input
            label="Item name"
            placeholder="e.g. Chicken Breast"
            error={addErrors.name?.message}
            {...registerAdd("name")}
          />
          <Select
            label="Unit"
            options={INVENTORY_UNIT_OPTIONS}
            error={addErrors.unit?.message}
            {...registerAdd("unit")}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Stock"
              type="number"
              min="0"
              step="0.001"
              error={addErrors.currentStock?.message}
              {...registerAdd("currentStock", { valueAsNumber: true })}
            />
            <Input
              label="Minimum Stock"
              type="number"
              min="0"
              step="0.001"
              error={addErrors.minimumStock?.message}
              {...registerAdd("minimumStock", { valueAsNumber: true })}
            />
            <Input
              label="Reorder Point"
              type="number"
              min="0"
              step="0.001"
              error={addErrors.reorderPoint?.message}
              {...registerAdd("reorderPoint", { valueAsNumber: true })}
            />
            <Input
              label="Cost per Unit (₹)"
              type="number"
              min="0"
              step="0.01"
              error={addErrors.costPerUnit?.message}
              {...registerAdd("costPerUnit", { valueAsNumber: true })}
            />
          </div>
          {aggregate && (
            <Select
              label="Branch"
              options={[
                { value: "", label: "Select branch" },
                ...branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                })),
              ]}
              error={addErrors.branchId?.message}
              {...registerAdd("branchId")}
            />
          )}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onCloseAdd}>
              Cancel
            </Button>
            <Button type="submit" loading={addMutation.isPending}>
              Add Item
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!updateItem}
        onClose={onCloseUpdate}
        title={`Update Stock: ${updateItem?.name}`}
        size="sm"
      >
        <form onSubmit={submitStock(update)} className="space-y-4">
          <Select
            label="Transaction Type"
            options={INVENTORY_TRANSACTION_OPTIONS}
            error={stockErrors.transactionType?.message}
            {...registerStock("transactionType")}
          />
          <Input
            label="Quantity"
            type="number"
            min="0.001"
            step="0.001"
            error={stockErrors.quantity?.message}
            hint={`Current stock: ${parseFloat(String(updateItem?.currentStock ?? 0)).toFixed(2)} ${updateItem?.unit}`}
            {...registerStock("quantity", { valueAsNumber: true })}
          />
          <Input
            label="Notes (optional)"
            placeholder="Reason for update..."
            error={stockErrors.notes?.message}
            {...registerStock("notes")}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onCloseUpdate}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMutation.isPending}>
              Update
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
