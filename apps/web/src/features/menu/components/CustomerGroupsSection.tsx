import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import type { CustomerGroup } from "@pos/types";
import { createCustomersApi } from "@pos/api-client";
import { apiClient } from "@/shared/lib/api-client";
import { queryClient } from "@/shared/lib/query-client";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const customersApi = createCustomersApi(apiClient);

const customerGroupFormSchema = z
  .object({
    name: z.string().trim().min(1, "Group name is required").max(120),
    discountType: z.enum(["NONE", "PERCENT", "FIXED"]),
    discount: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.discountType === "NONE") return;
    const amount = Number(values.discount);
    if (!values.discount.trim() || !Number.isFinite(amount) || amount < 0) {
      ctx.addIssue({
        code: "custom",
        path: ["discount"],
        message: "Enter a valid non-negative discount",
      });
    } else if (values.discountType === "PERCENT" && amount > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discount"],
        message: "Percent discount cannot exceed 100",
      });
    }
  });

type CustomerGroupFormValues = z.infer<typeof customerGroupFormSchema>;

const defaultValues: CustomerGroupFormValues = {
  name: "",
  discountType: "NONE",
  discount: "",
};

export const CustomerGroupsSection = () => {
  const key = ["customer-groups"];
  const groupsQuery = useQuery<CustomerGroup[]>({
    queryKey: key,
    queryFn: customersApi.listGroups,
  });
  const groups = groupsQuery.data;

  const form = useForm<CustomerGroupFormValues>({
    resolver: zodResolver(customerGroupFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty, isValid },
  } = form;
  const discountType = watch("discountType");
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<CustomerGroupFormValues>();

  const save = useMutation({
    mutationFn: async ({
      values,
      editingId,
    }: {
      values: CustomerGroupFormValues;
      editingId: string | null;
    }) => {
      const payload = {
        name: values.name.trim(),
        discountPercent:
          values.discountType === "PERCENT" && values.discount !== ""
            ? Number(values.discount)
            : null,
        discountFixed:
          values.discountType === "FIXED" && values.discount !== ""
            ? Number(values.discount)
            : null,
      };
      return editingId
        ? customersApi.updateGroup(editingId, payload)
        : customersApi.createGroup(payload);
    },
    onSuccess: async () => {
      reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: key });
      notifySuccess("Customer group saved");
    },
  });
  const remove = useMutation({
    mutationFn: customersApi.deleteGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (error) => notifyError(error, "Failed to delete customer group"),
  });

  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);

  useEffect(() => {
    if (!editingGroup) return;
    reset({
      name: editingGroup.name,
      discountType:
        editingGroup.discountPercent != null
          ? "PERCENT"
          : editingGroup.discountFixed != null
            ? "FIXED"
            : "NONE",
      discount:
        editingGroup.discountPercent != null
          ? String(editingGroup.discountPercent)
          : editingGroup.discountFixed != null
            ? String(editingGroup.discountFixed)
            : "",
    });
  }, [editingGroup, reset]);

  const clear = () => {
    setEditingGroup(null);
    reset(defaultValues);
    clearFormErrors();
  };

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await save.mutateAsync({ values, editingId: editingGroup?.id ?? null });
      setEditingGroup(null);
    } catch (error) {
      handleApiError(
        error,
        setError,
        ["name", "discountType", "discount"],
        "Failed to save customer group",
        { discountPercent: "discount", discountFixed: "discount" },
      );
    }
  });

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Customer groups / memberships
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Create staff-assigned groups such as corporate accounts or VIP
          memberships, then scope item price rules to them.
        </p>
      </div>

      {groupsQuery.isError && !groups ? (
        <QueryErrorState
          title="Unable to load customer groups"
          description="Customer groups could not be loaded. Retry before making membership changes."
          onRetry={() => void groupsQuery.refetch()}
          isRetrying={groupsQuery.isFetching}
        />
      ) : null}
      {groupsQuery.isError && groups ? (
        <StaleDataBanner
          message="Customer-group refresh failed — showing the last available data."
          onRetry={() => void groupsQuery.refetch()}
          isRetrying={groupsQuery.isFetching}
        />
      ) : null}

      <form
        className="grid max-w-2xl grid-cols-1 gap-2 md:grid-cols-3"
        onSubmit={submit}
      >
        <div className="md:col-span-3">
          <FormErrorSummary messages={formErrorMessages} />
        </div>
        <Input
          label="Group name"
          required
          placeholder="Corporate · Acme Ltd"
          error={errors.name?.message}
          {...register("name", { onChange: clearFormErrors })}
        />
        <label className="text-sm font-medium text-text-primary">
          Default discount
          <select
            className="mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            {...register("discountType", { onChange: clearFormErrors })}
          >
            <option value="NONE">None</option>
            <option value="PERCENT">Percent</option>
            <option value="FIXED">Fixed amount</option>
          </select>
        </label>
        {discountType !== "NONE" ? (
          <Input
            label={discountType === "PERCENT" ? "Percent" : "Amount"}
            type="number"
            min="0"
            step="0.01"
            error={errors.discount?.message}
            {...register("discount", { onChange: clearFormErrors })}
          />
        ) : (
          <div />
        )}
        <div className="flex gap-2 md:col-span-3">
          <Button
            type="submit"
            disabled={
              !isValid ||
              save.isPending ||
              groupsQuery.isError ||
              (!!editingGroup && !isDirty)
            }
            loading={save.isPending}
          >
            {editingGroup ? "Update group" : "Create group"}
          </Button>
          {editingGroup ? (
            <Button type="button" variant="secondary" onClick={clear}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {!groupsQuery.isError || groups ? (
        <div className="divide-y divide-divider rounded-lg border border-border">
          {!groups?.length ? (
            <p className="p-4 text-sm text-text-secondary">
              No customer groups yet.
            </p>
          ) : null}
          {groups?.map((group) => (
            <div
              key={group.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {group.name}
                </p>
                <p className="text-xs text-text-secondary">
                  {group.discountPercent != null
                    ? `${Number(group.discountPercent)}% default discount`
                    : group.discountFixed != null
                      ? `₹${Number(group.discountFixed).toFixed(2)} default discount`
                      : "No default discount · use scoped price rules"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingGroup(group)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  loading={remove.isPending}
                  onClick={() => {
                    if (confirm(`Delete customer group "${group.name}"?`))
                      remove.mutate(group.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
};
