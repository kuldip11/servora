import { toast } from "@pos/ui";
import { useOrderDraft } from "@/features/menu/hooks/useOrderDraft";
import { estimateComboSubtotal } from "@/features/menu/combo";
import { ItemCustomiser } from "@/features/menu/components/ItemCustomiser";
import { MenuGrid } from "@/features/menu/components/MenuGrid";
import { OrderOptionsPanel } from "@/features/menu/components/OrderOptionsPanel";
import { TabletOrderRail } from "@/features/menu/components/TabletOrderRail";
import { CartSummary } from "@/features/menu/components/CartSummary";
import { ComboCustomiser } from "@/features/menu/components/ComboCustomiser";
import { AddToOrderHeader } from "@/features/menu/components/page/AddToOrderHeader";
import { ComboStrip } from "@/features/menu/components/page/ComboStrip";
import { MenuCatalogControls } from "@/features/menu/components/page/MenuCatalogControls";
import { MobileCartBar } from "@/features/menu/components/page/MobileCartBar";
import { useMenuPageData } from "@/features/menu/hooks/useMenuPageData";
import { useMenuCart } from "@/features/menu/hooks/useMenuCart";
import { useMenuOrderSubmission } from "@/features/menu/hooks/useMenuOrderSubmission";

interface Props {
  onBack: () => void;
  onOrderPlaced: (orderId: string) => void;

  existingOrderId?: string;
}

