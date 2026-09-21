import { useMemo } from "react";
import { createMenuApi } from "@pos/api-client";
import { Button, Card, toast } from "@pos/ui";
import { apiClient, extractApiError } from "@/shared/lib/api-client";
import { useGuidedBuilderState } from "@/features/differentiators/hooks/useGuidedBuilderState";

const menuApi = createMenuApi(apiClient);

import type {
  ComboPolicy,
  ComboSlotDraft,
  MenuChoice,
  PromotionType,
} from "@/features/differentiators/components/guided-builder/types";
import { GuidedComboBuilder } from "@/features/differentiators/components/guided-builder/GuidedComboBuilder";
import { GuidedPromotionBuilder } from "@/features/differentiators/components/guided-builder/GuidedPromotionBuilder";

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
        <GuidedComboBuilder
          busy={busy}
          comboName={comboName}
          comboPolicy={comboPolicy}
          comboValue={comboValue}
          comboSlots={comboSlots}
          menuChoices={menuChoices}
          preview={preview}
          ready={comboReady}
          onNameChange={(value) => {
            setComboName(value);
            setPreview(null);
          }}
          onPolicyChange={(value) => {
            setComboPolicy(value);
            setPreview(null);
          }}
          onValueChange={(value) => {
            setComboValue(value);
            setPreview(null);
          }}
          onSlotsChange={(updater) => {
            setComboSlots(updater);
            setPreview(null);
          }}
          onPreview={() => void previewCombo()}
          onCreate={() => void createCombo()}
        />
      ) : (
        <GuidedPromotionBuilder
          busy={busy}
          promotionName={promotionName}
          promotionType={promotionType}
          promotionValue={promotionValue}
          promotionCoupon={promotionCoupon}
          promotionPreviewItemId={promotionPreviewItemId}
          promotionPreview={promotionPreview}
          menuChoices={menuChoices}
          ready={promotionReady}
          onNameChange={(value) => {
            setPromotionName(value);
            setPromotionPreview(null);
          }}
          onTypeChange={(value) => {
            setPromotionType(value);
            setPromotionPreview(null);
          }}
          onValueChange={(value) => {
            setPromotionValue(value);
            setPromotionPreview(null);
          }}
          onCouponChange={(value) => {
            setPromotionCoupon(value);
            setPromotionPreview(null);
          }}
          onPreviewItemChange={(value) => {
            setPromotionPreviewItemId(value);
            setPromotionPreview(null);
          }}
          onPreview={() => void previewPromotion()}
          onCreate={() => void createPromotion()}
        />
      )}
    </div>
  );
};
