import { useMemo } from "react";
import { createMenuApi } from "@pos/api-client";
import { Button, Card, toast } from "@pos/ui";
import {
  DIFFERENTIATORS_INPUT_CLASS,
  DIFFERENTIATORS_SELECT_CLASS,
} from "@/features/differentiators/constants";
import { apiClient, extractApiError } from "@/shared/lib/api-client";
import { useGuidedBuilderState } from "@/features/differentiators/hooks/useGuidedBuilderState";

const menuApi = createMenuApi(apiClient);

type BuilderKind = "combo" | "promotion";
type ComboPolicy = "FIXED" | "PERCENT_OFF_SUM";
type PromotionType = "PERCENTAGE" | "FIXED_AMOUNT";

export type MenuChoice = { id: string; name: string; categoryName: string };
type ComboSlotDraft = {
  id: number;
  name: string;
  menuItemId: string;
  upcharge: string;
};

const initialComboSlots: ComboSlotDraft[] = [
  { id: 1, name: "Main", menuItemId: "", upcharge: "0" },
  { id: 2, name: "Side", menuItemId: "", upcharge: "0" },
];

type GuidedBuilderPanelProps = {
  menuChoices: MenuChoice[];
};

export const GuidedBuilderPanel = ({
  menuChoices,
}: GuidedBuilderPanelProps) => {
  const {
    builderKind,
    busy,
    comboName,
    comboPolicy,
    comboValue,
    comboSlots,
    preview,
    promotionName,
    promotionType,
    promotionValue,
    promotionCoupon,
    promotionPreviewItemId,
    promotionPreview,
    setBuilderKind,
    setBusy,
    setComboName,
    setComboPolicy,
    setComboValue,
    setComboSlots,
    setPreview,
    setPromotionName,
    setPromotionType,
    setPromotionValue,
    setPromotionCoupon,
    setPromotionPreviewItemId,
    setPromotionPreview,
  } = useGuidedBuilderState();

  const fail = (error: unknown) =>
    toast({ title: extractApiError(error), tone: "danger" });

  const comboPayload = useMemo(
    () => ({
      name: comboName.trim(),
      pricePolicy: comboPolicy,
      ...(comboPolicy === "FIXED"
        ? { fixedPrice: Number(comboValue) }
        : { percentOff: Number(comboValue) }),
      slots: comboSlots.map((slot) => ({
        name: slot.name.trim(),
        minSelections: 1,
        maxSelections: 1,
        options: [
          {
            menuItemId: slot.menuItemId,
            ...(Number(slot.upcharge)
              ? { upcharge: Number(slot.upcharge) }
              : {}),
          },
        ],
      })),
    }),
    [comboName, comboPolicy, comboSlots, comboValue],
  );

  const comboReady = Boolean(
    comboName.trim() &&
    comboSlots.length > 0 &&
    comboSlots.every((slot) => slot.name.trim() && slot.menuItemId) &&
    Number.isFinite(Number(comboValue)) &&
    Number(comboValue) >= 0,
  );

  const getComboPreview = async () => {
    const { name: _name, ...previewInput } = comboPayload;
    const response = await menuApi.previewCombo<{ resolvedTotal: number }>(
      previewInput,
    );
    return Number(response.resolvedTotal);
  };

  const previewCombo = async () => {
    if (!comboReady) return;
    setBusy(true);
    try {
      setPreview(await getComboPreview());
    } catch (error) {
      setPreview(null);
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const createCombo = async () => {
    if (!comboReady) return;
    setBusy(true);
    try {
      const authoritativePreview = await getComboPreview();
      await menuApi.createCombo(comboPayload);
      setPreview(authoritativePreview);
      toast({
        title: `Combo created at previewed price ₹${authoritativePreview.toFixed(2)}`,
        tone: "success",
      });
      setComboName("");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const promotionPayload = useMemo(
    () => ({
      name: promotionName.trim(),
      ruleType: promotionType,
      scope: "ORDER" as const,
      value: Number(promotionValue),
      ...(promotionCoupon.trim() ? { couponCode: promotionCoupon.trim() } : {}),
      isActive: true,
    }),
    [promotionCoupon, promotionName, promotionType, promotionValue],
  );

  const promotionReady = Boolean(
    promotionPayload.name &&
    promotionPreviewItemId &&
    Number.isFinite(promotionPayload.value) &&
    promotionPayload.value > 0 &&
    (promotionType !== "PERCENTAGE" || promotionPayload.value <= 100),
  );

  const getPromotionPreview = async () => {
    if (!promotionReady) return null;
    const result = await menuApi.previewPromotion<{
      subtotal: number;
      discountAmount: number;
      totalAmount: number;
    }>({
      promotion: promotionPayload,
      items: [{ menuItemId: promotionPreviewItemId, quantity: 1 }],
    });
    setPromotionPreview(result);
    return result;
  };

  const previewPromotion = async () => {
    if (!promotionReady) return;
    setBusy(true);
    try {
      await getPromotionPreview();
    } catch (error) {
      setPromotionPreview(null);
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  const createPromotion = async () => {
    if (!promotionReady) return;
    setBusy(true);
    try {
      const authoritativePreview = await getPromotionPreview();
      if (!authoritativePreview) return;
      await menuApi.createPromotion(promotionPayload);
      toast({
        title: `Promotion created · sample discount ₹${authoritativePreview.discountAmount.toFixed(2)}`,
        tone: "success",
      });
      setPromotionName("");
      setPromotionCoupon("");
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={builderKind === "combo" ? "primary" : "secondary"}
            onClick={() => setBuilderKind("combo")}
          >
            Create combo
          </Button>
          <Button
            variant={builderKind === "promotion" ? "primary" : "secondary"}
            onClick={() => setBuilderKind("promotion")}
          >
            Create promotion
          </Button>
        </div>
      </Card>

      {builderKind === "combo" ? (
        <Card>
          <h2 className="font-semibold">Guided combo builder</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Step 1: name the offer. Step 2: choose real menu items by name. Step
            3: preview through the same server pricing stages used by order
            creation.
          </p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-medium text-text-primary">
                Combo name
                <input
                  className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                  value={comboName}
                  onChange={(event) => {
                    setComboName(event.target.value);
                    setPreview(null);
                  }}
                  placeholder="Lunch combo"
                />
              </label>
              <label className="text-sm font-medium text-text-primary">
                Pricing
                <select
                  className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
                  value={comboPolicy}
                  onChange={(event) => {
                    setComboPolicy(event.target.value as ComboPolicy);
                    setPreview(null);
                  }}
                >
                  <option value="FIXED">Fixed total</option>
                  <option value="PERCENT_OFF_SUM">
                    Percent off components
                  </option>
                </select>
              </label>
              <label className="text-sm font-medium text-text-primary">
                {comboPolicy === "FIXED" ? "Fixed price" : "Percent off"}
                <input
                  className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                  type="number"
                  min="0"
                  max={comboPolicy === "PERCENT_OFF_SUM" ? "100" : undefined}
                  step="0.01"
                  value={comboValue}
                  onChange={(event) => {
                    setComboValue(event.target.value);
                    setPreview(null);
                  }}
                />
              </label>
            </div>

            <div className="space-y-3">
              {comboSlots.map((slot, index) => (
                <div
                  key={slot.id}
                  className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-[1fr_2fr_1fr_auto] md:items-end"
                >
                  <label className="text-sm font-medium text-text-primary">
                    Slot {index + 1}
                    <input
                      className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                      value={slot.name}
                      onChange={(event) => {
                        setComboSlots((current) =>
                          current.map((value) =>
                            value.id === slot.id
                              ? { ...value, name: event.target.value }
                              : value,
                          ),
                        );
                        setPreview(null);
                      }}
                    />
                  </label>
                  <label className="text-sm font-medium text-text-primary">
                    Menu item
                    <select
                      className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
                      value={slot.menuItemId}
                      onChange={(event) => {
                        setComboSlots((current) =>
                          current.map((value) =>
                            value.id === slot.id
                              ? { ...value, menuItemId: event.target.value }
                              : value,
                          ),
                        );
                        setPreview(null);
                      }}
                    >
                      <option value="">Choose an item</option>
                      {menuChoices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.categoryName} — {choice.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-text-primary">
                    Upcharge
                    <input
                      className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                      type="number"
                      step="0.01"
                      value={slot.upcharge}
                      onChange={(event) => {
                        setComboSlots((current) =>
                          current.map((value) =>
                            value.id === slot.id
                              ? { ...value, upcharge: event.target.value }
                              : value,
                          ),
                        );
                        setPreview(null);
                      }}
                    />
                  </label>
                  <Button
                    variant="secondary"
                    disabled={comboSlots.length === 1}
                    onClick={() => {
                      setComboSlots((current) =>
                        current.filter((value) => value.id !== slot.id),
                      );
                      setPreview(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  setComboSlots((current) => [
                    ...current,
                    {
                      id: Math.max(0, ...current.map((slot) => slot.id)) + 1,
                      name: `Choice ${current.length + 1}`,
                      menuItemId: "",
                      upcharge: "0",
                    },
                  ])
                }
              >
                + Add slot
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                loading={busy}
                disabled={!comboReady}
                onClick={previewCombo}
              >
                Preview authoritative price
              </Button>
              <Button
                loading={busy}
                disabled={!comboReady || preview === null}
                onClick={createCombo}
              >
                Create combo
              </Button>
              {preview !== null && (
                <strong>Resolved total: ₹{preview.toFixed(2)}</strong>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="font-semibold">Guided promotion builder</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Common order-level promotions are created here; advanced
            item/category/BOGO targeting remains in the full promotion editor.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-text-primary">
              Promotion name
              <input
                className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                value={promotionName}
                onChange={(event) => {
                  setPromotionName(event.target.value);
                  setPromotionPreview(null);
                }}
                placeholder="Weekday special"
              />
            </label>
            <label className="text-sm font-medium text-text-primary">
              Discount type
              <select
                className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
                value={promotionType}
                onChange={(event) => {
                  setPromotionType(event.target.value as PromotionType);
                  setPromotionPreview(null);
                }}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed amount</option>
              </select>
            </label>
            <label className="text-sm font-medium text-text-primary">
              {promotionType === "PERCENTAGE" ? "Percent off" : "Amount off"}
              <input
                className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                type="number"
                min="0.01"
                max={promotionType === "PERCENTAGE" ? "100" : undefined}
                step="0.01"
                value={promotionValue}
                onChange={(event) => {
                  setPromotionValue(event.target.value);
                  setPromotionPreview(null);
                }}
              />
            </label>
            <label className="text-sm font-medium text-text-primary">
              Coupon code (optional)
              <input
                className={`mt-1 w-full ${DIFFERENTIATORS_INPUT_CLASS}`}
                value={promotionCoupon}
                onChange={(event) => {
                  setPromotionCoupon(event.target.value.toUpperCase());
                  setPromotionPreview(null);
                }}
                placeholder="LUNCH10"
              />
            </label>
            <label className="text-sm font-medium text-text-primary md:col-span-2">
              Preview against menu item
              <select
                className={`mt-1 w-full ${DIFFERENTIATORS_SELECT_CLASS}`}
                value={promotionPreviewItemId}
                onChange={(event) => {
                  setPromotionPreviewItemId(event.target.value);
                  setPromotionPreview(null);
                }}
              >
                <option value="">Choose an item</option>
                {menuChoices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.categoryName} — {choice.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              loading={busy}
              disabled={!promotionReady}
              onClick={previewPromotion}
            >
              Preview authoritative discount
            </Button>
            <Button
              loading={busy}
              disabled={!promotionReady || promotionPreview === null}
              onClick={createPromotion}
            >
              Create promotion
            </Button>
            {promotionPreview && (
              <strong>
                Sample: ₹{promotionPreview.subtotal.toFixed(2)} − ₹
                {promotionPreview.discountAmount.toFixed(2)} → ₹
                {promotionPreview.totalAmount.toFixed(2)}
              </strong>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
