import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import type { Menu } from "@pos/types";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { createMenuApi } from "@pos/api-client";
import { useBranches } from "@/features/branches";
import { apiClient } from "@/shared/lib/api-client";
import {
  useCreateMenu,
  useDeleteMenu,
  useMenus,
  useSetMenuPublished,
} from "@/features/menu/hooks/useMenus";
import { MenuAvailabilityDialog } from "@/features/menu/components/MenuAvailabilityDialog";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const menuApi = createMenuApi(apiClient);
const createMenuFormSchema = z.object({
  name: z.string().trim().min(1, "Menu name is required").max(120),
});
type CreateMenuFormValues = z.infer<typeof createMenuFormSchema>;

export const MenusSection = () => {
  const [editing, setEditing] = useState<Menu | null>(null);
  const menusQuery = useMenus();
  const resolvedMenusQuery = useQuery<Menu[]>({
    queryKey: ["menus", "active", "origin-preview"],
    queryFn: () => menuApi.listActiveMenus<Menu>("DINE_IN"),
  });
  const branchesQuery = useBranches();
  const createMenu = useCreateMenu();
  const setPublished = useSetMenuPublished();
  const deleteMenu = useDeleteMenu();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateMenuFormValues>({
    resolver: zodResolver(createMenuFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "" },
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<CreateMenuFormValues>();

  const menus = menusQuery.data;
  const branches = branchesQuery.data ?? [];
  const inheritedMenus = (resolvedMenusQuery.data ?? []).filter(
    (menu) => !!menu.organizationId,
  );

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await createMenu.mutateAsync({ name: values.name.trim() });
      reset();
    } catch (error) {
      handleApiError(error, setError, ["name"], "Failed to create menu");
    }
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Advanced menus
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Normal ordering uses the automatic Default Menu. Create another menu
          only when you need different items by branch, channel, order type, or
          schedule.
        </p>
      </div>

      {menusQuery.isError && !menus ? (
        <QueryErrorState
          title="Unable to load menus"
          description="Menus could not be loaded. Retry before changing menu configuration."
          onRetry={() => void menusQuery.refetch()}
          isRetrying={menusQuery.isFetching}
        />
      ) : null}
      {menusQuery.isError && menus ? (
        <StaleDataBanner
          message="Menu refresh failed — showing the last available menus."
          onRetry={() => void menusQuery.refetch()}
          isRetrying={menusQuery.isFetching}
        />
      ) : null}
      {resolvedMenusQuery.isError && resolvedMenusQuery.data ? (
        <StaleDataBanner
          message="Inherited-menu refresh failed — showing the last available inheritance state."
          onRetry={() => void resolvedMenusQuery.refetch()}
          isRetrying={resolvedMenusQuery.isFetching}
        />
      ) : null}
      {branchesQuery.isError && branchesQuery.data ? (
        <StaleDataBanner
          message="Branch refresh failed — availability editing uses the last available branch list."
          onRetry={() => void branchesQuery.refetch()}
          isRetrying={branchesQuery.isFetching}
        />
      ) : null}

      {inheritedMenus.length > 0 ? (
        <div className="rounded-lg border border-primary-border bg-primary-surface px-4 py-3">
          <p className="text-sm font-semibold text-primary">
            Organization-inherited menu active
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {inheritedMenus.map((menu) => menu.name).join(", ")} · tenant-local
            published menus override these defaults.
          </p>
        </div>
      ) : null}

      <form className="max-w-md space-y-2" onSubmit={submit}>
        <FormErrorSummary messages={formErrorMessages} />
        <div className="flex items-end gap-2">
          <Input
            label="New menu"
            required
            placeholder="Weekend Menu"
            error={errors.name?.message}
            {...register("name", { onChange: clearFormErrors })}
          />
          <Button
            type="submit"
            loading={createMenu.isPending}
            disabled={createMenu.isPending || menusQuery.isError}
          >
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </form>

      {menusQuery.isLoading ? (
        <p className="text-sm text-text-secondary">Loading menus…</p>
      ) : menus ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {!menus.length && !menusQuery.isError ? (
            <p className="p-4 text-sm text-text-secondary">
              No advanced menus yet.
            </p>
          ) : null}
          {menus.map((menu) => (
            <div key={menu.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-text-primary">{menu.name}</p>
                  {menu.isDefault ? (
                    <span className="rounded bg-surface-secondary px-2 py-0.5 text-xs text-text-secondary">
                      Default
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-text-secondary">
                  {menu.isDefault
                    ? "Automatic fallback · all regular items are included"
                    : menu.status}
                </p>
              </div>
              {!menu.isDefault ? (
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
                    disabled={branchesQuery.isError && !branchesQuery.data}
                    onClick={() => setEditing(menu)}
                  >
                    <Pencil className="h-4 w-4" /> Availability
                  </Button>
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
                </>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <MenuAvailabilityDialog
        menu={editing}
        branches={branches}
        onClose={() => setEditing(null)}
      />
    </div>
  );
};
