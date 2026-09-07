import { useState } from "react";
import type { Menu } from "@pos/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@pos/ui";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useQuery } from "@tanstack/react-query";
import { createMenuApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";

const menuApi = createMenuApi(apiClient);
import {
  useCreateMenu,
  useDeleteMenu,
  useMenus,
  useSetMenuPublished,
} from "@/features/menu/hooks/useMenus";

import { MenuAvailabilityDialog } from "@/features/menu/components/MenuAvailabilityDialog";

export const MenusSection = () => {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Menu | null>(null);
  const { data: menus, isLoading } = useMenus();
  const { data: resolvedMenus = [] } = useQuery<Menu[]>({
    queryKey: ["menus", "active", "origin-preview"],
    queryFn: () => menuApi.listActiveMenus<Menu>("DINE_IN"),
  });
  const inheritedMenus = resolvedMenus.filter((menu) => !!menu.organizationId);
  const { data: branches = [] } = useBranches();
  const createMenu = useCreateMenu();
  const setPublished = useSetMenuPublished();
  const deleteMenu = useDeleteMenu();

  const startEditing = (menu: Menu) => setEditing(menu);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Advanced menus
        </h2>
        <p className="text-sm text-text-secondary mt-0.5">
          Normal ordering uses the automatic Default Menu. Create another menu
          only when you need different items by branch, channel, order type, or
          schedule.
        </p>
      </div>

      {inheritedMenus.length > 0 && (
        <div className="rounded-lg border border-primary-border bg-primary-surface px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            Organization-inherited menu active
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {inheritedMenus.map((menu) => menu.name).join(", ")} · tenant-local
            published menus override these defaults.
          </p>
        </div>
      )}

      <form
        className="flex max-w-md items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          createMenu.mutate(
            { name: trimmed },
            { onSuccess: () => setName("") },
          );
        }}
      >
        <Input
          label="New menu"
          placeholder="Weekend Menu"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" loading={createMenu.isPending}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-text-secondary">Loading menus…</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {menus?.map((menu) => (
            <div key={menu.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{menu.name}</p>
                  {menu.isDefault && (
                    <span className="rounded bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary">
                  {menu.isDefault
                    ? "Automatic fallback · all regular items are included"
                    : menu.status}
                </p>
              </div>
              {!menu.isDefault && (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={setPublished.isPending}
                    onClick={() =>
                      setPublished.mutate({
                        id: menu.id,
                        published: menu.status !== "PUBLISHED",
                      })
                    }
                  >
                    {menu.status === "PUBLISHED" ? "Move to draft" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEditing(menu)}
                  >
                    <Pencil className="h-4 w-4" /> Availability
                  </Button>
                </>
              )}
              {!menu.isDefault && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${menu.name}`}
                  loading={deleteMenu.isPending}
                  onClick={() => {
                    if (confirm(`Delete menu "${menu.name}"?`))
                      deleteMenu.mutate(menu.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <MenuAvailabilityDialog
        menu={editing}
        branches={branches}
        onClose={() => setEditing(null)}
      />
    </div>
  );
};
