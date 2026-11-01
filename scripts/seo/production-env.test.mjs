import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const run = (overrides = {}) =>
  spawnSync(
    process.execPath,
    ["apps/website/scripts/validate-production-env.mjs"],
    {
      encoding: "utf8",
      env: { PATH: process.env.PATH, NODE_ENV: "production", ...overrides },
    },
  );
const valid = {
  NEXT_PUBLIC_SITE_URL: "https://servora.app",
  NEXT_PUBLIC_APP_SIGNIN_URL: "https://app.servora.app/login",
  NEXT_PUBLIC_WEB_APP_URL: "https://app.servora.app",
  NEXT_PUBLIC_KITCHEN_APP_URL: "https://kitchen.servora.app",
  NEXT_PUBLIC_WAITER_APP_URL: "https://waiter.servora.app",
  NEXT_PUBLIC_CUSTOMER_APP_URL: "https://order.servora.app",
  LEAD_WEBHOOK_URL: "https://leads.servora.app/submit",
};
test("generic production cannot skip missing configuration", () =>
  assert.equal(run().status, 1));
test("accepts origin URLs and endpoint paths", () =>
  assert.equal(run(valid).status, 0));
for (const url of [
  "https://servora.example",
  "https://sub.example.com",
  "https://servora.app/path",
  "https://user:pass@servora.app",
  "https://servora.app?x=1",
  "https://localhost",
  "https://servora.ci.invalid",
]) {
  test(`rejects site origin ${url}`, () =>
    assert.equal(run({ ...valid, NEXT_PUBLIC_SITE_URL: url }).status, 1));
}

test("reserved fixture origins require explicit CI context", () => {
  const fixture = Object.fromEntries(
    Object.entries(valid).map(([key, value]) => [
      key,
      value.replaceAll("servora.app", "servora.ci.invalid"),
    ]),
  );
  assert.equal(
    run({ ...fixture, CI: "true", SERVORA_SEO_TEST_BUILD: "true" }).status,
    0,
  );
  assert.equal(
    run({
      ...fixture,
      CI: "true",
      SERVORA_SEO_TEST_BUILD: "true",
      VERCEL_ENV: "production",
    }).status,
    1,
  );
});
