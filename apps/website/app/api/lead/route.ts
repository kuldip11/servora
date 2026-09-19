import { websiteLogger } from "@/lib/logger";
import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestLog = new Map<string, number[]>();

const clientKey = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter(
    (time) => now - time < WINDOW_MS,
  );
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(key, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(key, recent);
  return false;
};

export const POST = async (request: Request) => {
  try {
    if (isRateLimited(clientKey(request))) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const business =
      typeof body.business === "string" ? body.business.trim() : "";
    const locations =
      typeof body.locations === "string" ? body.locations.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const source =
      typeof body.source === "string" ? body.source.trim() : "website";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const honeypot =
      typeof body.website === "string" ? body.website.trim() : "";

    if (honeypot) return NextResponse.json({ ok: true });
    if (!name || name.length > 120)
      return NextResponse.json(
        {
          error: "Please enter your name.",
          fieldErrors: { name: ["Please enter your name."] },
        },
        { status: 400 },
      );
    if (!EMAIL_RE.test(email) || email.length > 254)
      return NextResponse.json(
        {
          error: "Please enter a valid work email.",
          fieldErrors: { email: ["Please enter a valid work email."] },
        },
        { status: 400 },
      );
    const fieldErrors: Record<string, string[]> = {};
    if (business.length > 160)
      fieldErrors.business = ["Business name must be 160 characters or fewer."];
    if (locations.length > 40)
      fieldErrors.locations = [
        "Location count must be 40 characters or fewer.",
      ];
    if (message.length > 4000)
      fieldErrors.message = ["Message must be 4000 characters or fewer."];
    if (subject.length > 120)
      fieldErrors.subject = ["Subject must be 120 characters or fewer."];
    if (Object.keys(fieldErrors).length)
      return NextResponse.json(
        { error: "One or more fields are too long.", fieldErrors },
        { status: 400 },
      );

    const lead = {
      name,
      email,
      business,
      locations,
      subject,
      message,
      source,
      receivedAt: new Date().toISOString(),
    };
    const webhook = process.env.LEAD_WEBHOOK_URL;

    if (!webhook) {
      websiteLogger.error(
        "lead.webhook_missing",
        new Error("LEAD_WEBHOOK_URL is not configured"),
        { source },
      );
      return NextResponse.json(
        { error: "Lead delivery is not configured yet." },
        { status: 503 },
      );
    }

    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      websiteLogger.error(
        "lead.webhook_failed",
        new Error(`Lead webhook returned ${response.status}`),
        { source, status: response.status },
      );
      return NextResponse.json(
        { error: "We could not submit your request. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    websiteLogger.error("lead.request_failed", error);
    const status = error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json(
      {
        error:
          status === 400
            ? "Invalid request."
            : "Unable to submit your request.",
      },
      { status },
    );
  }
};
