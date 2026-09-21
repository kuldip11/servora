import { zodResolver } from "@hookform/resolvers/zod";
import { applyTemplateSchema, type ApplyTemplateInput } from "@pos/validation";
import type { MenuTemplate } from "@pos/types";
import {
  Button,
  FormErrorSummary,
  Modal,
  Input,
  QueryErrorState,
  Select,
} from "@pos/ui";
import { useForm } from "react-hook-form";
import { useBranches } from "@/features/branches";
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
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<ApplyTemplateInput>({
    resolver: zodResolver(applyTemplateSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
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
          required
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
          <Select
            id="template-branch"
            label="Branch"
            value={watch("branchId")}
            onChange={(value) => {
              clearFormErrors();
              setValue("branchId", value, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              });
            }}
            error={errors.branchId?.message}
            options={[
              { value: "", label: "Tenant-wide (all branches)" },
              ...(branchesQuery.data ?? []).map((branch) => ({
                value: branch.id,
                label: branch.name,
              })),
            ]}
          />
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
