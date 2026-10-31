import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormErrorSummary, Modal } from "@pos/ui";
import type { Branch } from "@pos/types";
import {
  businessBranchFormSchema,
  type BusinessBranchFormValues,
} from "@pos/validation";
import {
  useArchiveBranch,
  useSaveBranch,
} from "@/features/business/hooks/useBusiness";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import { usePermissions } from "@/shared/auth/permissions";
import { BranchDetailsFields } from "./BranchDetailsFields";
import { BranchFormActions } from "./BranchFormActions";
import { BranchScheduleFields } from "./BranchScheduleFields";
import { CapabilityGrid } from "./CapabilityGrid";
import { branchDefaults, branchFieldPaths } from "./business-form-defaults";

export const BranchModal = ({
  open,
  branch,
  currency,
  onClose,
  onSaved,
}: {
  open: boolean;
  branch: Branch | null;
  currency: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const { has } = usePermissions();
  const form = useForm<BusinessBranchFormValues>({
    resolver: zodResolver(businessBranchFormSchema),
    defaultValues: branchDefaults,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<BusinessBranchFormValues>();
  useEffect(() => {
    if (open) {
      clearFormErrors();
      form.reset(
        branch
          ? ({
              ...branchDefaults,
              ...branch,
              status: branch.isActive ? "ACTIVE" : "INACTIVE",
              addressLine1: branch.addressLine1 || branch.address || "",
            } as BusinessBranchFormValues)
          : branchDefaults,
      );
    }
  }, [branch, clearFormErrors, form, open]);
  const mutation = useSaveBranch({ branchId: branch?.id, currency });
  const archiveMutation = useArchiveBranch(branch?.id ?? "");
  const values = form.watch();
  const finishSave = (message: string) => {
    notifySuccess(message);
    void onSaved()
      .then(onClose)
      .catch((error: unknown) =>
        notifyError(error, "Could not refresh the business structure"),
      );
  };
  const submit = form.handleSubmit((values) => {
    clearFormErrors();
    mutation.mutate(values, {
      onSuccess: () => finishSave(branch ? "Branch updated" : "Branch created"),
      onError: (error) =>
        handleApiError(
          error,
          form.setError,
          branchFieldPaths,
          "Could not save branch",
        ),
    });
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={branch ? "Edit Branch" : "Create Branch"}
      size="xl"
    >
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={(event) => void submit(event)}
      >
        <BranchDetailsFields form={form} values={values} />
        <BranchScheduleFields form={form} values={values} />
        <CapabilityGrid
          values={{
            dineInEnabled: values.dineInEnabled,
            takeawayEnabled: values.takeawayEnabled,
            deliveryEnabled: values.deliveryEnabled,
            customerQrEnabled: values.customerQrEnabled,
            tablesEnabled: values.tablesEnabled,
            kdsEnabled: values.kdsEnabled,
            waiterAppEnabled: values.waiterAppEnabled,
            inventoryTrackingEnabled: values.inventoryTrackingEnabled ?? true,
          }}
          setValue={(key, value) =>
            form.setValue(
              key as keyof BusinessBranchFormValues,
              value as never,
              { shouldValidate: true },
            )
          }
        />
        <FormErrorSummary messages={formErrorMessages} />
        <BranchFormActions
          showArchive={Boolean(branch) && has("branch:archive")}
          isArchiving={archiveMutation.isPending}
          onArchive={() => {
            if (!window.confirm("Deactivate this branch?")) return;
            archiveMutation.mutate(undefined, {
              onSuccess: () => finishSave("Branch deactivated"),
              onError: (error) =>
                notifyError(error, "Could not deactivate branch"),
            });
          }}
          onClose={onClose}
          isSaving={mutation.isPending}
          canSave={
            form.formState.isValid &&
            !mutation.isPending &&
            (!branch || form.formState.isDirty)
          }
        />
      </form>
    </Modal>
  );
};
