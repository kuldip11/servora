import { useReducer, type Dispatch, type SetStateAction } from "react";
import type { FoodType, MenuItem, MenuItemStatus } from "@pos/types";
import type { MenuMoreSectionId, MenuTabId } from "@/features/menu/constants";

interface MenuPageState {
  tab: MenuTabId;
  moreSection: MenuMoreSectionId | null;
  showImport: boolean;
  savingTemplateFor: { id: string; name: string } | null;
  selectMode: boolean;
  selectedIds: string[];
  itemForm: { categoryId: string; item: MenuItem | null } | null;
  itemSearch: string;
  foodTypeFilter: FoodType | "ALL";
  statusFilter: MenuItemStatus | "ALL";
  publishFilter: "ALL" | "PUBLISHED" | "DRAFT";
}

type Action = { patch: Partial<MenuPageState> };

const initialState: MenuPageState = {
  tab: "items",
  moreSection: null,
  showImport: false,
  savingTemplateFor: null,
  selectMode: false,
  selectedIds: [],
  itemForm: null,
  itemSearch: "",
  foodTypeFilter: "ALL",
  statusFilter: "ALL",
  publishFilter: "ALL",
};

const reducer = (state: MenuPageState, action: Action): MenuPageState => ({
  ...state,
  ...action.patch,
});

const resolve = <T>(current: T, next: SetStateAction<T>): T =>
  typeof next === "function" ? (next as (previous: T) => T)(current) : next;

export const useMenuPageState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const setter =
    <K extends keyof MenuPageState>(
      key: K,
    ): Dispatch<SetStateAction<MenuPageState[K]>> =>
    (next) =>
      dispatch({
        patch: { [key]: resolve(state[key], next) } as Pick<MenuPageState, K>,
      });

  const setTab = (tab: MenuTabId) =>
    dispatch({
      patch: {
        tab,
        ...(tab !== "more" ? { moreSection: null } : {}),
      },
    });

  const toggleSelectMode = () =>
    dispatch({ patch: { selectMode: !state.selectMode, selectedIds: [] } });

  return {
    ...state,
    setTab,
    toggleSelectMode,
    setMoreSection: setter("moreSection"),
    setShowImport: setter("showImport"),
    setSavingTemplateFor: setter("savingTemplateFor"),
    setSelectedIds: setter("selectedIds"),
    setItemForm: setter("itemForm"),
    setItemSearch: setter("itemSearch"),
    setFoodTypeFilter: setter("foodTypeFilter"),
    setStatusFilter: setter("statusFilter"),
    setPublishFilter: setter("publishFilter"),
  };
};
