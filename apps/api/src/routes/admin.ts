import { Hono } from "hono";

import { apiError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const adminRoute = new Hono<ApiEnv>();

adminRoute.use("*", requireAuth, authenticatedRateLimit);
adminRoute.get("/", (context) =>
  apiError(context, 403, "FORBIDDEN", "Admin access is not implemented"),
);
