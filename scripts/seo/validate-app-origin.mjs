const isProduction =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";
if (!isProduction) {
  console.log("Skipping public app origin validation outside production.");
  process.exit(0);
}
const value = process.env.VITE_PUBLIC_APP_URL;
if (!value) {
  console.error(
    "VITE_PUBLIC_APP_URL is required for production social metadata.",
  );
  process.exit(1);
}
try {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname.endsWith(".example") ||
    url.hostname === "example.com"
  ) {
    throw new Error("invalid production origin");
  }
} catch {
  console.error(
    "VITE_PUBLIC_APP_URL must be a clean HTTPS production origin without path/query/hash or placeholder domain.",
  );
  process.exit(1);
}
console.log(`Validated public app origin: ${value}`);
