import { createMiddleware } from "hono/factory";

import { apiError } from "../lib/errors";
import { getUserForToken } from "../lib/auth";
import type { ApiEnv } from "../types";

const bearerToken = (authorization: string | undefined) => {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
};

export const requireAuth = createMiddleware<ApiEnv>(async (context, next) => {
  const token = bearerToken(context.req.header("authorization"));
  if (!token) {
    return apiError(context, 401, "UNAUTHORIZED", "Unauthorized");
  }

  const user = await getUserForToken(context.env, token);
  if (!user) {
    return apiError(context, 401, "INVALID_TOKEN", "Invalid token");
  }

  context.set("user", user);
  await next();
});
