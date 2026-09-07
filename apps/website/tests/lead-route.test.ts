import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/lead/route";

describe("POST /api/lead", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("LEAD_WEBHOOK_URL", "https://example.test/lead");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    );
  });

  let requestId = 1;
  const request = (body: unknown, headers: Record<string, string> = {}) => {
    const clientHeaders =
      "x-forwarded-for" in headers || "x-real-ip" in headers
        ? headers
        : { "x-forwarded-for": `192.0.2.${requestId++}`, ...headers };
    return POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...clientHeaders },
      }),
    );
  };

  it("rate limits repeated submissions by forwarded client address", async () => {
    const headers = {
      "x-forwarded-for": "203.0.113.99, 10.0.0.1",
    };
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(
        { website: "bot", name: "Bot", email: "bot@example.com" },
        headers,
      );
      expect(response.status).toBe(200);
    }
    const limited = await request(
      { website: "bot", name: "Bot", email: "bot@example.com" },
      headers,
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("600");
  });

  it("uses x-real-ip when forwarded-for is absent", async () => {
    const response = await request(
      { website: "bot", name: "Bot", email: "bot@example.com" },
      { "x-real-ip": "203.0.113.77" },
    );
    expect(response.status).toBe(200);
  });

  it("rejects missing and overlong names", async () => {
    expect((await request({ email: "a@example.com" })).status).toBe(400);
    expect(
      (await request({ name: "x".repeat(121), email: "a@example.com" })).status,
    ).toBe(400);
  });

  it("rejects non-string and overlong email values", async () => {
    expect((await request({ name: "A", email: 123 })).status).toBe(400);
    const longEmail = `${"a".repeat(245)}@example.com`;
    expect((await request({ name: "A", email: longEmail })).status).toBe(400);
  });

  it("rejects each overlong optional field", async () => {
    const base = { name: "A", email: "a@example.com" };
    expect((await request({ ...base, business: "x".repeat(161) })).status).toBe(
      400,
    );
    expect((await request({ ...base, locations: "x".repeat(41) })).status).toBe(
      400,
    );
    expect((await request({ ...base, message: "x".repeat(4001) })).status).toBe(
      400,
    );
    expect((await request({ ...base, subject: "x".repeat(121) })).status).toBe(
      400,
    );
  });

  it("normalizes non-string optional fields to defaults", async () => {
    const response = await request(
      {
        name: " A ",
        email: " A@EXAMPLE.COM ",
        business: 1,
        locations: 2,
        message: 3,
        source: 4,
        subject: 5,
        website: 6,
      },
      { "x-forwarded-for": "198.51.100.55" },
    );
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.test/lead",
      expect.objectContaining({
        body: expect.stringContaining('"source":"website"'),
      }),
    );
  });

  it("returns 503 when no lead webhook is configured", async () => {
    vi.stubEnv("LEAD_WEBHOOK_URL", "");
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const response = await request(
      { name: "A", email: "a@example.com" },
      { "x-forwarded-for": "198.51.100.56" },
    );
    expect(response.status).toBe(503);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        body: "{",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.57",
        },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify({ name: "A", email: "invalid" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(400);
  });

  it("silently accepts honeypot submissions", async () => {
    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify({
          website: "bot",
          name: "A",
          email: "a@example.com",
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 502 when the lead destination fails", async () => {
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad", { status: 500 })),
    );
    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify({ name: "A", email: "a@example.com" }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "198.51.100.10",
        },
      }),
    );
    expect(response.status).toBe(502);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("delivers a valid lead", async () => {
    const response = await POST(
      new Request("http://localhost/api/lead", {
        method: "POST",
        body: JSON.stringify({
          name: "A",
          email: "a@example.com",
          source: "contact",
          subject: "sales",
          message: "Hello",
        }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
