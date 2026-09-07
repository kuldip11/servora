import { ArrowLeft } from "lucide-react";
import { IconButton } from "@pos/ui";

type AddToOrderHeaderProps = {
  onBack: () => void;
};

export const AddToOrderHeader = ({ onBack }: AddToOrderHeaderProps) => (
  <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 safe-area-top">
    <IconButton
      icon={ArrowLeft}
      aria-label="Close menu"
      size="lg"
      onClick={onBack}
      className="h-10 w-10 rounded-xl bg-surface-secondary"
    />
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-lg font-medium text-text-primary">
        Add to order
      </h1>
      <p className="text-xs text-text-secondary">
        Choose items for the next round
      </p>
    </div>
  </div>
);
