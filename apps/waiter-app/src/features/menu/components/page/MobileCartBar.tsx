type MobileCartBarProps = {
  totalItems: number;
  totalPrice: number;
  isAddingToExisting: boolean;
  onReview: () => void;
};

export const MobileCartBar = ({
  totalItems,
  totalPrice,
  isAddingToExisting,
  onReview,
}: MobileCartBarProps) => {
  if (totalItems <= 0) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 bg-transparent px-3.5 py-3 safe-area-bottom md:hidden">
      <button
        type="button"
        onClick={onReview}
        className="waiter-cart-bar flex min-h-[58px] w-full items-center justify-between rounded-[17px] px-[15px] font-medium text-white shadow-lg"
      >
        <span className="text-left">
          <small className="block text-xs font-normal text-white/75">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </small>
          <strong className="block text-[15px] font-medium">
            ₹{totalPrice.toFixed(2)}
          </strong>
        </span>
        <span className="flex min-h-10 items-center rounded-xl bg-white px-3.5 text-xs font-medium text-[#173c2a]">
          {isAddingToExisting ? "Review additions" : "Review order"} →
        </span>
      </button>
    </div>
  );
};
