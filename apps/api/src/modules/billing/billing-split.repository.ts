import { billingEvenSplitRepository } from "./billing-even-split.repository";
import { billingFractionalSplitRepository } from "./billing-fractional-split.repository";
import { billingItemSplitRepository } from "./billing-item-split.repository";
import { billingSeatShareRepository } from "./billing-seat-share.repository";

/** Stable facade for bill-splitting persistence strategies. */
export const billingSplitRepository = {
  ...billingEvenSplitRepository,
  ...billingItemSplitRepository,
  ...billingSeatShareRepository,
  ...billingFractionalSplitRepository,
};
