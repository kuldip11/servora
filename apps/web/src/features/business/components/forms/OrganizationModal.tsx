import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  FormErrorSummary,
  FieldErrorText,
  Input,
  Modal,
} from "@pos/ui";
import type { OrganizationSummary } from "@pos/types";
import {
  organizationBusinessFormSchema,
  type OrganizationBusinessFormValues,
} from "@pos/validation";
import { businessService } from "@/features/business/services/business.service";
import { notifyError, notifySuccess } from "@/shared/lib/notify";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";
import {
  inputClass,
  organizationDefaults,
  organizationFieldPaths,
} from "./business-form-defaults";

export const OrganizationModal = ({
  open,
  organization,
  onClose,
  onSaved,
}: {
  open: boolean;
  organization: OrganizationSummary | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) => {
  const form = useForm<OrganizationBusinessFormValues>({
    resolver: zodResolver(organizationBusinessFormSchema),
    defaultValues: organizationDefaults,
    mode: "onTouched",
    reValidateMode: "onChange",
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<OrganizationBusinessFormValues>();
  useEffect(() => {
    if (open) {
      clearFormErrors();
      form.reset(
        organization
          ? ({
              ...organizationDefaults,
              ...organization,
            } as OrganizationBusinessFormValues)
          : organizationDefaults,
      );
    }
  }, [clearFormErrors, form, open, organization]);
  const mutation = useMutation({
    mutationFn: async (
      values: OrganizationBusinessFormValues,
    ): Promise<void> => {
      if (organization)
        await businessService.updateOrganization(organization.id, values);
      else await businessService.createOrganization(values);
    },
    onSuccess: async () => {
      notifySuccess(
        organization ? "Organization updated" : "Organization created",
      );
      await onSaved();
      onClose();
    },
    onError: (error) =>
      handleApiError(
        error,
        form.setError,
        organizationFieldPaths,
        "Could not save organization",
      ),
  });
  const archiveMutation = useMutation({
    mutationFn: () => businessService.archiveOrganization(organization!.id),
    onSuccess: async () => {
      notifySuccess("Organization archived");
      await onSaved();
      onClose();
    },
    onError: (error) => notifyError(error, "Could not archive organization"),
  });
  const e = form.formState.errors;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={organization ? "Edit business" : "Add business"}
      size="xl"
    >
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={form.handleSubmit((values) => {
          clearFormErrors();
          mutation.mutate(values);
        })}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Organization / Business name"
            required
            placeholder="e.g. KKS Hospitality Pvt Ltd"
            error={e.name?.message}
            {...form.register("name")}
          />
          <label className="text-sm font-medium">
            Business type{" "}
            <span className="text-danger" aria-hidden="true">
              *
            </span>
            <select
              aria-required="true"
              className={`mt-1 ${inputClass}`}
              aria-invalid={Boolean(e.businessType)}
              {...form.register("businessType")}
            >
              {[
                "RESTAURANT_GROUP",
                "INDEPENDENT_RESTAURANT",
                "HOSPITALITY_GROUP",
                "CLOUD_KITCHEN_GROUP",
                "CAFE_GROUP",
                "QSR_GROUP",
                "FOOD_SERVICE_COMPANY",
                "OTHER",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <FieldErrorText message={e.businessType?.message} />
          </label>
          <Input
            label="Primary contact name"
            required
            placeholder="e.g. Kuldip Sharma"
            error={e.primaryContactName?.message}
            {...form.register("primaryContactName")}
          />
          <Input
            label="Business email"
            required
            type="email"
            placeholder="e.g. operations@kkshospitality.com"
            error={e.businessEmail?.message}
            {...form.register("businessEmail")}
          />
          <Input
            label="Business phone"
            required
            placeholder="e.g. +91 98765 43210"
            error={e.businessPhone?.message}
            {...form.register("businessPhone")}
          />
          <Input
            label="Website (optional)"
            placeholder="e.g. https://kkshospitality.com"
            error={e.website?.message}
            {...form.register("website")}
          />
          <Input
            label="Address line 1"
            required
            placeholder="Street address and building"
            error={e.addressLine1?.message}
            {...form.register("addressLine1")}
          />
          <Input
            label="Address line 2 (optional)"
            error={e.addressLine2?.message}
            placeholder="Floor, suite or landmark"
            {...form.register("addressLine2")}
          />
          <Input
            label="City"
            required
            placeholder="e.g. Gurugram"
            error={e.city?.message}
            {...form.register("city")}
          />
          <Input
            label="State / Province"
            required
            placeholder="e.g. Haryana"
            error={e.stateProvince?.message}
            {...form.register("stateProvince")}
          />
          <Input
            label="Postal code"
            required
            placeholder="e.g. 122001"
            error={e.postalCode?.message}
            {...form.register("postalCode")}
          />
          <Input
            label="Country code"
            required
            placeholder="e.g. IN"
            error={e.country?.message}
            {...form.register("country")}
          />
          <Input
            label="Timezone"
            required
            placeholder="e.g. Asia/Kolkata"
            error={e.timezone?.message}
            {...form.register("timezone")}
          />
          <Input
            label="Currency"
            required
            placeholder="e.g. INR"
            error={e.currency?.message}
            {...form.register("currency")}
          />
          <Input
            label="Legal name (optional)"
            error={e.legalName?.message}
            placeholder="Registered legal entity name"
            {...form.register("legalName")}
          />
          <Input
            label="GSTIN (optional)"
            placeholder="e.g. 06ABCDE1234F1Z5"
            error={e.gstin?.message}
            {...form.register("gstin")}
          />
          <Input
            label="PAN (optional)"
            placeholder="e.g. ABCDE1234F"
            error={e.pan?.message}
            {...form.register("pan")}
          />
          <Input
            label="Company registration (optional)"
            error={e.companyRegistrationNumber?.message}
            placeholder="e.g. CIN or registration number"
            {...form.register("companyRegistrationNumber")}
          />
          <Input
            label="Tax registration (optional)"
            error={e.taxRegistrationNumber?.message}
            placeholder="Local tax registration number"
            {...form.register("taxRegistrationNumber")}
          />
          <Input
            label="Logo URL (optional)"
            placeholder="https://example.com/logo.png"
            error={e.logoUrl?.message}
            {...form.register("logoUrl")}
          />
        </div>
        <FormErrorSummary messages={formErrorMessages} />
        <div className="flex justify-between gap-2">
          {organization ? (
            <Button
              type="button"
              variant="danger"
              loading={archiveMutation.isPending}
              onClick={() =>
                window.confirm("Archive this organization?") &&
                archiveMutation.mutate()
              }
            >
              Archive
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={
                !form.formState.isValid ||
                mutation.isPending ||
                (Boolean(organization) && !form.formState.isDirty)
              }
            >
              {mutation.isPending ? "Saving…" : "Save business"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
