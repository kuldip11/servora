// Reserved .invalid hosts are permitted only for explicit CI fixture builds.
const isCiFixtureBuild =
  process.env.CI === "true" &&
  process.env.SERVORA_SEO_TEST_BUILD === "true" &&
  process.env.VERCEL_ENV !== "production" &&
  process.env.RENDER !== "true";
const isProductionDeployment =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.RENDER === "true" ||
  process.env.SERVORA_VALIDATE_PRODUCTION_ENV === "true";

if (!isProductionDeployment) {
  console.log(
    "Skipping strict production environment validation outside production.",
  );
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
    if (url.hostname.endsWith(".invalid") && !isCiFixtureBuild)
      throw new Error(
        "reserved CI fixture hostname is not a production domain",
      );
    if (url.username || url.password)
      throw new Error("must not contain credentials");
    if (
      name !== "NEXT_PUBLIC_APP_SIGNIN_URL" &&
      name !== "LEAD_WEBHOOK_URL" &&
      (url.pathname !== "/" || url.search || url.hash)
    )
      throw new Error("must be an origin without path, query or fragment");
    if (
      url.hostname.endsWith(".example") ||
      url.hostname.endsWith(".test") ||
      /(^|\.)(example\.(com|org|net)|localhost)$/.test(url.hostname) ||
      !url.hostname.includes(".") ||
      /^(127\.|0\.|\[?::1\]?)/.test(url.hostname)
    ) {
      throw new Error("must not use an example/placeholder hostname");
    }
  } catch (error) {
    console.error(
      `${name} must be a real HTTPS production URL: ${error.message}`,
    );
    process.exit(1);
  }
}

console.log("Production environment configuration looks valid.");
