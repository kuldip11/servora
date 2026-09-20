import { usePermissions } from "@/shared/auth/permissions";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { branchFormSchema, type BranchFormValues } from "@pos/validation";
import { Plus, Building2 } from "lucide-react";
import { Button, EmptyState, Page, PageHeader, Grid } from "@pos/ui";
import type { Branch } from "@pos/types";
import { useBranches } from "@/features/branches/hooks/useBranches";
import { useCreateBranch } from "@/features/branches/hooks/useCreateBranch";
import { useUpdateBranch } from "@/features/branches/hooks/useUpdateBranch";
import { useDeactivateBranch } from "@/features/branches/hooks/useDeactivateBranch";
import { BranchCard } from "@/features/branches/components/BranchCard";
import { BranchFormModal } from "@/features/branches/components/BranchFormModal";

const emptyForm: BranchFormValues = {
  name: "",
  code: "",
  timezone: "Asia/Kolkata",
  currency: "INR",
  address: "",
  phone: "",
  dineInEnabled: true,
  takeawayEnabled: true,
  deliveryEnabled: true,
  onlineEnabled: true,
  tablesEnabled: true,
};

export const BranchesPage = () => {
  const { has } = usePermissions();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: emptyForm,
  });
  const form = watch();

  const { data: branches, isLoading } = useBranches();
  const addMutation = useCreateBranch();
  const updateMutation = useUpdateBranch();
  const deactivateMutation = useDeactivateBranch();

  function openEdit(branch: Branch) {
    setEditing(branch);
    reset({
      name: branch.name,
      code: branch.code,
      timezone: branch.timezone,
      currency: branch.currency,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      dineInEnabled: branch.dineInEnabled,
      takeawayEnabled: branch.takeawayEnabled,
      deliveryEnabled: branch.deliveryEnabled,
      onlineEnabled: branch.onlineEnabled,
      tablesEnabled: branch.tablesEnabled,
    });
  }

  return (
    <Page>
      <PageHeader
        title="Branches"
        description={`${branches?.length ?? 0} branch${branches?.length === 1 ? "" : "es"} — each has its own menu, tables, staff, and orders`}
        actions={
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" />
            Add Branch
          </Button>
        }
      />

      {isLoading ? (
        <Grid columns={{ base: 1, sm: 2, lg: 3 }} gap="md">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-surface-secondary"
            />
          ))}
        </Grid>
      ) : !branches?.length ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add your first branch to start setting up its menu, tables, and staff."
          action={
            has("branch:create") && (
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4" /> Add Branch
              </Button>
            )
          }
        />
      ) : (
        <Grid columns={{ base: 1, sm: 2, lg: 3 }} gap="md">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onEdit={openEdit}
              onDeactivate={(b) => {
                if (
                  confirm(
                    `Deactivate "${b.name}"? Its data stays intact but it'll stop showing up as an active location.`,
                  )
                )
                  deactivateMutation.mutate(b.id);
              }}
            />
          ))}
        </Grid>
      )}

      <BranchFormModal
        mode="add"
        open={showAdd}
        form={form}
        errors={errors}
        register={register}
        setValue={setValue}
        handleSubmit={handleSubmit}
        pending={addMutation.isPending}
        onClose={() => {
          setShowAdd(false);
          reset(emptyForm);
        }}
        onSubmit={(values) =>
          addMutation.mutate(values, {
            onSuccess: () => {
              setShowAdd(false);
              reset(emptyForm);
            },
          })
        }
      />
      <BranchFormModal
        mode="edit"
        open={!!editing}
        form={form}
        errors={errors}
        register={register}
        setValue={setValue}
        handleSubmit={handleSubmit}
        pending={updateMutation.isPending}
        onClose={() => {
          setEditing(null);
          reset(emptyForm);
        }}
        onSubmit={(values) => {
          if (editing)
            updateMutation.mutate(
              { id: editing.id, input: values },
              {
                onSuccess: () => {
                  setEditing(null);
                  reset(emptyForm);
                },
              },
            );
        }}
      />
    </Page>
  );
};
