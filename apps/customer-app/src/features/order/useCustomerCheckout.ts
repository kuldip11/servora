import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createCustomerOrder,
  initiateTakeawayPayment,
  verifyTakeawayPayment,
  type CustomerOrder,
} from "@/api";
import type { ComboCartLine } from "@/features/cart/combo";
import { clearPersistedCart } from "@/features/cart/persistence";
import type { CartLine } from "@/features/cart/pricing";
import type { CustomerSessionState } from "@/features/session/useCustomerSession";
import { createOrderPayload } from "./payload";
import { extractApiError } from "@pos/api-client";

type UseCustomerCheckoutInput = {
  session: CustomerSessionState | null;
  cart: CartLine[];
  comboCart: ComboCartLine[];
  storageScope: string | null;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  placedOrder: CustomerOrder | null;
  setPlacedOrder: Dispatch<SetStateAction<CustomerOrder | null>>;
  clearCart: () => void;
  onPlaced: () => void;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayConstructor = new (
  options: Record<string, unknown>,
) => RazorpayCheckout;

const getRazorpay = (): RazorpayConstructor | undefined => {
  return (window as typeof window & { Razorpay?: RazorpayConstructor })
    .Razorpay;
};

const ensureRazorpayScript = async () => {
  const scriptId = "razorpay-checkout";
  if (document.getElementById(scriptId)) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load payment checkout"));
    document.head.appendChild(script);
  });
};

export const useCustomerCheckout = ({
  session,
  cart,
  comboCart,
  storageScope,
  loading,
  setLoading,
  setError,
  placedOrder,
  setPlacedOrder,
  clearCart,
  onPlaced,
}: UseCustomerCheckoutInput) => {
  const [couponCode, setCouponCode] = useState("");
  const [loyaltyPhone, setLoyaltyPhone] = useState("");

  const startTakeawayPayment = useCallback(
    async (order: CustomerOrder) => {
      if (!session) throw new Error("Ordering session is unavailable");
      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) throw new Error("Online takeaway payment is not configured");
      const pending = order.payments.find(
        (payment) =>
          payment.method === "RAZORPAY" && payment.status === "PENDING",
      );
      const payment = pending?.reference
        ? pending
        : await initiateTakeawayPayment(session.token, order.id);
      if (!payment.reference) {
        throw new Error("Unable to initialize takeaway payment");
      }

      await ensureRazorpayScript();
      const Razorpay = getRazorpay();
      if (!Razorpay) throw new Error("Payment checkout is unavailable");

      await new Promise<void>((resolve, reject) => {
        const checkout = new Razorpay({
          key,
          amount: Number(payment.amount) * 100,
          currency: "INR",
          name: session.restaurant || "Restaurant",
          description: `Takeaway order ${order.id.slice(0, 8)}`,
          order_id: payment.reference,
          handler: async (response: RazorpayResponse) => {
            try {
              const verified = await verifyTakeawayPayment(session.token, {
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setPlacedOrder(verified);
              resolve();
            } catch (error) {
              reject(error);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled")),
          },
          theme: { color: "#111827" },
        });
        checkout.open();
      });
    },
    [session, setPlacedOrder],
  );

  const retryTakeawayPayment = useCallback(async () => {
    if (!session || !placedOrder || session.mode !== "TAKEAWAY" || loading)
      return;
    try {
      setLoading(true);
      setError(null);
      await startTakeawayPayment(placedOrder);
      if (storageScope) clearPersistedCart(storageScope);
      clearCart();
    } catch (error) {
      setError(extractApiError(error, "Payment was not completed"));
    } finally {
      setLoading(false);
    }
  }, [
    clearCart,
    loading,
    placedOrder,
    session,
    setError,
    setLoading,
    startTakeawayPayment,
    storageScope,
  ]);

  const placeOrder = useCallback(
    async (fulfillmentType: "DINE_IN" | "TAKEAWAY") => {
      if (!session || (cart.length === 0 && comboCart.length === 0) || loading)
        return;
      try {
        setLoading(true);
        setError(null);
        const regularPayload = createOrderPayload(cart, fulfillmentType);
        const order = await createCustomerOrder(session.token, {
          ...regularPayload,
          ...(comboCart.length
            ? {
                combos: comboCart.map((line) => ({
                  comboId: line.combo.id,
                  quantity: line.quantity,
                  selections: line.selections,
                })),
              }
            : {}),
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(loyaltyPhone.trim() ? { loyaltyPhone: loyaltyPhone.trim() } : {}),
        });
        setPlacedOrder(order);

        if (session.mode === "TAKEAWAY") {
          await startTakeawayPayment(order);
        }

        if (storageScope) clearPersistedCart(storageScope);
        clearCart();
        setCouponCode("");
        onPlaced();
      } catch (error) {
        setError(extractApiError(error, "Unable to place order"));
      } finally {
        setLoading(false);
      }
    },
    [
      cart,
      clearCart,
      comboCart,
      couponCode,
      loading,
      loyaltyPhone,
      onPlaced,
      session,
      setError,
      setLoading,
      setPlacedOrder,
      startTakeawayPayment,
      storageScope,
    ],
  );

  return {
    couponCode,
    loyaltyPhone,
    setCouponCode,
    setLoyaltyPhone,
    placeOrder,
    retryTakeawayPayment,
  };
};
