import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { ApiEnv } from "../types";

export type ErrorCode =
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "INVALID_TOKEN"
  | "NOT_FOUND"
  | "TOO_MANY_REQUESTS"
  | "UNAUTHORIZED"
  | "UNPROCESSABLE_ENTITY";

export const apiError = (
  context: Context<ApiEnv>,
  status: ContentfulStatusCode,
  code: ErrorCode,
  error: string,
  details: Record<string, unknown> = {},
) => context.json({ error, code, details }, status);
