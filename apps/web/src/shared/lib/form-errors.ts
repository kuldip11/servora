import { extractApiFieldErrors } from "@pos/api-client";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

export type ApplyApiFieldErrorsOptions<T extends FieldValues> = {
  knownFields?: readonly FieldPath<T>[] | undefined;
  onUnknownFieldErrors?: ((messages: string[]) => void) | undefined;
  fieldMap?: Readonly<Record<string, FieldPath<T>>> | undefined;
  shouldFocusFirst?: boolean | undefined;
};

export const applyApiFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options: ApplyApiFieldErrorsOptions<T> = {},
): boolean => {
  const fieldErrors = extractApiFieldErrors(error);
  const knownFields = options.knownFields
    ? new Set<string>(options.knownFields)
    : null;
  const unknownMessages: string[] = [];
  let applied = false;

  for (const [field, messages] of Object.entries(fieldErrors)) {
    const mappedField = options.fieldMap?.[field] ?? (field as FieldPath<T>);
    const message = messages.find((candidate) => candidate.trim().length > 0);
    if (!message) continue;

    if (knownFields && !knownFields.has(mappedField)) {
      unknownMessages.push(message);
      continue;
    }

    setError(
      mappedField,
      { type: "server", message },
      {
        shouldFocus: options.shouldFocusFirst !== false && applied === false,
      },
    );
    applied = true;
  }

  if (unknownMessages.length) {
    options.onUnknownFieldErrors?.([...new Set(unknownMessages)]);
  }

  return applied;
};
