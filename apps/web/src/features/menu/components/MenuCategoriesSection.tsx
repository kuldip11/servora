import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  FormErrorSummary,
  IconButton,
  Input,
  Modal,
  QueryErrorState,
  Spinner,
  StaleDataBanner,
} from "@pos/ui";
import { useMenuCategories } from "@/features/menu/hooks/useMenuCategories";
import { useAddCategory } from "@/features/menu/hooks/useAddCategory";
import { useRenameCategory } from "@/features/menu/hooks/useRenameCategory";
import { useDeleteCategory } from "@/features/menu/hooks/useDeleteCategory";
import { useLocalFormApiErrors } from "@/shared/hooks/useLocalFormApiErrors";
import { validateCategoryName } from "@/features/menu/helpers/category-form";
import type { MenuCategory } from "@pos/types";

interface Props {
  onSaveTemplate: (category: { id: string; name: string }) => void;
}

export const MenuCategoriesSection = ({ onSaveTemplate }: Props) => {
  const categoriesQuery = useMenuCategories();
  const addMutation = useAddCategory();
  const renameMutation = useRenameCategory();
  const deleteMutation = useDeleteCategory();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);
  const [name, setName] = useState("");
  const formErrors = useLocalFormApiErrors();
  const nameError = useMemo(() => validateCategoryName(name), [name]);
  const isDirty =
    adding || (editing ? name.trim() !== editing.name.trim() : false);

  const closeModal = () => {
    formErrors.clearErrors();
    setAdding(false);
    setEditing(null);
    setName("");
  };
  const openAdd = () => {
    formErrors.clearErrors();
    setName("");
    setEditing(null);
    setAdding(true);
  };
  const openEdit = (category: MenuCategory) => {
    formErrors.clearErrors();
    setAdding(false);
    setName(category.name);
    setEditing(category);
  };

  if (categoriesQuery.isError && !categoriesQuery.data) {
    return (
      <QueryErrorState
        title="Unable to load categories"
        description="Categories could not be loaded. Retry before creating or editing categories so a failed request is not treated as an empty menu."
        onRetry={() => void categoriesQuery.refetch()}
        isRetrying={categoriesQuery.isFetching}
      />
    );
  }

  const categories = categoriesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Categories
          </h2>
          <p className="text-sm text-text-secondary">
            Organize menu items into customer-facing groups.
          </p>
        </div>
        <Button onClick={openAdd} disabled={categoriesQuery.isLoading}>
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {categoriesQuery.isError && categoriesQuery.data ? (
        <StaleDataBanner
          message="Category refresh failed — showing the latest cached categories."
          onRetry={() => void categoriesQuery.refetch()}
          isRetrying={categoriesQuery.isFetching}
        />
      ) : null}

      {categoriesQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !categories.length ? (
        <EmptyState
          icon={({ className }) => <span className={className}>☷</span>}
          title="No categories"
          description="Create your first category to start organizing menu items."
          action={<Button onClick={openAdd}>Add Category</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-text-primary">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    {category.menuItems?.length ?? 0} items
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <IconButton
                    icon={Pencil}
                    size="sm"
                    aria-label={`Rename ${category.name}`}
                    onClick={() => openEdit(category)}
                  />
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    aria-label={`Delete ${category.name}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Remove category "${category.name}"?`))
                        deleteMutation.mutate(category.id);
                    }}
                  />
                </div>
              </div>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant="secondary"
                onClick={() =>
                  onSaveTemplate({ id: category.id, name: category.name })
                }
              >
                <LayoutTemplate className="h-3.5 w-3.5" /> Save as Template
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={adding || !!editing}
        onClose={closeModal}
        title={adding ? "Add Category" : "Rename Category"}
        size="sm"
      >
        <div className="space-y-4">
          <FormErrorSummary messages={formErrors.formErrorMessages} />
          <Input
            label="Category name"
            placeholder="e.g. Starters"
            value={name}
            maxLength={100}
            error={formErrors.fieldErrors.name ?? nameError}
            onChange={(event) => {
              formErrors.clearFieldError("name");
              setName(event.target.value);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              loading={addMutation.isPending || renameMutation.isPending}
              disabled={
                Boolean(nameError) ||
                !isDirty ||
                addMutation.isPending ||
                renameMutation.isPending
              }
              onClick={() => {
                formErrors.clearErrors();
                if (nameError || !isDirty) return;
                if (adding) {
                  addMutation.mutate(name.trim(), {
                    onSuccess: closeModal,
                    onError: (error) =>
                      formErrors.handleApiError(
                        error,
                        ["name"],
                        "Failed to add category",
                      ),
                  });
                } else if (editing) {
                  renameMutation.mutate(
                    { id: editing.id, name: name.trim() },
                    {
                      onSuccess: closeModal,
                      onError: (error) =>
                        formErrors.handleApiError(
                          error,
                          ["name"],
                          "Failed to rename category",
                        ),
                    },
                  );
                }
              }}
            >
              {adding ? "Add Category" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
