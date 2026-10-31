import { useMutation, useQuery } from "@tanstack/react-query";
import {
  differentiatorAvailabilityQuery,
  differentiatorEngineeringQuery,
  differentiatorMenuChoicesQuery,
} from "../query-options";
import { differentiatorsService } from "../services/differentiators.service";

export const useDifferentiatorMenuChoices = () =>
  useQuery(differentiatorMenuChoicesQuery());

export const useDifferentiatorAvailability = (
  channel: string,
  fulfillment: string,
  cause: string,
) => useQuery(differentiatorAvailabilityQuery(channel, fulfillment, cause));

export const useDifferentiatorEngineering = (windowDays: string) =>
  useQuery(differentiatorEngineeringQuery(windowDays));

export const useExplainDifferentiatorOrder = () =>
  useMutation({ mutationFn: differentiatorsService.explainOrder });

export const useSaveDifferentiatorApprovalThreshold = () =>
  useMutation({
    mutationFn: ({
      action,
      thresholdAmount,
      requiresRole,
    }: {
      action: "VOID" | "COMP";
      thresholdAmount: number;
      requiresRole: string;
    }) =>
      differentiatorsService.setApprovalThreshold(
        action,
        thresholdAmount,
        requiresRole,
      ),
  });
