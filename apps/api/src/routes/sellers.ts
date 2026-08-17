import { Hono } from "hono";

import type { ApiEnv } from "../types";

export const sellersRoute = new Hono<ApiEnv>();

sellersRoute.get("/", (context) => context.json({ data: [] }));
