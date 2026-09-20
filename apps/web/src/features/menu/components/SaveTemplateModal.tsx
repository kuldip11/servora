import { zodResolver } from "@hookform/resolvers/zod";
import { saveTemplateSchema, type SaveTemplateInput } from "@pos/validation";
import { Button, FormErrorSummary, Input, Modal } from "@pos/ui";
import { useForm } from "react-hook-form";
import { useSaveTemplateFromCategory } from "@/features/menu/hooks/useSaveTemplateFromCategory";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

interface SaveTemplateModalProps {
  category: { id: string; name: string };
  onClose: () => void;
}

export const SaveTemplateModal = ({
  category,
  onClose,
}: SaveTemplateModalProps) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SaveTemplateInput>({
    resolver: zodResolver(saveTemplateSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: category.name, description: "" },
  });

  const saveMutation = useSaveTemplateFromCategory();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<SaveTemplateInput>();

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await saveMutation.mutateAsync({
        categoryId: category.id,
        input: {
          name: values.name.trim(),
          ...(values.description?.trim()
            ? { description: values.description.trim() }
            : {}),
        },
      });
      onClose();
    } catch (error) {
      handleApiError(
        error,
        setError,
        ["name", "description"],
        "Failed to save template",
      );
    }
  });

  return (
    <Modal open onClose={onClose} title="Save as Template" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <FormErrorSummary messages={formErrorMessages} />
        <Input
          label="Template name"
          required
          error={errors.name?.message}
          {...register("name", { onChange: clearFormErrors })}
        />
        <Input
          label="Description (optional)"
          error={errors.description?.message}
          {...register("description", { onChange: clearFormErrors })}
        />
        <p className="text-xs text-text-disabled">
          Snapshots this category's tenant-wide items as they are right now.
          Branch-specific items in this category aren't included — only items
          shared across all branches are portable enough to templatize.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
