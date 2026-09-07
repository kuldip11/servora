import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createMenuTagSchema, type CreateMenuTagInput } from "@pos/validation";
import { Plus, X } from "lucide-react";
import { Button, Input } from "@pos/ui";
import { useMenuTags } from "@/features/menu/hooks/useMenuTags";
import { useAddMenuTag } from "@/features/menu/hooks/useAddMenuTag";
import { useDeleteMenuTag } from "@/features/menu/hooks/useDeleteMenuTag";

import { TAG_COLORS } from "@/features/menu/constants";

export const TagsSection = () => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMenuTagInput>({
    resolver: zodResolver(createMenuTagSchema),
    defaultValues: { name: "", color: TAG_COLORS[0] ?? "#8b5cf6" },
  });
  const color = watch("color");

  const { data: tags } = useMenuTags();
  const addMutation = useAddMenuTag();
  const deleteMutation = useDeleteMenuTag();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Tags</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Labels like "Bestseller" or "Chef's Special" — create once, apply to
          any item.
        </p>
      </div>

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
        {!tags?.length && (
          <p className="text-sm text-text-disabled">
            No tags yet — add one below.
          </p>
        )}
      </div>

      <form
        onSubmit={handleSubmit((values) =>
          addMutation.mutate(values, {
            onSuccess: () => reset({ name: "", color }),
          }),
        )}
        className="flex items-end gap-2 max-w-sm"
      >
        <Input
          label="New tag"
          placeholder="Bestseller"
          error={errors.name?.message}
          {...register("name")}
        />
        <div className="flex gap-1 pb-2.5">
          {TAG_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setValue("color", c, { shouldValidate: true })}
              aria-label={`Choose ${c}`}
              className={`w-6 h-6 rounded-full ${color === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Button type="submit" size="sm" loading={addMutation.isPending}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
