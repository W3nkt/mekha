import { Hono } from "hono";

import { publicRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const healthRoute = new Hono<ApiEnv>();

healthRoute.get("/", publicRateLimit, (context) =>
  context.json({ status: "ok", environment: context.env.ENVIRONMENT }),
);
