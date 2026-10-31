import type { OrderableMenuItem } from "@pos/types";
import type { CartItem } from "@/features/menu/types";

export interface ItemCustomiserProps {
  item: OrderableMenuItem;
  existingCartItem?: CartItem;
  onConfirm: (item: CartItem) => void;
  courseMode?: boolean;
  onClose: () => void;
}
