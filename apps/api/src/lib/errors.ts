import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { ApiEnv } from "../types";

export type ErrorCode =
  | "BAD_REQUEST"
  | "CONFLICT"
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "INVALID_TOKEN"
  | "INVALID_LOCATION"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "PHONE_MISMATCH"
  | "SELLER_EXISTS"
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
