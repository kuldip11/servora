const isProductionDeployment =
  process.env.VERCEL_ENV === "production" ||
  process.env.RENDER === "true" ||
  process.env.SERVORA_VALIDATE_PRODUCTION_ENV === "true";

if (!isProductionDeployment) {
  console.log("Skipping strict production environment validation outside production.");
  process.exit(0);
}

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_SIGNIN_URL",
  "LEAD_WEBHOOK_URL",
  "NEXT_PUBLIC_WEB_APP_URL",
  "NEXT_PUBLIC_KITCHEN_APP_URL",
  "NEXT_PUBLIC_WAITER_APP_URL",
  "NEXT_PUBLIC_CUSTOMER_APP_URL",
];

const missing = required.filter((name) => !process.env[name]);

if (missing.length) {
  console.error("Production configuration is incomplete.");
  console.error(`Missing: ${missing.join(", ")}`);
  process.exit(1);
}

for (const name of required) {
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== "https:") throw new Error("must use HTTPS");
    if (url.hostname.endsWith(".example") || url.hostname === "example.com") {
      throw new Error("must not use an example/placeholder hostname");
    }
  } catch (error) {
    console.error(`${name} must be a real HTTPS production URL: ${error.message}`);
    process.exit(1);
  }
}

console.log("Production environment configuration looks valid.");
