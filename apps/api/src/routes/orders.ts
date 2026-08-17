import { Hono } from "hono";

import { requireAuth } from "../middleware/auth";
import { authenticatedRateLimit } from "../middleware/rateLimit";
import type { ApiEnv } from "../types";

export const ordersRoute = new Hono<ApiEnv>();

ordersRoute.use("*", requireAuth, authenticatedRateLimit);
ordersRoute.get("/", (context) => context.json({ data: [] }));
