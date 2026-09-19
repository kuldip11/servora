import { useState } from "react";
import { LayoutTemplate, Sparkles, X } from "lucide-react";
import type { MenuTemplate } from "@pos/types";
import { Button, QueryErrorState, StaleDataBanner } from "@pos/ui";
import { ApplyTemplateModal } from "@/features/menu/components/ApplyTemplateModal";
import { useDeleteTemplate } from "@/features/menu/hooks/useDeleteTemplate";
import { useMenuTemplates } from "@/features/menu/hooks/useMenuTemplates";

export { SaveTemplateModal } from "@/features/menu/components/SaveTemplateModal";

export const TemplatesSection = () => {
  const [applyingTemplate, setApplyingTemplate] = useState<MenuTemplate | null>(
    null,
  );

  const templatesQuery = useMenuTemplates();
  const templates = templatesQuery.data;
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

      {templatesQuery.isLoading ? (
        <p className="text-sm text-text-disabled">Loading…</p>
      ) : null}
      {templatesQuery.isError && !templates ? (
        <QueryErrorState
          title="Unable to load templates"
          description="Menu templates could not be loaded. Retry before applying or deleting templates."
          onRetry={() => void templatesQuery.refetch()}
          isRetrying={templatesQuery.isFetching}
        />
      ) : null}
      {templatesQuery.isError && templates ? (
        <StaleDataBanner
          message="Template refresh failed — showing the last available templates."
          onRetry={() => void templatesQuery.refetch()}
          isRetrying={templatesQuery.isFetching}
        />
      ) : null}
      {!templatesQuery.isLoading &&
      !templatesQuery.isError &&
      !templates?.length ? (
        <p className="text-sm text-text-disabled">No templates saved yet.</p>
      ) : null}

      <div className="space-y-1.5">
        {templates?.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between px-3 py-2.5 bg-surface-secondary rounded-md text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutTemplate className="w-4 h-4 text-text-disabled shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">
                    {template.name}
                  </span>
                  <span className="text-xs text-text-disabled">
                    {template.items.length} item(s)
                  </span>
                </div>
                {template.description ? (
                  <p className="text-xs text-text-disabled truncate">
                    {template.description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                size="sm"
                variant="secondary"
                disabled={templatesQuery.isError}
                onClick={() => setApplyingTemplate(template)}
              >
                <Sparkles className="w-3.5 h-3.5" /> Apply
              </Button>
              <button
                type="button"
                disabled={deleteMutation.isPending || templatesQuery.isError}
                onClick={() => {
                  if (confirm(`Delete template "${template.name}"?`)) {
                    deleteMutation.mutate(template.id);
                  }
                }}
                aria-label={`Delete template ${template.name}`}
                className="text-text-disabled hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {applyingTemplate ? (
        <ApplyTemplateModal
          template={applyingTemplate}
          onClose={() => setApplyingTemplate(null)}
        />
      ) : null}
    </div>
  );
};
