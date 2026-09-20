import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMenuTagSchema, type CreateMenuTagInput } from "@pos/validation";
import { Plus, X } from "lucide-react";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import { useAddMenuTag } from "@/features/menu/hooks/useAddMenuTag";
import { useDeleteMenuTag } from "@/features/menu/hooks/useDeleteMenuTag";

import { TAG_COLORS } from "@/features/menu/constants";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

export const TagsSection = () => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateMenuTagInput>({
    resolver: zodResolver(createMenuTagSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { name: "", color: TAG_COLORS[0] ?? "#8b5cf6" },
  });
  const color = watch("color");

  const tagsQuery = useMenuTags();
  const tags = tagsQuery.data;
  const addMutation = useAddMenuTag();
  const deleteMutation = useDeleteMenuTag();
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<CreateMenuTagInput>();

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await addMutation.mutateAsync(values);
      reset({ name: "", color });
    } catch (error) {
      handleApiError(
        error,
        setError,
        ["name", "color"],
        "Failed to create tag",
      );
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Tags</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Labels like "Bestseller" or "Chef's Special" — create once, apply to
          any item.
        </p>
      </div>

      {tagsQuery.isError && !tags ? (
        <QueryErrorState
          title="Unable to load tags"
          description="Tags could not be loaded. Retry before making tag changes."
          onRetry={() => void tagsQuery.refetch()}
          isRetrying={tagsQuery.isFetching}
        />
      ) : null}
      {tagsQuery.isError && tags ? (
        <StaleDataBanner
          message="Tag refresh failed — showing the last available tags."
          onRetry={() => void tagsQuery.refetch()}
          isRetrying={tagsQuery.isFetching}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tags?.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color ?? "#8b5cf6" }}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete tag "${tag.name}"?`))
                  deleteMutation.mutate(tag.id);
              }}
              aria-label={`Delete tag ${tag.name}`}
              className="hover:bg-black/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        {!tagsQuery.isError && !tags?.length && (
          <p className="text-sm text-text-disabled">
            No tags yet — add one below.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-3 max-w-sm">
        <FormErrorSummary messages={formErrorMessages} />
        <div className="flex items-end gap-2">
          <Input
            label="New tag"
            required
            placeholder="Bestseller"
            error={errors.name?.message}
            {...register("name", { onChange: clearFormErrors })}
          />
          <div className="flex gap-1 pb-2.5">
            {TAG_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => {
                  clearFormErrors();
                  setValue("color", c, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                aria-label={`Choose ${c}`}
                className={`w-6 h-6 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button
            type="submit"
            size="sm"
            loading={addMutation.isPending}
            disabled={addMutation.isPending || tagsQuery.isError}
            aria-label="Create tag"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
