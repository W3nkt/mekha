import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

import type { ApiEnv } from "../types";

export const corsMiddleware = createMiddleware<ApiEnv>(
  async (context, next) => {
    const middleware = cors({
      origin: context.env.ALLOWED_ORIGIN,
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],
      maxAge: 86400,
    });

    return middleware(context, next);
  },
);
