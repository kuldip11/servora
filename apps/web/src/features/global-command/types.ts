import type { LucideIcon } from "lucide-react";

export type GlobalCommandKind =
  | "navigation"
  | "order"
  | "menu-item"
  | "staff"
  | "inventory"
  | "table"
  | "branch";

export interface GlobalCommandResult {
  id: string;
  kind: GlobalCommandKind;
  label: string;
  description: string;
  keywords?: string[];
  icon: LucideIcon;
  action: () => void;
}
