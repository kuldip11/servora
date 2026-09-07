import type { KitchenTicket, OrderItemFulfillmentType } from "@pos/types";

interface Props {
  notes: KitchenTicket["notes"];
  items: KitchenTicket["items"];
}

const FULFILLMENT_LABEL: Record<OrderItemFulfillmentType, string> = {
  DINE_IN: "Dine-in",
  TAKEAWAY: "Takeaway",
};

export const TicketItems = ({ notes, items }: Props) => {
  const groups: OrderItemFulfillmentType[] = ["DINE_IN", "TAKEAWAY"];

  return (
    <>
      {notes && (
        <p className="text-xs text-warning bg-warning-surface rounded-md px-2 py-1.5">
          📝 {notes}
        </p>
      )}

      <div className="space-y-3 flex-1">
        {groups.map((fulfillmentType) => {
          const groupItems = items?.filter(
            (item) =>
              item.menuItemId !== null &&
              (item.fulfillmentType ?? "DINE_IN") === fulfillmentType,
          );
          if (!groupItems.length) return null;

          return (
            <section
              key={fulfillmentType}
              aria-label={FULFILLMENT_LABEL[fulfillmentType]}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                  {FULFILLMENT_LABEL[fulfillmentType]}
                </span>
                <span className="h-px flex-1 bg-divider" />
              </div>
              <div className="space-y-1.5">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 ${item.itemStatus === "VOIDED" || item.itemStatus === "REFIRED" ? "opacity-60 line-through" : ""}`}
                  >
                    <span className="text-warning font-bold text-sm min-w-[1.5rem]">
                      {item.quantity}×
                    </span>
                    <div>
                      <p className="text-text-primary text-sm font-medium">
                        {item.menuItemName}
                        {item.variantName && (
                          <span className="text-warning">
                            {" "}
                            · {item.variantName}
                          </span>
                        )}
                      </p>
                      {item.itemStatus === "VOIDED" && (
                        <p className="text-xs text-danger no-underline">
                          VOIDED
                        </p>
                      )}
                      {item.itemStatus === "REFIRED" && (
                        <p className="text-xs font-bold text-warning no-underline">
                          REFIRED · replacement sent
                        </p>
                      )}
                      {item.refiresOrderItemId && (
                        <p
                          className={`text-xs font-bold no-underline ${item.refireType === "REFILL" ? "text-success" : "text-warning"}`}
                        >
                          {item.refireType === "REFILL"
                            ? "REFILL · INCLUDED"
                            : "REFIRE"}
                        </p>
                      )}
                      {item.weightQuantity != null && (
                        <p className="text-xs font-semibold text-info no-underline">
                          {Number(item.weightQuantity)} {item.weightUnit ?? ""}
                        </p>
                      )}
                      {item.comboGroupId && (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-info no-underline">
                          Combo · {item.comboGroupId.slice(0, 6)}
                        </p>
                      )}
                      {item.chefNotes && (
                        <p className="text-xs text-warning mt-0.5">
                          📝 {item.chefNotes}
                        </p>
                      )}
                      {item.modifiers?.map((m) => (
                        <p
                          key={`${m.modifierId}:${m.zoneLabel ?? "WHOLE"}`}
                          className="text-xs text-text-secondary"
                        >
                          +{" "}
                          {m.zoneLabel && m.zoneLabel !== "WHOLE"
                            ? `${m.zoneLabel}: `
                            : ""}
                          {m.name}
                          {m.quantity > 1 ? ` ×${m.quantity}` : ""}
                          {m.modifierGroupName ? (
                            <span className="text-text-disabled">
                              {" "}
                              ({m.modifierGroupName})
                            </span>
                          ) : null}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
};
