import { Elysia } from "elysia";
import {
  approvalThresholdListResponseSchema,
  approvalThresholdParamsSchema,
  approvalThresholdResponseSchema,
  approvalThresholdUpsertBodySchema,
  managerApprovalIssueBodySchema,
  managerApprovalTokenResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { requireAuthPlugin } from "@/core/auth";
import { createdResponse, successResponse } from "@/core/response";
import {
  toApprovalThresholdResponse,
  toManagerApprovalTokenResponse,
} from "./approval.mapper";
import { approvalService } from "./approval.service";

export const approvalsRouter = new Elysia({ prefix: "/api/approvals" })
  .use(requireAuthPlugin())
  .get(
    "/thresholds",
    async ({ auth }) => {
      const thresholds = await approvalService.list(auth);
      return successResponse(thresholds.map(toApprovalThresholdResponse));
    },
    {
      response: {
        200: approvalThresholdListResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .put(
    "/thresholds/:actionType",
    async ({ auth, params, body }) => {
      const threshold = await approvalService.upsert(
        auth,
        params.actionType,
        body.thresholdAmount,
        body.requiresRole,
      );
      return successResponse(toApprovalThresholdResponse(threshold));
    },
    {
      params: approvalThresholdParamsSchema,
      body: approvalThresholdUpsertBodySchema,
      response: {
        200: approvalThresholdResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/manager",
    async ({ auth, body }) => {
      const token = await approvalService.issue(auth, body);
      return createdResponse(toManagerApprovalTokenResponse(token));
    },
    {
      body: managerApprovalIssueBodySchema,
      response: {
        200: managerApprovalTokenResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
