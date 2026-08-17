import type { MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

import { apiError } from "../lib/errors";
import type { ApiEnv, ApiBindings } from "../types";

type RateLimiterName =
  "AUTH_RATE_LIMITER" | "AUTHENTICATED_RATE_LIMITER" | "PUBLIC_RATE_LIMITER";

const clientIp = (headers: Headers) =>
  headers.get("cf-connecting-ip") ?? "unknown";

const rateLimit = (
  binding: RateLimiterName,
  keyForRequest: (context: Parameters<MiddlewareHandler<ApiEnv>>[0]) => string,
) =>
  createMiddleware<ApiEnv>(async (context, next) => {
    const limiter = context.env[binding] as ApiBindings[RateLimiterName];
    const { success } = await limiter.limit({ key: keyForRequest(context) });

    if (!success) {
      return apiError(context, 429, "TOO_MANY_REQUESTS", "Too many requests");
    }

    await next();
  });

export const publicRateLimit = rateLimit("PUBLIC_RATE_LIMITER", (context) =>
  clientIp(context.req.raw.headers),
);

export const authRateLimit = rateLimit("AUTH_RATE_LIMITER", (context) =>
  clientIp(context.req.raw.headers),
);

export const authenticatedRateLimit = rateLimit(
  "AUTHENTICATED_RATE_LIMITER",
  (context) => context.get("user").id,
);
