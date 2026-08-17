import { createMiddleware } from "hono/factory";

import type { ApiEnv } from "../types";

export const structuredLogger = createMiddleware<ApiEnv>(
  async (context, next) => {
    const startedAt = Date.now();
    const requestId = context.req.header("cf-ray") ?? crypto.randomUUID();
    context.set("requestId", requestId);

    await next();

    console.log(
      JSON.stringify({
        level: "info",
        event: "request_complete",
        requestId,
        method: context.req.method,
        path: context.req.path,
        status: context.res.status,
        durationMs: Date.now() - startedAt,
      }),
    );
  },
);
