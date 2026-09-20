import { Type } from "@sinclair/typebox";
import {
  loyaltyCustomerBodySchema,
  loyaltyTierBodySchema,
  updateLoyaltyCustomerBodySchema,
  updateLoyaltyTierBodySchema,
  uuidSchema,
} from "@pos/contracts";

export {
  loyaltyTierBodySchema as loyaltyTierBody,
  updateLoyaltyTierBodySchema as updateLoyaltyTierBody,
  loyaltyCustomerBodySchema as customerBody,
  updateLoyaltyCustomerBodySchema as updateCustomerBody,
};
export const idParams = Type.Object(
  { id: uuidSchema },
  { additionalProperties: false },
);