export const MenuPage = ({ onBack, onOrderPlaced, existingOrderId }: Props) => {
  const isAddingToExisting = !!existingOrderId;

  const {
    couponCode,
    selectedPromotionIds,
    orderType,
    tableId,
    customerId,
    customerName,
    customerGroupId,
    billingMode,
    coverCount,
    perCoverPriceRuleId,
    orderNotes,
    activeCategory,
    showCart,
    customerSearch,
    menuSearch,
    foodTypeFilter,
    selectedMenuId,
    courseMode,
    roundCourseNumber,
    changeOrderType,
    changeTable,
    selectCustomer,
    clearCustomer,
    changeCustomerSearch,
    changeCustomerGroup,
    changeBillingMode,
    changeCoverCount,
    changePerCoverRule,
    changeNotes,
    changeCategory,
    setCartVisible,
    changeMenuSearch,
    changeFoodType,
    changeMenu,
    changeCourseMode,
    changeRoundCourse,
    changeCoupon,
    togglePromotion,
  } = useOrderDraft();

  const {
    activeMenus,
    scopedCategories,
    menuLoading,
    courseSequencingAvailable,
    activeCombos,
    promotions,
    customerGroups,
    perCoverRules,
    menuById,
    availableOrderTypes,
    tablesEnabled,
    tables,
    customerResults,
    allItems,
    resolvedActiveCategory,
    activeItems,
  } = useMenuPageData({
    isAddingToExisting,
    orderType,
    selectedMenuId,
    activeCategory,
    menuSearch,
    foodTypeFilter,
    customerSearch,
    onMenuChange: changeMenu,
    onOrderTypeChange: changeOrderType,
    onCategoryChange: changeCategory,
  });

  const {
    cart,
    comboCart,
    customising,
    customisingCombo,
    comboSelections,
    setCustomising,
    setCustomisingCombo,
    setComboSelections,
    handleItemTap,
    confirmCustomisedItem,
    editCartItem,
    updateQty,
    openCombo,
    toggleComboOption,
    addSelectedCombo,
    updateComboQty,
    setCourseModeEnabled: updateCartCourseMode,
    updateItemCourse,
    updateComboCourse,
  } = useMenuCart({
    allItems,
    courseMode,
    isAddingToExisting,
    onCartVisibilityChange: setCartVisible,
  });

  const setCourseModeEnabled = (enabled: boolean) => {
    changeCourseMode(enabled);
    if (!isAddingToExisting) updateCartCourseMode(enabled);
  };

  const { submit: handleSubmit, isPending } = useMenuOrderSubmission({
    cart,
    comboCart,
    courseMode,
    roundCourseNumber,
    isAddingToExisting,
    ...(existingOrderId ? { existingOrderId } : {}),
    orderType,
    tableId,
    customerId,
    customerGroupId,
    billingMode,
    coverCount,
    perCoverPriceRuleId,
    orderNotes,
    couponCode,
    selectedPromotionIds,
    onOrderPlaced,
  });

  const totalItems =
    cart.reduce((s, i) => s + i.quantity, 0) +
    comboCart.reduce((s, line) => s + line.quantity, 0);
  const lineItemTotal =
    cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0) +
    comboCart.reduce(
      (sum, line) => sum + estimateComboSubtotal(line, menuById),
      0,
    );
  const selectedCoverRule = perCoverRules.find(
    (rule) => rule.id === perCoverPriceRuleId,
  );
  const selectedCoverRate = Number(selectedCoverRule?.price ?? 0);
  const totalPrice =
    !isAddingToExisting && billingMode === "PER_COVER"
      ? coverCount * selectedCoverRate
      : lineItemTotal;
  const needsTable = !isAddingToExisting && orderType === "DINE_IN" && !tableId;

  return (
    <div
      className={`${isAddingToExisting ? "h-screen" : "h-full"} relative flex flex-col bg-background`}
    >
      {isAddingToExisting && <AddToOrderHeader onBack={onBack} />}

      {}
      {!isAddingToExisting && (
        <OrderOptionsPanel
          availableOrderTypes={availableOrderTypes}
          orderType={orderType}
          onOrderTypeChange={changeOrderType}
          tablesEnabled={tablesEnabled}
          tables={tables}
          tableId={tableId}
          onTableChange={changeTable}
          customerId={customerId}
          customerName={customerName}
          onClearCustomer={clearCustomer}
          customerSearch={customerSearch}
          onCustomerSearchChange={changeCustomerSearch}
          customerResults={customerResults}
          onSelectCustomer={selectCustomer}
          customerGroups={customerGroups}
          customerGroupId={customerGroupId}
          onCustomerGroupChange={changeCustomerGroup}
          billingMode={billingMode}
          onBillingModeChange={changeBillingMode}
          coverCount={coverCount}
          onCoverCountChange={changeCoverCount}
          perCoverRules={perCoverRules}
          perCoverPriceRuleId={perCoverPriceRuleId}
          onPerCoverPriceRuleChange={changePerCoverRule}
        />
      )}

      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_320px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex min-h-0 min-w-0 flex-col">
          <MenuCatalogControls
            activeMenus={activeMenus}
            selectedMenuId={selectedMenuId}
            onMenuChange={changeMenu}
            menuSearch={menuSearch}
            onMenuSearchChange={changeMenuSearch}
            foodTypeFilter={foodTypeFilter}
            onFoodTypeChange={changeFoodType}
            categories={scopedCategories}
            activeCategory={resolvedActiveCategory}
            onCategoryChange={changeCategory}
          />

          {!isAddingToExisting && (
            <ComboStrip combos={activeCombos} onOpenCombo={openCombo} />
          )}

          {}
          <MenuGrid
            items={activeItems}
            cart={cart}
            isLoading={menuLoading}
            menuSearch={menuSearch}
            onItemTap={handleItemTap}
            onQtyChange={updateQty}
          />
        </section>

        <TabletOrderRail
          cart={cart}
          combos={comboCart}
          totalItems={totalItems}
          totalPrice={totalPrice}
          isAddingToExisting={isAddingToExisting}
          onUpdateQty={updateQty}
          onUpdateComboQty={updateComboQty}
          onEditItem={editCartItem}
          onReview={() => setCartVisible(true)}
        />
      </div>

      {}
      <MobileCartBar
        totalItems={totalItems}
        totalPrice={totalPrice}
        isAddingToExisting={isAddingToExisting}
        onReview={() => setCartVisible(true)}
      />

      {}
      {customising && (
        <ItemCustomiser
          item={customising.item}
          {...(customising.existingCartItem
            ? { existingCartItem: customising.existingCartItem }
            : {})}
          courseMode={courseMode && !isAddingToExisting}
          onConfirm={confirmCustomisedItem}
          onClose={() => setCustomising(null)}
        />
      )}

      {customisingCombo && (
        <ComboCustomiser
          combo={customisingCombo}
          menuById={menuById}
          selections={comboSelections}
          onToggle={toggleComboOption}
          onAdd={addSelectedCombo}
          onClose={() => {
            setCustomisingCombo(null);
            setComboSelections([]);
          }}
        />
      )}

      {}
      {showCart && (
        <CartSummary
          cart={cart}
          combos={comboCart}
          menuById={menuById}
          isAddingToExisting={isAddingToExisting}
          courseSequencingAvailable={courseSequencingAvailable}
          courseMode={courseMode}
          onCourseModeChange={setCourseModeEnabled}
          roundCourseNumber={roundCourseNumber}
          onRoundCourseNumberChange={changeRoundCourse}
          onUpdateCourse={updateItemCourse}
          onUpdateComboCourse={updateComboCourse}
          orderNotes={orderNotes}
          onOrderNotesChange={changeNotes}
          couponCode={couponCode}
          onCouponCodeChange={changeCoupon}
          promotions={promotions.filter(
            (promotion) => promotion.isActive && !promotion.couponCode,
          )}
          selectedPromotionIds={selectedPromotionIds}
          onTogglePromotion={togglePromotion}
          totalItems={totalItems}
          totalPrice={totalPrice}
          isPending={isPending}
          needsTable={needsTable}
          onUpdateQty={updateQty}
          onUpdateComboQty={updateComboQty}
          onEditItem={editCartItem}
          onSubmit={handleSubmit}
          onClose={() => setCartVisible(false)}
        />
      )}
    </div>
  );
};
