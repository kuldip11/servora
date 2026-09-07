import { useEffect, useReducer } from "react";
import type { Menu } from "@pos/types";
import { Button, Input, Modal } from "@pos/ui";
import { useUpdateMenu } from "@/features/menu/hooks/useMenus";
import { FULFILLMENT_TYPES, MENU_CHANNELS } from "@/features/menu/constants";
import { MenuScheduleEditor } from "@/features/menu/components/MenuScheduleEditor";

interface BranchOption {
  id: string;
  name: string;
}

interface MenuAvailabilityState {
  channels: string[];
  fulfillmentTypes: string[];
  branchIds: string[];
  effectiveFrom: string;
}

type MenuAvailabilityAction =
  | { type: "reset"; menu: Menu; branches: BranchOption[] }
  | { type: "toggle-channel"; value: string }
  | { type: "toggle-fulfillment"; value: string }
  | { type: "toggle-branch"; value: string }
  | { type: "set-effective-from"; value: string };

const initialState: MenuAvailabilityState = {
  channels: [],
  fulfillmentTypes: [],
  branchIds: [],
  effectiveFrom: "",
};

const toggleValue = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const reducer = (
  state: MenuAvailabilityState,
  action: MenuAvailabilityAction,
): MenuAvailabilityState => {
  switch (action.type) {
    case "reset":
      return {
        channels: action.menu.availableChannels ?? [...MENU_CHANNELS],
        fulfillmentTypes: action.menu.availableFulfillmentTypes ?? [
          ...FULFILLMENT_TYPES,
        ],
        branchIds:
          action.menu.availableBranchIds ??
          action.branches.map((branch) => branch.id),
        effectiveFrom: action.menu.effectiveFrom
          ? new Date(action.menu.effectiveFrom).toISOString().slice(0, 16)
          : "",
      };
    case "toggle-channel":
      return { ...state, channels: toggleValue(state.channels, action.value) };
    case "toggle-fulfillment":
      return {
        ...state,
        fulfillmentTypes: toggleValue(state.fulfillmentTypes, action.value),
      };
    case "toggle-branch":
      return {
        ...state,
        branchIds: toggleValue(state.branchIds, action.value),
      };
    case "set-effective-from":
      return { ...state, effectiveFrom: action.value };
  }
};

interface MenuAvailabilityDialogProps {
  menu: Menu | null;
  branches: BranchOption[];
  onClose: () => void;
}

export const MenuAvailabilityDialog = ({
  menu,
  branches,
  onClose,
}: MenuAvailabilityDialogProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const updateMenu = useUpdateMenu();

  useEffect(() => {
    if (menu) dispatch({ type: "reset", menu, branches });
  }, [branches, menu]);

  return (
    <Modal
      open={!!menu}
      onClose={onClose}
      title={`Availability — ${menu?.name ?? "menu"}`}
      size="sm"
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!menu) return;
          updateMenu.mutate(
            {
              id: menu.id,
              input: {
                availableChannels:
                  state.channels.length === MENU_CHANNELS.length
                    ? null
                    : (state.channels as Menu["availableChannels"]),
                availableFulfillmentTypes:
                  state.fulfillmentTypes.length === FULFILLMENT_TYPES.length
                    ? null
                    : (state.fulfillmentTypes as Menu["availableFulfillmentTypes"]),
                availableBranchIds:
                  state.branchIds.length === branches.length
                    ? null
                    : state.branchIds,
                effectiveFrom: state.effectiveFrom
                  ? new Date(state.effectiveFrom).toISOString()
                  : null,
              },
            },
            { onSuccess: onClose },
          );
        }}
      >
        <ScopeChoices
          label="Ordering channels"
          options={MENU_CHANNELS}
          values={state.channels}
          onToggle={(value) => dispatch({ type: "toggle-channel", value })}
        />
        <ScopeChoices
          label="Fulfillment types"
          options={FULFILLMENT_TYPES}
          values={state.fulfillmentTypes}
          onToggle={(value) => dispatch({ type: "toggle-fulfillment", value })}
        />
        <ScopeChoices
          label="Branches"
          options={branches.map((branch) => ({
            value: branch.id,
            label: branch.name,
          }))}
          values={state.branchIds}
          onToggle={(value) => dispatch({ type: "toggle-branch", value })}
        />
        {state.branchIds.length < branches.length && (
          <p className="rounded bg-warning-surface px-3 py-2 text-xs text-warning">
            Branch-specific items assigned to this menu are reachable only where
            the item’s own branch and this menu’s selected branches overlap.
          </p>
        )}
        {menu && <MenuScheduleEditor menuId={menu.id} />}
        <Input
          label="Effective from (optional)"
          type="datetime-local"
          value={state.effectiveFrom}
          onChange={(event) =>
            dispatch({ type: "set-effective-from", value: event.target.value })
          }
        />
        {state.effectiveFrom && new Date(state.effectiveFrom) > new Date() && (
          <p className="text-xs text-warning">
            Pending change · becomes live{" "}
            {new Date(state.effectiveFrom).toLocaleString()}
          </p>
        )}
        <p className="text-xs text-text-secondary">
          Selecting every option makes the menu available everywhere in that
          group.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={updateMenu.isPending}>
            Save availability
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface ScopeChoicesProps {
  label: string;
  options: readonly string[] | Array<{ value: string; label: string }>;
  values: string[];
  onToggle: (value: string) => void;
}

const ScopeChoices = ({
  label,
  options,
  values,
  onToggle,
}: ScopeChoicesProps) => (
  <fieldset>
    <legend className="mb-2 text-sm font-medium text-text-primary">
      {label}
    </legend>
    <div className="grid grid-cols-2 gap-2">
      {options.map((option) => {
        const value = typeof option === "string" ? option : option.value;
        const text =
          typeof option === "string"
            ? option.split("_").join(" ")
            : option.label;
        return (
          <label
            key={value}
            className="flex items-center gap-2 text-sm text-text-secondary"
          >
            <input
              type="checkbox"
              checked={values.includes(value)}
              onChange={() => onToggle(value)}
            />
            {text}
          </label>
        );
      })}
    </div>
  </fieldset>
);
