import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import app from "./index";
import type { ApiBindings } from "./types";

class TestRateLimit implements RateLimit {
  readonly #counts = new Map<string, number>();

  constructor(private readonly limitValue: number) {}

  async limit({ key }: RateLimitOptions): Promise<RateLimitOutcome> {
    const count = (this.#counts.get(key) ?? 0) + 1;
    this.#counts.set(key, count);
    return { success: count <= this.limitValue };
  }
}

const createEnv = (): ApiBindings => ({
  ALLOWED_ORIGIN: "http://localhost:5173",
  AUTH_RATE_LIMITER: new TestRateLimit(10),
  AUTHENTICATED_RATE_LIMITER: new TestRateLimit(300),
  ENVIRONMENT: "development",
  PUBLIC_RATE_LIMITER: new TestRateLimit(60),
  QWEN_API_KEY: "test-only",
  SUPABASE_SERVICE_ROLE_KEY: "test-only",
  SUPABASE_URL: "https://mjgcivpsboccmstphyox.supabase.co",
});

const request = (path: string, env: ApiBindings, headers: HeadersInit = {}) =>
  app.request(
    path,
    {
      headers: {
        "cf-connecting-ip": "203.0.113.10",
        ...headers,
      },
    },
    env,
  );

describe("Mekha API", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns health and environment data", async () => {
    const response = await request("/v1/health", createEnv());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      environment: "development",
    });
  });

  it("adds CORS headers only for the configured origin", async () => {
    const response = await request("/v1/health", createEnv(), {
      origin: "http://localhost:5173",
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
  });

  it("allows Mekha Pages preview origins", async () => {
    const previewOrigin = "https://agent-s0-foundation.mekha-web.pages.dev";
    const response = await request("/v1/health", createEnv(), {
      origin: previewOrigin,
    });

    expect(response.headers.get("access-control-allow-origin")).toBe(
      previewOrigin,
    );
  });

  it("rejects a protected route without a token", async () => {
    const response = await request("/v1/orders", createEnv());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized",
      code: "UNAUTHORIZED",
    });
  });

  it("validates public seller search parameters", async () => {
    const response = await request(
      "/v1/sellers/search?q=&type=unknown",
      createEnv(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "BAD_REQUEST",
      error: "Invalid seller search",
    });
  });

  it("rejects a dashboard profile request without a token", async () => {
    const response = await request("/v1/sellers/me", createEnv());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a profile update without a token", async () => {
    const response = await app.request(
      "/v1/sellers/some-id",
      {
        method: "PATCH",
        headers: { "cf-connecting-ip": "203.0.113.10" },
        body: JSON.stringify({ description: "hello" }),
      },
      createEnv(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("returns 404 for an invalid public seller profile ID", async () => {
    const response = await request("/v1/sellers/not-a-seller", createEnv());

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      code: "NOT_FOUND",
      error: "Seller not found",
    });
  });

  it("rejects an invalid Supabase access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid JWT" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await request("/v1/orders", createEnv(), {
      authorization: "Bearer invalid-token",
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_TOKEN",
    });
  });

  it("passes a valid Supabase user to a protected route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: "60ef2a7f-ed8b-4ee2-a9c6-c005afadc80d",
            aud: "authenticated",
            role: "authenticated",
            phone: "+8562012345678",
            app_metadata: {},
            user_metadata: {},
            created_at: "2026-08-17T00:00:00.000Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await request("/v1/orders", createEnv(), {
      authorization: "Bearer valid-token",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [] });
  });

  it("rate limits the sixty-first public request", async () => {
    const env = createEnv();

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await request("/v1/health", env);
      expect(response.status).toBe(200);
    }

    const response = await request("/v1/health", env);
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "Too many requests",
      code: "TOO_MANY_REQUESTS",
    });
  });
});
