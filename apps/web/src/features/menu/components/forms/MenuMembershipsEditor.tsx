import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { MenuCategory, MenuItem } from "@pos/types";
import { Select } from "@pos/ui";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError } from "@/shared/lib/notify";
import { useMenus } from "@/features/menu/hooks/useMenus";
import { menuKeys } from "@/features/menu/query-keys";
import { menusService } from "@/features/menu/services/menus.service";

export const MenuMembershipsEditor = ({
  item,
  categories,
}: {
  item: MenuItem;
  categories: MenuCategory[];
}) => {
  const { data: menus } = useMenus();
  const [categoryByMenu, setCategoryByMenu] = useState(
    () =>
      new Map(
        item.menuMemberships?.map((membership) => [
          membership.menuId,
          membership.categoryId,
        ]),
      ),
  );
  const mutation = useMutation({
    mutationFn: async (change: {
      menuId: string;
      categoryId: string | null;
    }) => {
      if (change.categoryId) {
        await menusService.assignItem(item.id, {
          menuId: change.menuId,
          categoryId: change.categoryId,
        });
      } else {
        await menusService.removeItem(item.id, change.menuId);
      }
    },
    onSuccess: (_result, change) => {
      setCategoryByMenu((current) => {
        const next = new Map(current);
        if (change.categoryId) next.set(change.menuId, change.categoryId);
        else next.delete(change.menuId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    },
    onError: (error) => notifyError(error, "Failed to update menu assignment"),
  });

  return (
    <section className="space-y-2 rounded-lg border border-border p-3">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">
          Menu assignments
        </h3>
        <p className="text-xs text-text-secondary">
          The Default Menu is automatic. Use these assignments only for optional
          specialized menus.
        </p>
      </div>
      {menus?.map((menu) => {
        const currentCategoryId = categoryByMenu.get(menu.id);
        if (menu.isDefault) {
          return (
            <div
              key={menu.id}
              className="rounded-md border border-border bg-surface-secondary px-3 py-2"
            >
              <p className="text-sm font-medium text-text-primary">
                Default Menu
              </p>
              <p className="text-xs text-text-secondary">
                Included automatically for normal ordering.
              </p>
            </div>
          );
        }
        return (
          <Select
            key={`${menu.id}:${currentCategoryId ?? "none"}`}
            label={menu.name}
            value={currentCategoryId ?? ""}
            disabled={mutation.isPending}
            options={[
              ...(menu.isDefault ? [] : [{ value: "", label: "Not included" }]),
              ...categories.map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
            onChange={(event) =>
              mutation.mutate({
                menuId: menu.id,
                categoryId: event || null,
              })
            }
          />
        );
      })}
    </section>
  );
};
