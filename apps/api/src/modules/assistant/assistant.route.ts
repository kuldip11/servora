import { Elysia } from "elysia";
import {
  assistantCapabilitiesResponseSchema,
  assistantQuestionSchema,
  assistantReplyResponseSchema,
  standardErrorResponseSchemas,
} from "@pos/contracts";
import { CustomerSessionRequiredError } from "@/core/errors";
import { assistantController } from "./assistant.controller";
const requireToken = (headers: Record<string, string | undefined>) => {
  const token = headers["x-customer-session"];
  if (!token) throw new CustomerSessionRequiredError();
  return token;
};
export const assistantRouter = new Elysia({ prefix: "/api/customer/assistant" })
  .get(
    "/capabilities",
    async ({ headers, set }) => {
      set.headers["cache-control"] = "no-store";
      return assistantController.capabilities(requireToken(headers));
    },
    {
      response: {
        200: assistantCapabilitiesResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  )
  .post(
    "/messages",
    async ({ headers, body, request, set }) => {
      set.headers["cache-control"] = "no-store";
      return assistantController.ask(
        requireToken(headers),
        body,
        request.signal,
      );
    },
    {
      body: assistantQuestionSchema,
      response: {
        200: assistantReplyResponseSchema,
        ...standardErrorResponseSchemas,
      },
    },
  );
