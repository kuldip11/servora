import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  FormErrorSummary,
  Input,
  QueryErrorState,
  StaleDataBanner,
} from "@pos/ui";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import {
  useCreateKitchenStation,
  useDeleteKitchenStation,
  useKitchenStations,
} from "@/features/menu/hooks/useKitchenStations";
import { appUrls } from "@/config/app-urls";
import { useFormApiErrors } from "@/shared/hooks/useFormApiErrors";

const kitchenStationFormSchema = z.object({
  name: z.string().trim().min(1, "Station name is required").max(120),
});
type KitchenStationFormValues = z.infer<typeof kitchenStationFormSchema>;

export const KitchenStationsSection = () => {
  const stationsQuery = useKitchenStations();
  const create = useCreateKitchenStation();
  const remove = useDeleteKitchenStation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isValid },
  } = useForm<KitchenStationFormValues>({
    resolver: zodResolver(kitchenStationFormSchema),
    mode: "onChange",
    defaultValues: { name: "" },
  });
  const { formErrorMessages, clearFormErrors, handleApiError } =
    useFormApiErrors<KitchenStationFormValues>();

  const submit = handleSubmit(async (values) => {
    clearFormErrors();
    try {
      await create.mutateAsync({ name: values.name.trim() });
      reset();
    } catch (error) {
      handleApiError(
        error,
        setError,
        ["name"],
        "Failed to create kitchen station",
      );
    }
  });

  const stations = stationsQuery.data;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Kitchen stations
        </h2>
        <p className="mt-0.5 text-sm text-text-secondary">
          Create branch stations, then route each item or modifier from the item
          editor.
        </p>
      </div>

      {stationsQuery.isError && !stations ? (
        <QueryErrorState
          title="Unable to load kitchen stations"
          description="Kitchen stations could not be loaded. Retry before changing routing configuration."
          onRetry={() => void stationsQuery.refetch()}
          isRetrying={stationsQuery.isFetching}
        />
      ) : null}
      {stationsQuery.isError && stations ? (
        <StaleDataBanner
          message="Kitchen-station refresh failed — showing the last available stations."
          onRetry={() => void stationsQuery.refetch()}
          isRetrying={stationsQuery.isFetching}
        />
      ) : null}

      <form className="max-w-md space-y-2" onSubmit={submit}>
        <FormErrorSummary messages={formErrorMessages} />
        <div className="flex items-end gap-2">
          <Input
            label="New station"
            placeholder="Grill"
            error={errors.name?.message}
            {...register("name", { onChange: clearFormErrors })}
          />
          <Button
            type="submit"
            loading={create.isPending}
            disabled={!isValid || create.isPending || stationsQuery.isError}
          >
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </form>

      {stationsQuery.isLoading ? (
        <p className="text-sm text-text-secondary">Loading stations…</p>
      ) : !stationsQuery.isError && !stations?.length ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-text-secondary">
          No stations configured. Orders remain in the undifferentiated kitchen
          flow.
        </p>
      ) : stations ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {stations.map((station) => (
            <div key={station.id} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="font-medium text-text-primary">{station.name}</p>
                <p className="text-xs text-text-secondary">
                  {station.printerIdentifier ?? "No printer assigned"}
                </p>
              </div>
              <a
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:underline"
                href={`${appUrls.kitchen}?stationId=${station.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open KDS
              </a>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Delete ${station.name}`}
                loading={remove.isPending}
                onClick={() => remove.mutate(station.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
