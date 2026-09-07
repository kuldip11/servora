import {
  Bike,
  Globe,
  ShoppingBag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

type BranchCapabilityBadge = {
  key:
    "dineInEnabled" | "takeawayEnabled" | "deliveryEnabled" | "onlineEnabled";
  label: string;
  icon: LucideIcon;
};

export const BRANCH_CAPABILITY_BADGES: readonly BranchCapabilityBadge[] = [
  { key: "dineInEnabled" as const, label: "Dine In", icon: UtensilsCrossed },
  { key: "takeawayEnabled" as const, label: "Takeaway", icon: ShoppingBag },
  { key: "deliveryEnabled" as const, label: "Delivery", icon: Bike },
  { key: "onlineEnabled" as const, label: "Online", icon: Globe },
] as const;
