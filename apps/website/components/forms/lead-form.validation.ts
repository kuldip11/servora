export type LeadField =
  "name" | "email" | "business" | "locations" | "subject" | "message";

export type LeadFieldErrors = Partial<Record<LeadField, string>>;

export type LeadFormValues = Record<LeadField, string> & {
  website: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateBase = (values: LeadFormValues): LeadFieldErrors => {
  const errors: LeadFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (!name) errors.name = "Please enter your name.";
  else if (name.length > 120)
    errors.name = "Name must be 120 characters or fewer.";

  if (!email || !EMAIL_RE.test(email)) {
    errors.email = "Please enter a valid work email.";
  } else if (email.length > 254) {
    errors.email = "Email must be 254 characters or fewer.";
  }

  if (values.business.trim().length > 160) {
    errors.business = "Business name must be 160 characters or fewer.";
  }
  if (values.locations.trim().length > 40) {
    errors.locations = "Location count must be 40 characters or fewer.";
  }
  if (values.subject.trim().length > 120) {
    errors.subject = "Subject must be 120 characters or fewer.";
  }
  if (values.message.trim().length > 4000) {
    errors.message = "Message must be 4000 characters or fewer.";
  }

  return errors;
};

export const validateContactLead = (
  values: LeadFormValues,
): LeadFieldErrors => {
  const errors = validateBase(values);
  if (!values.message.trim()) errors.message = "Please enter a message.";
  return errors;
};

export const validateDemoLead = (values: LeadFormValues): LeadFieldErrors =>
  validateBase(values);
