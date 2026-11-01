"use client";

import { useMemo, useState } from "react";
import type {
  LeadField,
  LeadFieldErrors,
  LeadFormValues,
} from "./lead-form.validation";

type LeadApiResponse = {
  error?: string;
  fieldErrors?: Partial<Record<LeadField, string[]>>;
};

type UseLeadFormOptions = {
  initialValues: LeadFormValues;
  source: string;
  validate: (values: LeadFormValues) => LeadFieldErrors;
  onSuccess: (values: LeadFormValues) => void;
};

export const useLeadForm = ({
  initialValues,
  source,
  validate,
  onSuccess,
}: UseLeadFormOptions) => {
  const [values, setValues] = useState<LeadFormValues>(initialValues);
  const [serverFieldErrors, setServerFieldErrors] = useState<LeadFieldErrors>(
    {},
  );
  const [formError, setFormError] = useState("");
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const clientFieldErrors = useMemo(() => validate(values), [validate, values]);
  const fieldErrors = { ...clientFieldErrors, ...serverFieldErrors };
  const isValid = Object.keys(clientFieldErrors).length === 0;

  const updateField = (field: LeadField | "website", value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (field !== "website") {
      setServerFieldErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
    if (state === "error") setState("idle");
    if (formError) setFormError("");
  };

  const submit = async () => {
    if (!isValid || state === "submitting") return false;
    setState("submitting");
    setFormError("");
    setServerFieldErrors({});

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, source }),
      });
      const result = (await response.json()) as LeadApiResponse;
      if (!response.ok) {
        const mappedErrors: LeadFieldErrors = {};
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          const message = messages?.find(
            (candidate) => candidate.trim().length > 0,
          );
          if (message) mappedErrors[field as LeadField] = message;
        }
        if (Object.keys(mappedErrors).length) {
          setServerFieldErrors(mappedErrors);
          setState("error");
          return false;
        }
        throw new Error(result.error || "Unable to submit your request.");
      }

      onSuccess(values);
      setValues(initialValues);
      setState("success");
      return true;
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
      setState("error");
      return false;
    }
  };

  return {
    values,
    fieldErrors,
    formError,
    state,
    isValid,
    updateField,
    submit,
  };
};
