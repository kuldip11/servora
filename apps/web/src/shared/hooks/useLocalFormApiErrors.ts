import { useCallback, useState } from "react";
import {
  extractApiError,
  extractApiFieldErrors,
  toApiClientError,
} from "@pos/api-client";
import { reportFrontendUiError } from "@pos/observability";

export const useLocalFormApiErrors = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormErrorMessages([]);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormErrorMessages([]);
  }, []);

  const handleApiError = useCallback(
    (
      error: unknown,
      knownFields: readonly string[],
      fallbackMessage: string,
      fieldMap: Readonly<Record<string, string>> = {},
    ) => {
      const apiFields = extractApiFieldErrors(error);
      const known = new Set(knownFields);
      const nextFields: Record<string, string> = {};
      const unknownMessages: string[] = [];

      for (const [serverField, messages] of Object.entries(apiFields)) {
        const field = fieldMap[serverField] ?? serverField;
        const message = messages.find(
          (candidate) => candidate.trim().length > 0,
        );
        if (!message) continue;
        if (known.has(field)) nextFields[field] = message;
        else unknownMessages.push(message);
      }

      if (unknownMessages.length) {
        const normalized = toApiClientError(error);
        const unknownFields = Object.keys(apiFields).filter((serverField) => {
          const field = fieldMap[serverField] ?? serverField;
          return !known.has(field);
        });
        reportFrontendUiError({
          message: "Backend field-error contract drift",
          ...(normalized.code ? { code: normalized.code } : {}),
          ...(normalized.status ? { status: normalized.status } : {}),
          ...(normalized.requestId ? { requestId: normalized.requestId } : {}),
          operation: "form-field-error-mapping",
          unknownFields,
        });
      }

      setFieldErrors(nextFields);
      setFormErrorMessages(
        unknownMessages.length
          ? [...new Set(unknownMessages)]
          : Object.keys(nextFields).length
            ? []
            : [extractApiError(error, fallbackMessage)],
      );

      return Object.keys(nextFields).length > 0;
    },
    [],
  );

  return {
    fieldErrors,
    formErrorMessages,
    clearErrors,
    clearFieldError,
    handleApiError,
  };
};
