"use client";

import { useReducer } from "react";
import { CustomerCartScreen } from "./customer/CustomerCartScreen";
import { CustomerCustomizeScreen } from "./customer/CustomerCustomizeScreen";
import { CustomerMenuScreen } from "./customer/CustomerMenuScreen";
import { CustomerStatusScreen } from "./customer/CustomerStatusScreen";

type CustomerDemoScreen = "menu" | "customize" | "cart" | "status";

const demoScreens: CustomerDemoScreen[] = [
  "menu",
  "customize",
  "cart",
  "status",
];

interface CustomerDemoState {
  screen: CustomerDemoScreen;
  largeSize: boolean;
  extraMushrooms: boolean;
  quantity: number;
  cartQuantities: number[];
  serviceMessage: string | null;
  menuQuery: string;
  menuCategory: string;
  extras: Record<string, boolean>;
  couponApplied: boolean;
}

type CustomerDemoAction =
  | { type: "patch"; patch: Partial<CustomerDemoState> }
  | { type: "toggle-extra"; label: string; index: number }
  | { type: "set-cart-quantity"; index: number; value: number };

const initialState: CustomerDemoState = {
  screen: "menu",
  largeSize: true,
  extraMushrooms: true,
  quantity: 1,
  cartQuantities: [1, 1],
  serviceMessage: null,
  menuQuery: "",
  menuCategory: "For you",
  extras: {
    "Extra mushrooms · + ₹60": true,
    "Chilli oil · + ₹30": false,
    "Gluten-free crust · + ₹90": false,
  },
  couponApplied: false,
};

const reducer = (
  state: CustomerDemoState,
  action: CustomerDemoAction,
): CustomerDemoState => {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.patch };
    case "toggle-extra":
      return {
        ...state,
        extras: {
          ...state.extras,
          [action.label]: !state.extras[action.label],
        },
        ...(action.index === 0
          ? { extraMushrooms: !state.extraMushrooms }
          : {}),
      };
    case "set-cart-quantity":
      return {
        ...state,
        cartQuantities: state.cartQuantities.map((quantityValue, itemIndex) =>
          itemIndex === action.index ? action.value : quantityValue,
        ),
      };
  }
};

export const CustomerDemo = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const {
    screen,
    largeSize,
    extraMushrooms,
    quantity,
    cartQuantities,
    serviceMessage,
    menuQuery,
    menuCategory,
    extras,
    couponApplied,
  } = state;

  const patch = (next: Partial<CustomerDemoState>) =>
    dispatch({ type: "patch", patch: next });

  const customizedPrice =
    (560 + (largeSize ? 170 : 0) + (extraMushrooms ? 60 : 0)) * quantity;
  const cartSubtotal = 790 * cartQuantities[0]! + 380 * cartQuantities[1]!;
  const cartTax = cartSubtotal * 0.05;

  const toggleExtra = (label: string, index: number) =>
    dispatch({ type: "toggle-extra", label, index });

  const changeCartQuantity = (index: number, value: number) =>
    dispatch({ type: "set-cart-quantity", index, value });

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div
        role="tablist"
        aria-label="Customer ordering demo screens"
        className="mb-3 grid grid-cols-4 gap-1 rounded-xl bg-[#e8ece8] p-1"
      >
        {demoScreens.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={screen === item}
            onClick={() => patch({ screen: item })}
            className={`rounded-lg px-1 py-2 text-[10px] font-bold capitalize ${
              screen === item
                ? "bg-white text-[#174e36] shadow-sm"
                : "text-[#657068]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="relative h-[520px] overflow-hidden rounded-[30px] border-[6px] border-[#172019] bg-[#f6f2e8] text-[#172019] shadow-2xl">
        {screen === "menu" && (
          <CustomerMenuScreen
            menuQuery={menuQuery}
            menuCategory={menuCategory}
            onMenuQueryChange={(value) => patch({ menuQuery: value })}
            onMenuCategoryChange={(value) => patch({ menuCategory: value })}
            onCustomize={() => patch({ screen: "customize" })}
            onViewCart={() => patch({ screen: "cart" })}
          />
        )}
        {screen === "customize" && (
          <CustomerCustomizeScreen
            largeSize={largeSize}
            quantity={quantity}
            extras={extras}
            customizedPrice={customizedPrice}
            onLargeSizeChange={(value) => patch({ largeSize: value })}
            onToggleExtra={toggleExtra}
            onQuantityChange={(value) => patch({ quantity: value })}
            onClose={() => patch({ screen: "menu" })}
            onAddToOrder={() => patch({ screen: "cart" })}
          />
        )}
        {screen === "cart" && (
          <CustomerCartScreen
            quantities={cartQuantities}
            couponApplied={couponApplied}
            subtotal={cartSubtotal}
            tax={cartTax}
            onQuantityChange={changeCartQuantity}
            onToggleCoupon={() => patch({ couponApplied: !couponApplied })}
            onBackToMenu={() => patch({ screen: "menu" })}
            onEditChoices={() => patch({ screen: "customize" })}
            onSubmit={() => patch({ screen: "status" })}
          />
        )}
        {screen === "status" && (
          <CustomerStatusScreen
            serviceMessage={serviceMessage}
            onServiceRequest={(label) =>
              patch({ serviceMessage: `${label} request sent` })
            }
          />
        )}
      </div>
    </div>
  );
};
