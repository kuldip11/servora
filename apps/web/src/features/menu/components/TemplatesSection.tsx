import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  applyTemplateSchema,
  saveTemplateSchema,
  type ApplyTemplateInput,
  type SaveTemplateInput,
} from "@pos/validation";
import { LayoutTemplate, X, Sparkles } from "lucide-react";
import { Button, Modal, Input } from "@pos/ui";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { notifySuccess } from "@/shared/lib/notify";
import { useMenuTemplates } from "@/features/menu/hooks/useMenuTemplates";
import { useDeleteTemplate } from "@/features/menu/hooks/useDeleteTemplate";
import { useApplyTemplate } from "@/features/menu/hooks/useApplyTemplate";
import { useSaveTemplateFromCategory } from "@/features/menu/hooks/useSaveTemplateFromCategory";
import type { MenuTemplate } from "@pos/types";

export const TemplatesSection = () => {
  const [applyingTemplate, setApplyingTemplate] = useState<MenuTemplate | null>(
    null,
  );

  const { data: templates, isLoading } = useMenuTemplates();
  const deleteMutation = useDeleteTemplate();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Menu Templates
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Save a category's items as a reusable starting point — useful for
          bootstrapping a new branch's menu. Applying a template creates a new
          category with everything as drafts, so a manager can review before
          they go live. Use "Save as Template" on any category above to create
          one.
        </p>
      </div>

      {isLoading && <p className="text-sm text-text-disabled">Loading…</p>}
      {!isLoading && !templates?.length && (
        <p className="text-sm text-text-disabled">No templates saved yet.</p>
      )}

      <div className="space-y-1.5">
        {templates?.map((tpl) => (
          <div
            key={tpl.id}
            className="flex items-center justify-between px-3 py-2.5 bg-surface-secondary rounded-md text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutTemplate className="w-4 h-4 text-text-disabled shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">
                    {tpl.name}
                  </span>
                  <span className="text-xs text-text-disabled">
                    {tpl.items.length} item(s)
                  </span>
                </div>
                {tpl.description && (
                  <p className="text-xs text-text-disabled truncate">
                    {tpl.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setApplyingTemplate(tpl)}
              >
                <Sparkles className="w-3.5 h-3.5" /> Apply
              </Button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete template "${tpl.name}"?`))
                    deleteMutation.mutate(tpl.id);
                }}
                aria-label={`Delete template ${tpl.name}`}
                className="text-text-disabled hover:text-danger"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {applyingTemplate && (
        <ApplyTemplateModal
          template={applyingTemplate}
          onClose={() => setApplyingTemplate(null)}
        />
      )}
    </div>
  );
};

function ApplyTemplateModal({
  template,
  onClose,
}: {
  template: MenuTemplate;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyTemplateInput>({
    resolver: zodResolver(applyTemplateSchema),
    defaultValues: {
      branchId: "",
      categoryName: template.sourceCategoryName ?? template.name,
    },
  });

  const { data: branches } = useBranches();
  const applyMutation = useApplyTemplate();

  return (
    <Modal open onClose={onClose} title={`Apply "${template.name}"`} size="sm">
      <form
        onSubmit={handleSubmit((values) =>
          applyMutation.mutate(
            { templateId: template.id, input: values },
            {
              onSuccess: () => {
                notifySuccess(
                  `Applied — ${template.items.length} item(s) added as drafts, ready to review`,
                );
                onClose();
              },
            },
          ),
        )}
        className="space-y-4"
      >
        <Input
          label="New category name"
          error={errors.categoryName?.message}
          {...register("categoryName")}
        />
        <div>
          <label
            htmlFor="template-branch"
            className="text-sm font-medium text-text-primary mb-1.5 block"
          >
            Branch
          </label>
          <select
            id="template-branch"
            {...register("branchId")}
            className="w-full px-3 py-2 text-sm border border-border rounded-md"
          >
            <option value="">Tenant-wide (all branches)</option>
            {branches?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-text-disabled">
          Creates {template.items.length} item(s) as drafts in a new category —
          nothing goes live until reviewed and published.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={applyMutation.isPending}>
            Apply
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export const SaveTemplateModal = ({
  category,
  onClose,
}: {
  category: { id: string; name: string };
  onClose: () => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SaveTemplateInput>({
    resolver: zodResolver(saveTemplateSchema),
    defaultValues: { name: category.name, description: "" },
  });

  const saveMutation = useSaveTemplateFromCategory();

  return (
    <Modal open onClose={onClose} title="Save as Template" size="sm">
      <form
        onSubmit={handleSubmit((values) =>
          saveMutation.mutate(
            {
              categoryId: category.id,
              input: {
                name: values.name.trim(),
                ...(values.description?.trim()
                  ? { description: values.description.trim() }
                  : {}),
              },
            },
            { onSuccess: onClose },
          ),
        )}
        className="space-y-4"
      >
        <Input
          label="Template name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Description (optional)"
          error={errors.description?.message}
          {...register("description")}
        />
        <p className="text-xs text-text-disabled">
          Snapshots this category's tenant-wide items as they are right now.
          Branch-specific items in this category aren't included — only items
          shared across all branches are portable enough to templatize.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saveMutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
