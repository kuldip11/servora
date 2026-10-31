import type { CartItem } from "@/features/menu/types";
import type {
  WaiterComboCartLine,
  WaiterComboMenuItem,
} from "@/features/menu/combo";

export interface CartState {
  items: CartItem[];
  combos: WaiterComboCartLine[];
  menuById: Map<string, WaiterComboMenuItem>;
  totalItems: number;
  totalPrice: number;
}
export interface CartActions {
  updateQty: (key: string, delta: number) => void;
  updateComboQty: (key: string, delta: number) => void;
  editItem?: ((key: string) => void) | undefined;
}
export interface CartCheckout {
  notes: string;
  setNotes: (value: string) => void;
  couponCode: string;
  setCouponCode: (value: string) => void;
  promotions: Array<{ id: string; name: string }>;
  selectedPromotionIds: string[];
  togglePromotion: (id: string) => void;
  isPending: boolean;
  submit: () => void;
  close: () => void;
}
export interface CourseControl {
  available: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}
export interface LineCourses {
  updateItem: (key: string, course: number) => void;
  updateCombo: (key: string, course: number) => void;
}
export interface CartSummaryProps {
  cart: CartState;
  actions: CartActions;
  checkout: CartCheckout;
}
