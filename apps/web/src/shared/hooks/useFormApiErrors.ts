import { useCallback, useState } from "react";
import {
  extractApiError,
  extractApiFieldErrors,
  toApiClientError,
} from "@/shared/lib/api-client";
import { reportFrontendUiError } from "@pos/observability";
import { applyApiFieldErrors } from "@/shared/lib/form-errors";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

export const useFormApiErrors = <T extends FieldValues>() => {
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);

  const clearFormErrors = useCallback(() => {
    setFormErrorMessages([]);
  }, []);

  const handleApiError = useCallback(
    (
      error: unknown,
      setError: UseFormSetError<T>,
      knownFields: readonly FieldPath<T>[],
      fallbackMessage: string,
      fieldMap?: Readonly<Record<string, FieldPath<T>>>,
    ) => {
      const unknownMessages: string[] = [];
      const applied = applyApiFieldErrors(error, setError, {
        knownFields,
        ...(fieldMap ? { fieldMap } : {}),
        onUnknownFieldErrors: (messages) => unknownMessages.push(...messages),
      });

      if (unknownMessages.length) {
        const apiFields = extractApiFieldErrors(error);
        const known = new Set<string>(knownFields);
        const unknownFields = Object.keys(apiFields).filter((serverField) => {
          const mapped = fieldMap?.[serverField] ?? serverField;
          return !known.has(mapped);
        });
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
      } else if (!applied) {
        setFormErrorMessages([extractApiError(error, fallbackMessage)]);
      } else {
        setFormErrorMessages([]);
      }

      return applied;
    },
    [],
  );

  return {
    formErrorMessages,
    clearFormErrors,
    handleApiError,
  };
};
