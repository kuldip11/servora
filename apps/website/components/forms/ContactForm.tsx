"use client";

import { FormEvent, useRef } from "react";
import { track } from "@/lib/analytics";
import { LeadFieldError } from "./LeadFieldError";
import { useLeadForm } from "./useLeadForm";
import { validateContactLead } from "./lead-form.validation";

const initialValues = {
  name: "",
  email: "",
  business: "",
  locations: "",
  subject: "general",
  message: "",
  website: "",
};

export const ContactForm = () => {
  const started = useRef(false);
  const form = useLeadForm({
    initialValues,
    source: "contact",
    validate: validateContactLead,
    onSuccess: (values) =>
      track({
        event: "contact_form_submit",
        subject: values.subject || "general",
      }),
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ok = await form.submit();
    if (!ok && form.formError) {
      track({ event: "contact_form_error", error_type: form.formError });
    }
  };

  const startTracking = () => {
    if (!started.current) {
      started.current = true;
      track({ event: "contact_form_start", source_page: "contact" });
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
              form.fieldErrors.name ? "contact-name-error" : undefined
            }
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-surface)]"
          />
          <LeadFieldError
            id="contact-name-error"
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
              form.fieldErrors.email ? "contact-email-error" : undefined
            }
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-surface)]"
          />
          <LeadFieldError
            id="contact-email-error"
            message={form.fieldErrors.email}
          />
        </label>
      </div>
      <label className="text-sm font-medium">
        Subject
        <select
          name="subject"
          value={form.values.subject}
          onChange={(event) => form.updateField("subject", event.target.value)}
          onFocus={startTracking}
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
        >
          <option value="general">General enquiry</option>
          <option value="sales">Sales</option>
          <option value="support">Support</option>
          <option value="partnership">Partnership</option>
        </select>
      </label>
      <label className="text-sm font-medium">
        Message
        <textarea
          name="message"
          rows={6}
          value={form.values.message}
          onChange={(event) => form.updateField("message", event.target.value)}
          onFocus={startTracking}
          aria-invalid={Boolean(form.fieldErrors.message)}
          aria-describedby={
            form.fieldErrors.message ? "contact-message-error" : undefined
          }
          className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
        />
        <LeadFieldError
          id="contact-message-error"
          message={form.fieldErrors.message}
        />
      </label>
      <button
        disabled={!form.isValid || form.state === "submitting"}
        className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {form.state === "submitting" ? "Sending…" : "Send message"}
      </button>
      {form.state === "success" && (
        <p role="status" className="text-sm text-[var(--success)]">
          Thanks. Your message has been sent. We’ll be in touch soon.
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
