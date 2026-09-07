import { useReducer } from "react";

export type WaiterOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type WaiterBillingMode = "LINE_ITEMS" | "PER_COVER";
export type FoodTypeFilter = "ALL" | "VEG" | "NON_VEG" | "EGG";

type OrderDraftState = {
  couponCode: string;
  selectedPromotionIds: string[];
  orderType: WaiterOrderType;
  tableId: string;
  customerId: string;
  customerName: string;
  customerGroupId: string;
  billingMode: WaiterBillingMode;
  coverCount: number;
  perCoverPriceRuleId: string;
  orderNotes: string;
  activeCategory: string | null;
  showCart: boolean;
  customerSearch: string;
  menuSearch: string;
  foodTypeFilter: FoodTypeFilter;
  selectedMenuId: string;
  courseMode: boolean;
  roundCourseNumber: number;
};

type OrderDraftAction =
  | { type: "orderTypeChanged"; value: WaiterOrderType }
  | { type: "tableChanged"; value: string }
  | { type: "customerSelected"; id: string; name: string }
  | { type: "customerCleared" }
  | { type: "customerSearchChanged"; value: string }
  | { type: "customerGroupChanged"; value: string }
  | { type: "billingModeChanged"; value: WaiterBillingMode }
  | { type: "coverCountChanged"; value: number }
  | { type: "perCoverRuleChanged"; value: string }
  | { type: "notesChanged"; value: string }
  | { type: "categoryChanged"; value: string | null }
  | { type: "cartVisibilityChanged"; value: boolean }
  | { type: "menuSearchChanged"; value: string }
  | { type: "foodTypeChanged"; value: FoodTypeFilter }
  | { type: "menuChanged"; value: string }
  | { type: "courseModeChanged"; value: boolean }
  | { type: "roundCourseChanged"; value: number }
  | { type: "couponChanged"; value: string }
  | { type: "promotionToggled"; id: string };

const initialOrderDraftState: OrderDraftState = {
  couponCode: "",
  selectedPromotionIds: [],
  orderType: "DINE_IN",
  tableId: "",
  customerId: "",
  customerName: "",
  customerGroupId: "",
  billingMode: "LINE_ITEMS",
  coverCount: 1,
  perCoverPriceRuleId: "",
  orderNotes: "",
  activeCategory: null,
  showCart: false,
  customerSearch: "",
  menuSearch: "",
  foodTypeFilter: "ALL",
  selectedMenuId: "",
  courseMode: false,
  roundCourseNumber: 1,
};

const orderDraftReducer = (
  state: OrderDraftState,
  action: OrderDraftAction,
): OrderDraftState => {
  switch (action.type) {
    case "orderTypeChanged":
      return { ...state, orderType: action.value, tableId: "" };
    case "tableChanged":
      return { ...state, tableId: action.value };
    case "customerSelected":
      return {
        ...state,
        customerId: action.id,
        customerName: action.name,
        customerSearch: "",
      };
    case "customerCleared":
      return { ...state, customerId: "", customerName: "" };
    case "customerSearchChanged":
      return { ...state, customerSearch: action.value };
    case "customerGroupChanged":
      return { ...state, customerGroupId: action.value };
    case "billingModeChanged":
      return {
        ...state,
        billingMode: action.value,
        perCoverPriceRuleId:
          action.value === "LINE_ITEMS" ? "" : state.perCoverPriceRuleId,
      };
    case "coverCountChanged":
      return { ...state, coverCount: action.value };
    case "perCoverRuleChanged":
      return { ...state, perCoverPriceRuleId: action.value };
    case "notesChanged":
      return { ...state, orderNotes: action.value };
    case "categoryChanged":
      return { ...state, activeCategory: action.value };
    case "cartVisibilityChanged":
      return { ...state, showCart: action.value };
    case "menuSearchChanged":
      return { ...state, menuSearch: action.value };
    case "foodTypeChanged":
      return { ...state, foodTypeFilter: action.value };
    case "menuChanged":
      return { ...state, selectedMenuId: action.value, activeCategory: null };
    case "courseModeChanged":
      return { ...state, courseMode: action.value };
    case "roundCourseChanged":
      return { ...state, roundCourseNumber: action.value };
    case "couponChanged":
      return { ...state, couponCode: action.value };
    case "promotionToggled":
      return {
        ...state,
        selectedPromotionIds: state.selectedPromotionIds.includes(action.id)
          ? state.selectedPromotionIds.filter((id) => id !== action.id)
          : [...state.selectedPromotionIds, action.id],
      };
  }
};

export const useOrderDraft = () => {
  const [state, dispatch] = useReducer(
    orderDraftReducer,
    initialOrderDraftState,
  );

  return {
    ...state,
    changeOrderType: (value: WaiterOrderType) =>
      dispatch({ type: "orderTypeChanged", value }),
    changeTable: (value: string) => dispatch({ type: "tableChanged", value }),
    selectCustomer: (id: string, name: string) =>
      dispatch({ type: "customerSelected", id, name }),
    clearCustomer: () => dispatch({ type: "customerCleared" }),
    changeCustomerSearch: (value: string) =>
      dispatch({ type: "customerSearchChanged", value }),
    changeCustomerGroup: (value: string) =>
      dispatch({ type: "customerGroupChanged", value }),
    changeBillingMode: (value: WaiterBillingMode) =>
      dispatch({ type: "billingModeChanged", value }),
    changeCoverCount: (value: number) =>
      dispatch({ type: "coverCountChanged", value }),
    changePerCoverRule: (value: string) =>
      dispatch({ type: "perCoverRuleChanged", value }),
    changeNotes: (value: string) => dispatch({ type: "notesChanged", value }),
    changeCategory: (value: string | null) =>
      dispatch({ type: "categoryChanged", value }),
    setCartVisible: (value: boolean) =>
      dispatch({ type: "cartVisibilityChanged", value }),
    changeMenuSearch: (value: string) =>
      dispatch({ type: "menuSearchChanged", value }),
    changeFoodType: (value: FoodTypeFilter) =>
      dispatch({ type: "foodTypeChanged", value }),
    changeMenu: (value: string) => dispatch({ type: "menuChanged", value }),
    changeCourseMode: (value: boolean) =>
      dispatch({ type: "courseModeChanged", value }),
    changeRoundCourse: (value: number) =>
      dispatch({ type: "roundCourseChanged", value }),
    changeCoupon: (value: string) => dispatch({ type: "couponChanged", value }),
    togglePromotion: (id: string) => dispatch({ type: "promotionToggled", id }),
  };
};
