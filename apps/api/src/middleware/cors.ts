import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

import type { ApiEnv } from "../types";

const pagesPreviewPattern =
  /^https:\/\/(?:[a-z0-9-]+\.)?mekha-web\.pages\.dev$/;

let cachedOrigin: string | undefined;
let cachedMiddleware: ReturnType<typeof cors> | undefined;

export const corsMiddleware = createMiddleware<ApiEnv>(
  async (context, next) => {
    const configuredOrigin = context.env.ALLOWED_ORIGIN;

    if (cachedMiddleware === undefined || cachedOrigin !== configuredOrigin) {
      cachedOrigin = configuredOrigin;
      cachedMiddleware = cors({
        origin: (origin) =>
          origin === configuredOrigin || pagesPreviewPattern.test(origin)
            ? origin
            : "",
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
    }

    return cachedMiddleware(context, next);
  },
);
