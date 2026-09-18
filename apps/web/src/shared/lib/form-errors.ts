import { extractApiFieldErrors } from "@pos/api-client";
import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";

export const applyApiFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean => {
  const fieldErrors = extractApiFieldErrors(error);
  let applied = false;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const message = messages[0];
    if (!message) continue;
    setError(field as FieldPath<T>, { type: "server", message });
    applied = true;
  }
  return applied;
};
