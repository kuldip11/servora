"use client";

import { FormEvent, useRef } from "react";
import { Select } from "@pos/ui";
import { track } from "@/lib/analytics";
import { LeadFieldError } from "./LeadFieldError";
import { useLeadForm } from "./useLeadForm";
import { validateDemoLead } from "./lead-form.validation";

const initialValues = {
  name: "",
  email: "",
  business: "",
  locations: "1",
  subject: "",
  message: "",
  website: "",
};

export const DemoRequestForm = ({ source = "demo" }: { source?: string }) => {
  const started = useRef(false);
  const form = useLeadForm({
    initialValues,
    source,
    validate: validateDemoLead,
    onSuccess: (values) =>
      track({
        event: "demo_form_submit",
        location_count_bucket: values.locations || "unknown",
      }),
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await form.submit();
  };

  const startTracking = () => {
    if (!started.current) {
      started.current = true;
      track({ event: "demo_form_start", source_page: source });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label>
          Website
          <input
            name="website"
            value={form.values.website}
            onChange={(event) =>
              form.updateField("website", event.target.value)
            }
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Name
          <input
            name="name"
            value={form.values.name}
            onChange={(event) => form.updateField("name", event.target.value)}
            autoComplete="name"
            onFocus={startTracking}
            aria-invalid={Boolean(form.fieldErrors.name)}
            aria-describedby={
              form.fieldErrors.name ? "demo-name-error" : undefined
            }
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-surface)]"
          />
          <LeadFieldError
            id="demo-name-error"
            message={form.fieldErrors.name}
          />
        </label>
        <label className="text-sm font-medium">
          Work email
          <input
            type="email"
            name="email"
            value={form.values.email}
            onChange={(event) => form.updateField("email", event.target.value)}
            autoComplete="email"
            onFocus={startTracking}
            aria-invalid={Boolean(form.fieldErrors.email)}
            aria-describedby={
              form.fieldErrors.email ? "demo-email-error" : undefined
            }
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-surface)]"
          />
          <LeadFieldError
            id="demo-email-error"
            message={form.fieldErrors.email}
          />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Restaurant / business
          <input
            name="business"
            value={form.values.business}
            onChange={(event) =>
              form.updateField("business", event.target.value)
            }
            autoComplete="organization"
            onFocus={startTracking}
            aria-invalid={Boolean(form.fieldErrors.business)}
            aria-describedby={
              form.fieldErrors.business ? "demo-business-error" : undefined
            }
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-surface)]"
          />
          <LeadFieldError
            id="demo-business-error"
            message={form.fieldErrors.business}
          />
        </label>
        <Select
          label="Number of locations"
          name="locations"
          value={form.values.locations}
          onChange={(value) => form.updateField("locations", value)}
          onBlur={startTracking}
          options={["1", "2–5", "6–20", "20+"].map((value) => ({
            value,
            label: value,
          }))}
        />
      </div>
      <label className="text-sm font-medium">
        What would you like to see?
        <textarea
          name="message"
          rows={4}
          value={form.values.message}
          onChange={(event) => form.updateField("message", event.target.value)}
          onFocus={startTracking}
          aria-invalid={Boolean(form.fieldErrors.message)}
          aria-describedby={
            form.fieldErrors.message ? "demo-message-error" : undefined
          }
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
        />
        <LeadFieldError
          id="demo-message-error"
          message={form.fieldErrors.message}
        />
      </label>
      <button
        disabled={!form.isValid || form.state === "submitting"}
        className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {form.state === "submitting" ? "Sending…" : "Request a Demo"}
      </button>
      {form.state === "success" && (
        <p role="status" className="text-sm text-[var(--success)]">
          Thanks. Your request has been sent. We’ll be in touch soon.
        </p>
      )}
      {form.formError && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {form.formError}
        </p>
      )}
    </form>
  );
};
