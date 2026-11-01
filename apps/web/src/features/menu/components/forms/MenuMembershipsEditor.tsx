import { useState } from "react";
import type { MenuCategory, MenuItem } from "@pos/types";
import { Select } from "@pos/ui";
import {
  useMenus,
  useUpdateMenuMembership,
} from "@/features/menu/hooks/useMenus";

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
  const mutation = useUpdateMenuMembership(item.id);

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
              mutation.mutate(
                {
                  menuId: menu.id,
                  categoryId: event || null,
                },
                {
                  onSuccess: (_result, change) => {
                    setCategoryByMenu((current) => {
                      const next = new Map(current);
                      if (change.categoryId)
                        next.set(change.menuId, change.categoryId);
                      else next.delete(change.menuId);
                      return next;
                    });
                  },
                },
              )
            }
          />
        );
      })}
    </section>
  );
};
