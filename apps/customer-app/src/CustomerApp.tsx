import { useCallback, useMemo, useState } from "react";
import { Skeleton, StaleDataBanner } from "@pos/ui";
import { CartView } from "./features/cart/CartView";
import { useCustomerCart } from "./features/cart/useCustomerCart";
import { ComboCustomization } from "./features/menu/ComboCustomization";
import { CustomerMenuView } from "./features/menu/CustomerMenuView";
import { ItemCustomization } from "./features/menu/ItemCustomization";
import { OrderStatus } from "./features/ordering/OrderStatus";
import { useCustomerCheckout } from "./features/order/useCustomerCheckout";
import { StatusScreen } from "./features/session/StatusScreen";
import { useCustomerSession } from "./features/session/useCustomerSession";

export type View = "menu" | "cart" | "order";

type CustomerSessionResult = ReturnType<typeof useCustomerSession>;

const CustomerExperience = ({
  customerSession,
}: {
  customerSession: CustomerSessionResult;
}) => {
  const {
    session,
    menu,
    combos,
    categories,
    cart,
    setCart,
    placedOrder,
    setPlacedOrder,
    activeOrderError,
    activeOrderRefreshing,
    retryActiveOrder,
    loading,
    setLoading,
    error,
    setError,
    requestBusy,
    requestMessage,
    storageScope,
    live,
    requestHelp,
    retryBootstrap,
  } = customerSession;
  const [view, setView] = useState<View>("menu");
  const [category, setCategory] = useState("Popular");
  const [search, setSearch] = useState("");

  const clearError = useCallback(() => setError(null), [setError]);
  const cartState = useCustomerCart({
    menu,
    cart,
    setCart,
    sessionMode: session?.mode ?? "DINE_IN",
    clearError,
  });

  const checkout = useCustomerCheckout({
    session,
    cart,
    comboCart: cartState.comboCart,
    storageScope,
    loading,
    setLoading,
    setError,
    placedOrder,
    setPlacedOrder,
    clearCart: cartState.clearCart,
    onPlaced: () => setView("order"),
  });

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menu.filter(
      (item) =>
        !query ||
        `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [menu, search]);

  const handleMenu = useCallback(() => setView("menu"), []);
  const handleCart = useCallback(() => setView("cart"), []);

  if (loading && !session) {
    return (
      <main
        className="min-h-screen bg-background p-5"
        aria-busy="true"
        aria-live="polite"
      >
        <div className="mx-auto max-w-2xl pt-6 sm:px-1">
          <div className="space-y-3">
            <Skeleton height="0.75rem" width="8rem" />
            <Skeleton height="2rem" width="14rem" />
            <Skeleton height="1rem" width="18rem" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
            <Skeleton height="2.5rem" />
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex gap-4 rounded-lg border border-border bg-surface p-3"
              >
                <Skeleton height="7rem" width="7rem" radius="lg" />
                <div className="min-w-0 flex-1 space-y-3 py-1">
                  <Skeleton height="1rem" width="65%" />
                  <Skeleton height="0.875rem" width="100%" />
                  <Skeleton height="0.875rem" width="80%" />
                  <Skeleton height="1rem" width="35%" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error && !session) {
    return (
      <StatusScreen
        title="This ordering link is unavailable"
        message={error}
        actionLabel="Try again"
        onAction={retryBootstrap}
      />
    );
  }
  if (!session) return null;

  if (activeOrderError && !placedOrder) {
    return (
      <StatusScreen
        title="We can't refresh your order"
        message={activeOrderError}
        actionLabel="Try again"
        onAction={retryActiveOrder}
      />
    );
  }

  if (view === "order" && placedOrder) {
    return (
      <>
        {activeOrderError ? (
          <StaleDataBanner
            message="Order status could not be refreshed — showing the latest order information available."
            isRetrying={activeOrderRefreshing}
            onRetry={retryActiveOrder}
          />
        ) : null}
        <OrderStatus
          order={placedOrder}
          mode={session.mode}
          table={session.table ?? "Takeaway"}
          estimatedTime={session.estimatedTime}
          onMenu={handleMenu}
          live={live}
          onRequest={requestHelp}
          requestBusy={requestBusy}
          requestMessage={requestMessage}
          onPay={checkout.retryTakeawayPayment}
          payBusy={loading}
        />
      </>
    );
  }

  return (
    <>
      <CustomerMenuView
        session={session}
        placedOrder={Boolean(placedOrder)}
        itemCount={cartState.summary.itemCount}
        total={cartState.summary.total}
        search={search}
        setSearch={setSearch}
        categories={categories}
        category={category}
        setCategory={setCategory}
        combos={combos}
        visibleItems={visibleItems}
        error={error}
        setError={setError}
        onViewOrder={() => setView("order")}
        onCart={handleCart}
        onOpenCombo={cartState.openCombo}
        onOpenItem={cartState.openItem}
      />

      {cartState.selectedCombo && (
        <ComboCustomization
          combo={cartState.selectedCombo}
          menuById={cartState.menuById}
          selections={cartState.comboSelections}
          onToggle={cartState.toggleComboOption}
          onClose={cartState.closeCombo}
          onAdd={cartState.addSelectedCombo}
        />
      )}

      {cartState.selectedItem && (
        <ItemCustomization
          item={cartState.selectedItem}
          selectedOptions={cartState.selectedOptions}
          {...(cartState.selectedVariantId
            ? { variantId: cartState.selectedVariantId }
            : {})}
          onVariantChange={cartState.setSelectedVariantId}
          onToggle={cartState.toggleOption}
          onOptionQuantity={cartState.changeOptionQuantity}
          onClose={cartState.closeItem}
          onAdd={cartState.addSelectedItem}
          quantity={cartState.selectedQuantity}
          onQuantityChange={cartState.setSelectedQuantity}
          editing={cartState.editingCartIndex != null}
        />
      )}

      {view === "cart" && (
        <CartView
          cart={cart}
          combos={cartState.comboCart}
          subtotal={cartState.summary.subtotal}
          tax={cartState.summary.tax}
          total={cartState.summary.total}
          table={session.table ?? "Takeaway"}
          mode={session.mode}
          onBack={handleMenu}
          onChange={cartState.changeQuantity}
          onComboChange={cartState.changeComboQuantity}
          onEdit={cartState.openCartItem}
          onPlace={checkout.placeOrder}
          couponCode={checkout.couponCode}
          onCouponCodeChange={checkout.setCouponCode}
          loyaltyPhone={checkout.loyaltyPhone}
          onLoyaltyPhoneChange={checkout.setLoyaltyPhone}
          loading={loading}
        />
      )}
    </>
  );
};

export const CustomerApp = () => {
  const customerSession = useCustomerSession();
  const contextKey = `${customerSession.storageScope ?? "no-scope"}:${customerSession.session?.token ?? "pending"}`;

  return (
    <CustomerExperience key={contextKey} customerSession={customerSession} />
  );
};
