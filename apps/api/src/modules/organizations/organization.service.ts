import { organizationLoyaltyService } from "./organization-loyalty.service";
import { organizationMenuService } from "./organization-menu.service";
import { organizationProfileService } from "./organization-profile.service";

export type { OrganizationMenuInput } from "./organization-menu.types";

export const organizationService = {
  ...organizationLoyaltyService,
  ...organizationProfileService,
  ...organizationMenuService,
};
