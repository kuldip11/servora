import { useMutation } from "@tanstack/react-query";
import { menuPricingService } from "@/features/menu/services/menu-pricing.service";

export const useCreateHappyHourRule = () =>
  useMutation({
    mutationFn: menuPricingService.createHappyHour,
  });
