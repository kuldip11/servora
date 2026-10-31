import { Button, Input } from "@pos/ui";
import type { OrgMenu } from "./types";

type Props = {
  menuName: string;
  menuSkus: string;
  menuDefault: boolean;
  menuPublished: boolean;
  menus: OrgMenu[];
  creating: boolean;
  onFieldChange: (
    field: "menuName" | "menuSkus" | "menuDefault" | "menuPublished",
    value: string | boolean,
  ) => void;
  onCreate: () => void;
  onToggle: (menu: OrgMenu) => void;
  onDelete: (id: string) => void;
};

export const OrganizationMenuPanel = ({
  menuName,
  menuSkus,
  menuDefault,
  menuPublished,
  menus,
  creating,
  onFieldChange,
  onCreate,
  onToggle,
  onDelete,
}: Props) => (
  <div className="space-y-3 rounded-lg border border-border p-4">
    <h3 className="text-sm font-semibold text-text-primary">Inherited menu</h3>
    <Input
      label="Menu name"
      value={menuName}
      onChange={(event) => onFieldChange("menuName", event.target.value)}
    />
    <label className="block text-sm font-medium text-text-primary">
      Tenant item SKUs
      <textarea
        className="mt-1.5 min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={menuSkus}
        onChange={(event) => onFieldChange("menuSkus", event.target.value)}
        placeholder="PIZZA-MARGHERITA, DRINK-COLA"
      />
    </label>
    <div className="flex gap-4 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={menuDefault}
          onChange={(event) =>
            onFieldChange("menuDefault", event.target.checked)
          }
        />
        Default
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={menuPublished}
          onChange={(event) =>
            onFieldChange("menuPublished", event.target.checked)
          }
        />
        Publish now
      </label>
    </div>
    <Button
      type="button"
      disabled={!menuName.trim() || !menuSkus.trim()}
      loading={creating}
      onClick={onCreate}
    >
      Create organization menu
    </Button>
    {menus.map((menu) => (
      <div key={menu.id} className="rounded bg-surface-secondary p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-text-primary">
            {menu.name} · {menu.status}
            {menu.isDefault ? " · Default" : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-primary"
              onClick={() => onToggle(menu)}
            >
              {menu.status === "PUBLISHED" ? "Draft" : "Publish"}
            </button>
            <button
              type="button"
              className="text-danger"
              onClick={() => onDelete(menu.id)}
            >
              Delete
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-text-secondary">
          {menu.organizationItems.map((item) => item.itemSku).join(", ") ||
            "No SKUs"}
        </p>
      </div>
    ))}
  </div>
);
