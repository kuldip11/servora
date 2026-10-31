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

  const extraPrices: Record<string, number> = {
    "Extra mushrooms · + ₹60": 60,
    "Chilli oil · + ₹30": 30,
    "Gluten-free crust · + ₹90": 90,
  };
  const selectedExtras = Object.entries(extras)
    .filter(([, selected]) => selected)
    .map(([label]) => label);
  const unitPrice =
    560 +
    (largeSize ? 170 : 0) +
    selectedExtras.reduce((sum, label) => sum + (extraPrices[label] ?? 0), 0);
  const customizedPrice = unitPrice * quantity;
  const firstItemMeta = [
    largeSize ? "Large" : "Regular",
    ...selectedExtras.map((label) => label.split(" · ")[0]),
  ].join(" · ");
  const cartSubtotal =
    unitPrice * cartQuantities[0]! + 380 * cartQuantities[1]!;
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
        className="mb-3 grid grid-cols-4 gap-1 rounded-sm bg-[#e8ece8] p-1"
      >
        {demoScreens.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={screen === item}
            onClick={() => patch({ screen: item })}
            className={`rounded-lg px-1 py-2 text-[12px] font-bold capitalize ${
              screen === item ? "bg-white text-[#174e36] " : "text-[#657068]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="relative h-[610px] overflow-hidden rounded-sm border border-[#172019] bg-[#f5f7f2] text-[#172019] ">
        {screen === "menu" && (
          <CustomerMenuScreen
            cartCount={cartQuantities.reduce((sum, value) => sum + value, 0)}
            cartSubtotal={cartSubtotal}
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
            onAddToOrder={() =>
              patch({
                screen: "cart",
                cartQuantities: [quantity, cartQuantities[1]!],
              })
            }
          />
        )}
        {screen === "cart" && (
          <CustomerCartScreen
            firstItemPrice={unitPrice}
            firstItemMeta={firstItemMeta}
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
