import { useReducer } from "react";
import type { StaffRow } from "@/features/staff/services/staff.service";

type StaffTab = "team" | "roles";

interface StaffPageState {
  showAdd: boolean;
  editing: StaffRow | null;
  page: number;
  search: string;
  statusFilter: string;
  activeTab: StaffTab;
  pageSize: number;
}

type Action =
  | { type: "set-add-open"; open: boolean }
  | { type: "set-editing"; member: StaffRow | null }
  | { type: "set-page"; page: number }
  | { type: "set-search"; search: string }
  | { type: "set-status"; status: string }
  | { type: "set-tab"; tab: StaffTab }
  | { type: "set-page-size"; pageSize: number }
  | { type: "clear-filters" };

const initialState: StaffPageState = {
  showAdd: false,
  editing: null,
  page: 1,
  search: "",
  statusFilter: "",
  activeTab: "team",
  pageSize: 25,
};

const reducer = (state: StaffPageState, action: Action): StaffPageState => {
  switch (action.type) {
    case "set-add-open":
      return { ...state, showAdd: action.open };
    case "set-editing":
      return { ...state, editing: action.member };
    case "set-page":
      return { ...state, page: action.page };
    case "set-search":
      return { ...state, search: action.search, page: 1 };
    case "set-status":
      return { ...state, statusFilter: action.status, page: 1 };
    case "set-tab":
      return { ...state, activeTab: action.tab };
    case "set-page-size":
      return { ...state, pageSize: action.pageSize, page: 1 };
    case "clear-filters":
      return { ...state, search: "", statusFilter: "", page: 1 };
  }
};

export const useStaffPageState = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    setShowAdd: (open: boolean) => dispatch({ type: "set-add-open", open }),
    setEditing: (member: StaffRow | null) =>
      dispatch({ type: "set-editing", member }),
    setPage: (page: number) => dispatch({ type: "set-page", page }),
    setSearch: (search: string) => dispatch({ type: "set-search", search }),
    setStatusFilter: (status: string) =>
      dispatch({ type: "set-status", status }),
    setActiveTab: (tab: StaffTab) => dispatch({ type: "set-tab", tab }),
    setPageSize: (pageSize: number) =>
      dispatch({ type: "set-page-size", pageSize }),
    clearFilters: () => dispatch({ type: "clear-filters" }),
  };
};
