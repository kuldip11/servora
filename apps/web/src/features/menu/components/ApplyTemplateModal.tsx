import { zodResolver } from "@hookform/resolvers/zod";
import { applyTemplateSchema, type ApplyTemplateInput } from "@pos/validation";
import type { MenuTemplate } from "@pos/types";
import {
  Button,
  FieldErrorText,
  FormErrorSummary,
  Modal,
  Input,
  QueryErrorState,
} from "@pos/ui";
import { useForm } from "react-hook-form";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useApplyTemplate } from "@/features/menu/hooks/useApplyTemplate";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import { notifySuccess } from "@/shared/lib/notify";

interface ApplyTemplateModalProps {
  template: MenuTemplate;
  onClose: () => void;
}

export const ApplyTemplateModal = ({
  template,
  onClose,
}: ApplyTemplateModalProps) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid },
  } = useForm<ApplyTemplateInput>({
    resolver: zodResolver(applyTemplateSchema),
    mode: "onChange",
    defaultValues: {
      branchId: "",
      categoryName: template.sourceCategoryName ?? template.name,
    },
  });

  const branchesQuery = useBranches();
  const applyMutation = useApplyTemplate();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<ApplyTemplateInput>();

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await applyMutation.mutateAsync({
        templateId: template.id,
        input: values,
      });
      notifySuccess(
        `Applied — ${template.items.length} item(s) added as drafts, ready to review`,
      );
      onClose();
    } catch (error) {
      handleApiError(
        error,
        setError,
        ["branchId", "categoryName"],
        "Failed to apply template",
      );
    }
  });

  return (
    <Modal open onClose={onClose} title={`Apply "${template.name}"`} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <FormErrorSummary messages={formErrorMessages} />
        <Input
          label="New category name"
          error={errors.categoryName?.message}
          {...register("categoryName", { onChange: clearFormErrors })}
        />
        {branchesQuery.isError && !branchesQuery.data ? (
          <QueryErrorState
            title="Unable to load branches"
            description="Branch options are unavailable. Retry before applying this template."
            onRetry={() => void branchesQuery.refetch()}
            isRetrying={branchesQuery.isFetching}
            className="py-5"
          />
        ) : (
          <div>
            <label
              htmlFor="template-branch"
              className="text-sm font-medium text-text-primary mb-1.5 block"
            >
              Branch
            </label>
            <select
              id="template-branch"
              {...register("branchId", { onChange: clearFormErrors })}
              aria-invalid={errors.branchId ? "true" : "false"}
              aria-describedby={
                errors.branchId ? "template-branch-error" : undefined
              }
              className="w-full px-3 py-2 text-sm border border-border rounded-md"
            >
              <option value="">Tenant-wide (all branches)</option>
              {branchesQuery.data?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <FieldErrorText
              id="template-branch-error"
              message={errors.branchId?.message}
            />
          </div>
        )}
        <p className="text-xs text-text-disabled">
          Creates {template.items.length} item(s) as drafts in a new category —
          nothing goes live until reviewed and published.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={applyMutation.isPending}
            disabled={
              !isValid ||
              applyMutation.isPending ||
              (branchesQuery.isError && !branchesQuery.data)
            }
          >
            Apply
          </Button>
        </div>
      </form>
    </Modal>
  );
};
