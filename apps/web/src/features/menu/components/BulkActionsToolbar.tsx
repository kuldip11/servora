import { useState } from "react";
import {
  X,
  Ban,
  Tag as TagIcon,
  FolderInput,
  IndianRupee,
  Trash2,
} from "lucide-react";
import { Button, Modal, Select, Input } from "@pos/ui";
import { MENU_ITEM_STATUS_OPTIONS } from "@/features/menu/constants";
import { useBulkSetStatus } from "@/features/menu/hooks/useBulkSetStatus";
import { useBulkMoveCategory } from "@/features/menu/hooks/useBulkMoveCategory";
import { useBulkUpdateTags } from "@/features/menu/hooks/useBulkUpdateTags";
import { useBulkAdjustPrice } from "@/features/menu/hooks/useBulkAdjustPrice";
import { useBulkDeleteItems } from "@/features/menu/hooks/useBulkDeleteItems";
import type { MenuItemStatus, MenuCategory, MenuTag } from "@pos/types";

interface Props {
  selectedIds: string[];
  categories: MenuCategory[];
  tags: MenuTag[];
  onClear: () => void;
}

type BulkPanel = "status" | "category" | "tags" | "price" | "delete" | null;

export const BulkActionsToolbar = ({
  selectedIds,
  categories,
  tags,
  onClear,
}: Props) => {
  const [panel, setPanel] = useState<BulkPanel>(null);
  const [status, setStatus] = useState<MenuItemStatus>("OUT_OF_STOCK");
  const [reason, setReason] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"add" | "remove" | "replace">("add");
  const [priceMode, setPriceMode] = useState<"set" | "increase" | "decrease">(
    "increase",
  );
  const [priceChange, setPriceChange] = useState("");

  const count = selectedIds.length;

  function afterSuccess() {
    setPanel(null);
    onClear();
  }

  const statusMutation = useBulkSetStatus();
  const categoryMutation = useBulkMoveCategory();
  const tagsMutation = useBulkUpdateTags();
  const priceMutation = useBulkAdjustPrice();
  const deleteMutation = useBulkDeleteItems();

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="bg-primary-hover rounded-full px-2 py-0.5 text-xs font-semibold">
            {count}
          </span>
          selected
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            className="!bg-primary-hover !text-primary-foreground hover:!opacity-90 !border-primary-hover"
            onClick={() => setPanel("status")}
          >
            <Ban className="w-3.5 h-3.5" /> Status
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="!bg-primary-hover !text-primary-foreground hover:!opacity-90 !border-primary-hover"
            onClick={() => setPanel("category")}
          >
            <FolderInput className="w-3.5 h-3.5" /> Move
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="!bg-primary-hover !text-primary-foreground hover:!opacity-90 !border-primary-hover"
            onClick={() => setPanel("tags")}
          >
            <TagIcon className="w-3.5 h-3.5" /> Tags
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="!bg-primary-hover !text-primary-foreground hover:!opacity-90 !border-primary-hover"
            onClick={() => setPanel("price")}
          >
            <IndianRupee className="w-3.5 h-3.5" /> Price
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="!bg-primary-hover !text-primary-foreground hover:!bg-danger hover:!text-danger-foreground"
            onClick={() => setPanel("delete")}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 hover:bg-primary-hover rounded-md ml-1"
            title="Clear selection"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {}
      <Modal
        open={panel === "status"}
        onClose={() => setPanel(null)}
        title={`Change status for ${count} item(s)`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="New status"
            value={status}
            options={MENU_ITEM_STATUS_OPTIONS}
            onChange={(e) => setStatus(e.target.value as MenuItemStatus)}
          />
          <Input
            label="Reason (optional)"
            placeholder="e.g. Out of stock till Monday"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancel
            </Button>
            <Button
              loading={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate(
                  {
                    itemIds: selectedIds,
                    status,
                    ...(reason ? { reason } : {}),
                  },
                  { onSuccess: afterSuccess },
                )
              }
            >
              Apply to {count} item(s)
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        open={panel === "category"}
        onClose={() => setPanel(null)}
        title={`Move ${count} item(s) to category`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Category"
            value={categoryId}
            options={[
              { value: "", label: "Select a category…" },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            onChange={(e) => setCategoryId(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancel
            </Button>
            <Button
              loading={categoryMutation.isPending}
              disabled={!categoryId}
              onClick={() =>
                categoryMutation.mutate(
                  { itemIds: selectedIds, categoryId },
                  { onSuccess: afterSuccess },
                )
              }
            >
              Move {count} item(s)
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        open={panel === "tags"}
        onClose={() => setPanel(null)}
        title={`Update tags on ${count} item(s)`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Mode"
            value={tagMode}
            options={[
              { value: "add", label: "Add these tags" },
              { value: "remove", label: "Remove these tags" },
              { value: "replace", label: "Replace all tags with these" },
            ]}
            onChange={(e) =>
              setTagMode(e.target.value as "add" | "remove" | "replace")
            }
          />
          {!tags.length ? (
            <p className="text-xs text-text-disabled">
              No tags yet — add one from the Tags tab first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-opacity"
                  style={{
                    backgroundColor: t.color ?? "#8b5cf6",
                    color: "white",
                    opacity: tagIds.includes(t.id) ? 1 : 0.35,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancel
            </Button>
            <Button
              loading={tagsMutation.isPending}
              disabled={!tagIds.length}
              onClick={() =>
                tagsMutation.mutate(
                  { itemIds: selectedIds, tagIds, mode: tagMode },
                  { onSuccess: afterSuccess },
                )
              }
            >
              Apply to {count} item(s)
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        open={panel === "price"}
        onClose={() => setPanel(null)}
        title={`Adjust price for ${count} item(s)`}
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Mode"
            value={priceMode}
            options={[
              { value: "increase", label: "Increase by %" },
              { value: "decrease", label: "Decrease by %" },
              { value: "set", label: "Set to a fixed price (₹)" },
            ]}
            onChange={(e) =>
              setPriceMode(e.target.value as "set" | "increase" | "decrease")
            }
          />
          <Input
            label={priceMode === "set" ? "New price (₹)" : "Percentage"}
            type="number"
            min="0"
            step="0.01"
            placeholder={priceMode === "set" ? "0.00" : "10"}
            value={priceChange}
            onChange={(e) => setPriceChange(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancel
            </Button>
            <Button
              loading={priceMutation.isPending}
              disabled={!priceChange}
              onClick={() =>
                priceMutation.mutate(
                  {
                    itemIds: selectedIds,
                    priceChange: parseFloat(priceChange) || 0,
                    mode: priceMode,
                  },
                  { onSuccess: afterSuccess },
                )
              }
            >
              Apply to {count} item(s)
            </Button>
          </div>
        </div>
      </Modal>

      {}
      <Modal
        open={panel === "delete"}
        onClose={() => setPanel(null)}
        title={`Delete ${count} item(s)?`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This removes {count} item(s) from the menu. Items currently on an
            open order or unpaid bill are automatically skipped so in-progress
            orders aren't affected.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPanel(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(selectedIds, { onSuccess: afterSuccess })
              }
            >
              Delete {count} item(s)
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
