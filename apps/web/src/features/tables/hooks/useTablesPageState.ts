import { useReducer } from "react";
import type { RestaurantTable } from "@/features/tables/types";

interface TakeawayQrData {
  branchId: string;
  branchName: string;
  enabled: boolean;
  token: string;
}

interface TablesPageState {
  showAdd: boolean;
  editing: RestaurantTable | null;
  qrTable: RestaurantTable | null;
  takeawayQrOpen: boolean;
  takeawayQr: TakeawayQrData | null;
  takeawayQrBusy: boolean;
  transferSource: RestaurantTable | null;
  mergeSource: RestaurantTable | null;
  tableSearch: string;
  statusFilter: string;
  sectionFilter: string;
}

type TablesPageAction =
  | { type: "set-add-open"; open: boolean }
  | { type: "set-editing"; table: RestaurantTable | null }
  | { type: "set-qr-table"; table: RestaurantTable | null }
  | { type: "set-takeaway-open"; open: boolean }
  | { type: "set-takeaway-qr"; data: TakeawayQrData | null }
  | { type: "set-takeaway-busy"; busy: boolean }
  | { type: "set-transfer-source"; table: RestaurantTable | null }
  | { type: "set-merge-source"; table: RestaurantTable | null }
  | { type: "set-search"; value: string }
  | { type: "set-status-filter"; value: string }
  | { type: "set-section-filter"; value: string }
  | { type: "clear-filters" };

const initialState: TablesPageState = {
  showAdd: false,
  editing: null,
  qrTable: null,
  takeawayQrOpen: false,
  takeawayQr: null,
  takeawayQrBusy: false,
  transferSource: null,
  mergeSource: null,
  tableSearch: "",
  statusFilter: "",
  sectionFilter: "",
};

const reducer = (
  state: TablesPageState,
  action: TablesPageAction,
): TablesPageState => {
  switch (action.type) {
    case "set-add-open":
      return { ...state, showAdd: action.open };
    case "set-editing":
      return { ...state, editing: action.table };
    case "set-qr-table":
      return { ...state, qrTable: action.table };
    case "set-takeaway-open":
      return { ...state, takeawayQrOpen: action.open };
    case "set-takeaway-qr":
      return { ...state, takeawayQr: action.data };
    case "set-takeaway-busy":
      return { ...state, takeawayQrBusy: action.busy };
    case "set-transfer-source":
      return { ...state, transferSource: action.table };
    case "set-merge-source":
      return { ...state, mergeSource: action.table };
    case "set-search":
      return { ...state, tableSearch: action.value };
    case "set-status-filter":
      return { ...state, statusFilter: action.value };
    case "set-section-filter":
      return { ...state, sectionFilter: action.value };
    case "clear-filters":
      return { ...state, tableSearch: "", statusFilter: "", sectionFilter: "" };
  }
};

export const useTablesPageState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    setShowAdd: (open: boolean) => dispatch({ type: "set-add-open", open }),
    setEditing: (table: RestaurantTable | null) =>
      dispatch({ type: "set-editing", table }),
    setQrTable: (table: RestaurantTable | null) =>
      dispatch({ type: "set-qr-table", table }),
    setTakeawayQrOpen: (open: boolean) =>
      dispatch({ type: "set-takeaway-open", open }),
    setTakeawayQr: (data: TakeawayQrData | null) =>
      dispatch({ type: "set-takeaway-qr", data }),
    setTakeawayQrBusy: (busy: boolean) =>
      dispatch({ type: "set-takeaway-busy", busy }),
    setTransferSource: (table: RestaurantTable | null) =>
      dispatch({ type: "set-transfer-source", table }),
    setMergeSource: (table: RestaurantTable | null) =>
      dispatch({ type: "set-merge-source", table }),
    setTableSearch: (value: string) => dispatch({ type: "set-search", value }),
    setStatusFilter: (value: string) =>
      dispatch({ type: "set-status-filter", value }),
    setSectionFilter: (value: string) =>
      dispatch({ type: "set-section-filter", value }),
    clearFilters: () => dispatch({ type: "clear-filters" }),
  };
};
