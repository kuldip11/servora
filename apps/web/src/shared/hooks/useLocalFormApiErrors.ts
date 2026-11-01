import { useCallback, useState } from "react";
import {
  extractApiError,
  extractApiFieldErrors,
  toApiClientError,
} from "@/shared/lib/api-client";
import { reportFrontendUiError } from "@pos/observability";
import { useFormValidationVisibility } from "@/shared/hooks/useFormValidationVisibility";

export const useLocalFormApiErrors = () => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);
  const visibility = useFormValidationVisibility();

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
  }, []);

  const resetValidation = useCallback(() => {
    setFieldErrors({});
    setFormErrorMessages([]);
    visibility.resetVisibility();
  }, [visibility]);

  const fieldError = useCallback(
    (field: string, localError?: string) =>
      visibility.fieldError(field, fieldErrors[field], localError),
    [fieldErrors, visibility],
  );

  const handleApiError = useCallback(
    (
      error: unknown,
      knownFields: readonly string[],
      fallbackMessage: string,
      fieldMap?: Readonly<Record<string, string>>,
    ) => {
      const apiFields = extractApiFieldErrors(error);
      const known = new Set(knownFields);
      const nextFieldErrors: Record<string, string> = {};
      const unknownMessages: string[] = [];
      const unknownFields: string[] = [];

      for (const [serverField, messages] of Object.entries(apiFields)) {
        const mappedField = fieldMap?.[serverField] ?? serverField;
        const message = messages[0];
        if (!message) continue;
        if (known.has(mappedField)) {
          nextFieldErrors[mappedField] = message;
        } else {
          unknownFields.push(serverField);
          unknownMessages.push(message);
        }
      }

      setFieldErrors(nextFieldErrors);
      if (unknownMessages.length) {
        const normalized = toApiClientError(error);
        reportFrontendUiError({
          message: "Backend field-error contract drift",
          ...(normalized.code ? { code: normalized.code } : {}),
          ...(normalized.status ? { status: normalized.status } : {}),
          ...(normalized.requestId ? { requestId: normalized.requestId } : {}),
          operation: "form-field-error-mapping",
          unknownFields,
        });
        setFormErrorMessages([...new Set(unknownMessages)]);
      } else if (!Object.keys(nextFieldErrors).length) {
        setFormErrorMessages([extractApiError(error, fallbackMessage)]);
      } else {
        setFormErrorMessages([]);
      }

      return Object.keys(nextFieldErrors).length > 0;
    },
    [],
  );

  return {
    fieldErrors,
    formErrorMessages,
    clearErrors,
    clearFieldError,
    resetValidation,
    touchField: visibility.touchField,
    touchFields: visibility.touchFields,
    markSubmitted: visibility.markSubmitted,
    clientError: visibility.clientError,
    fieldError,
    handleApiError,
  };
};
