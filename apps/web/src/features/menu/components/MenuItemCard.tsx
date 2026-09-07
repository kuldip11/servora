import {
  CheckSquare,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Square,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { IconButton } from "@pos/ui";
import type { MenuItem } from "@pos/types";
import { formatCurrency } from "@/shared/utils";
import { FoodTypeDot } from "@/features/menu/components/FoodTypeDot";
import { PublishBadge } from "@/features/menu/components/PublishBadge";
import { StatusBadge } from "@/features/menu/components/StatusBadge";

const priceDisplay = (item: MenuItem) => {
  if (!item.variants?.length) return formatCurrency(Number(item.basePrice));
  const prices = item.variants.map((variant) => Number(variant.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? formatCurrency(min)
    : `${formatCurrency(min)} – ${formatCurrency(max)}`;
};

interface MenuItemCardProps {
  item: MenuItem;
  selectMode: boolean;
  isSelected: boolean;
  onActivate: () => void;
  onPublish: () => void;
  onToggleAvailability: () => void;
  onManualOverride: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const MenuItemCard = ({
  item,
  selectMode,
  isSelected,
  onActivate,
  onPublish,
  onToggleAvailability,
  onManualOverride,
  onDuplicate,
  onDelete,
}: MenuItemCardProps) => (
  <div
    role="button"
    tabIndex={0}
    aria-pressed={selectMode ? isSelected : undefined}
    aria-label={
      selectMode
        ? `${item.name}${isSelected ? ", selected" : ""}`
        : `Edit ${item.name}`
    }
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    }}
    className={`border rounded-lg p-3 transition-all cursor-pointer relative ${
      isSelected
        ? "border-primary bg-primary-surface ring-1 ring-primary"
        : item.status === "ACTIVE"
          ? "border-border bg-surface hover:border-primary/40"
          : "border-border bg-surface-secondary opacity-70"
    } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    onClick={onActivate}
  >
    <div className="flex items-start justify-between mb-1.5">
      <div className="flex items-center gap-1.5">
        {selectMode &&
          (isSelected ? (
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <Square className="w-4 h-4 text-text-disabled shrink-0" />
          ))}
        <FoodTypeDot type={item.foodType} size="sm" />
        <p className="text-sm font-semibold text-text-primary">{item.name}</p>
        {item.spiceLevel && item.spiceLevel !== "NONE" && (
          <Flame className="w-3 h-3 text-orange-500" />
        )}
      </div>
      {!selectMode && (
        <div className="flex items-center gap-0.5">
          <IconButton
            size="sm"
            aria-label={
              item.isPublished
                ? "Unpublish (move to draft)"
                : "Publish (make live)"
            }
            onClick={(event) => {
              event.stopPropagation();
              onPublish();
            }}
            icon={() =>
              item.isPublished ? (
                <EyeOff className="w-4 h-4 text-text-disabled" />
              ) : (
                <Eye className="w-4 h-4 text-warning" />
              )
            }
          />
          <IconButton
            size="sm"
            aria-label={
              item.manualOverrideStatus
                ? "Clear manual availability override"
                : "Manually mark out of stock"
            }
            onClick={(event) => {
              event.stopPropagation();
              item.manualOverrideStatus
                ? onToggleAvailability()
                : onManualOverride();
            }}
            icon={() =>
              item.manualOverrideStatus ? (
                <ToggleLeft className="w-5 h-5 text-danger" />
              ) : (
                <ToggleRight className="w-5 h-5 text-success" />
              )
            }
          />
          <IconButton
            size="sm"
            aria-label="Duplicate item"
            icon={Copy}
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate();
            }}
          />
          <IconButton
            size="sm"
            aria-label="Delete item"
            icon={Trash2}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          />
        </div>
      )}
    </div>
    <div className="mb-2">
      <PublishBadge isPublished={item.isPublished} />
      <StatusBadge status={item.status} />
      {item.manualOverrideStatus && (
        <span className="ml-1.5 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
          Manual override
        </span>
      )}
      {(item.manualOverrideReason ?? item.availabilityReason) && (
        <span className="ml-1.5 text-[11px] text-text-disabled">
          {item.manualOverrideReason ?? item.availabilityReason}
        </span>
      )}
    </div>
    {item.description && (
      <p className="text-xs text-text-secondary mb-2 line-clamp-2">
        {item.description}
      </p>
    )}
    {(item.tagLinks?.length ?? 0) > 0 && (
      <div className="flex flex-wrap gap-1 mb-2">
        {item.tagLinks?.map((link) => (
          <span
            key={link.tagId}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: link.tag.color ?? "#8b5cf6" }}
          >
            {link.tag.name}
          </span>
        ))}
      </div>
    )}
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold text-primary">
        {priceDisplay(item)}
      </span>
      <span className="text-xs text-text-disabled">Tax: {item.taxRate}%</span>
    </div>
  </div>
);
