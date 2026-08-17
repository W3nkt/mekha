import { Hono } from "hono";

import type { ApiEnv } from "../types";

export const trustRoute = new Hono<ApiEnv>();

trustRoute.get("/", (context) => context.json({ data: [] }));
