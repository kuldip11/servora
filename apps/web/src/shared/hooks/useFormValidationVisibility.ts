import { useCallback, useState } from "react";

export const useFormValidationVisibility = () => {
  const [touchedFields, setTouchedFields] = useState<Record<string, true>>({});
  const [submitted, setSubmitted] = useState(false);

  const touchField = useCallback((field: string) => {
    setTouchedFields((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }, []);

  const touchFields = useCallback((fields: readonly string[]) => {
    if (!fields.length) return;
    setTouchedFields((current) => {
      let changed = false;
      const next = { ...current };
      for (const field of fields) {
        if (!next[field]) {
          next[field] = true;
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, []);

  const markSubmitted = useCallback(() => setSubmitted(true), []);

  const resetVisibility = useCallback(() => {
    setTouchedFields({});
    setSubmitted(false);
  }, []);

  const isFieldVisible = useCallback(
    (field: string) => submitted || Boolean(touchedFields[field]),
    [submitted, touchedFields],
  );

  const clientError = useCallback(
    (field: string, error?: string) =>
      isFieldVisible(field) ? error : undefined,
    [isFieldVisible],
  );

  const fieldError = useCallback(
    (field: string, serverError?: string, localError?: string) =>
      serverError ?? (isFieldVisible(field) ? localError : undefined),
    [isFieldVisible],
  );

  return {
    submitted,
    touchedFields,
    touchField,
    touchFields,
    markSubmitted,
    resetVisibility,
    isFieldVisible,
    clientError,
    fieldError,
  };
};
