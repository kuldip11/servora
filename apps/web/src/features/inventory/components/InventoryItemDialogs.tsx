import { Modal } from "@pos/ui";
import type { InventoryItem } from "@pos/types";
import { AddInventoryItemForm } from "./forms/AddInventoryItemForm";
import { UpdateInventoryStockForm } from "./forms/UpdateInventoryStockForm";

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
}: Props) => (
  <>
    <Modal open={addOpen} onClose={onCloseAdd} title="Add Inventory Item">
      <AddInventoryItemForm
        aggregate={aggregate}
        branches={branches}
        onCancel={onCloseAdd}
        onSuccess={onCloseAdd}
      />
    </Modal>
    <Modal
      open={Boolean(updateItem)}
      onClose={onCloseUpdate}
      title={`Update Stock: ${updateItem?.name}`}
      size="sm"
    >
      {updateItem ? (
        <UpdateInventoryStockForm
          item={updateItem}
          onCancel={onCloseUpdate}
          onSuccess={onCloseUpdate}
        />
      ) : null}
    </Modal>
  </>
);
