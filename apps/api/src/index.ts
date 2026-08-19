import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";

import { apiError } from "./lib/errors";
import { structuredLogger } from "./lib/logger";
import { corsMiddleware } from "./middleware/cors";
import { publicRateLimit } from "./middleware/rateLimit";
import { adminRoute } from "./routes/admin";
import { customersRoute } from "./routes/customers";
import { facebookRoute } from "./routes/facebook";
import { healthRoute } from "./routes/health";
import { disputesRoute, evidenceRoute } from "./routes/evidence";
import { ordersRoute } from "./routes/orders";
import { productsRoute } from "./routes/products";
import { safeOrdersRoute } from "./routes/safe-orders";
import { sellersRoute } from "./routes/sellers";
import { trustRoute } from "./routes/trust";
import type { ApiEnv } from "./types";

const app = new Hono<ApiEnv>();

app.use("*", corsMiddleware);
app.use("*", structuredLogger);
app.use("*", async (c, next) => {
  if (c.env.ENVIRONMENT === "production") {
    return next();
  }
  return prettyJSON()(c, next);
});

app.route("/v1/health", healthRoute);
app.use("/v1/sellers/*", publicRateLimit);
app.use("/v1/trust/*", publicRateLimit);
app.route("/v1/sellers", sellersRoute);
app.post("/v1/orders", async (context, next) => {
  const payload = await context.req.raw.clone().json().catch(() => null) as { seller_id?: unknown } | null;
  if (typeof payload?.seller_id !== "string") return next();
  const target = new URL(context.req.url);
  target.pathname = "/";
  return safeOrdersRoute.fetch(new Request(target, context.req.raw), context.env, context.executionCtx);
});
app.route("/v1/orders", evidenceRoute);
app.route("/v1/orders", ordersRoute);
// Safe Order public reads and seller actions share the documented order URL.
app.route("/v1/orders", safeOrdersRoute);
app.route("/v1/safe-orders", safeOrdersRoute);
app.route("/v1/disputes", disputesRoute);
app.route("/v1/products", productsRoute);
app.route("/v1/customers", customersRoute);
app.route("/v1/facebook", facebookRoute);
// Meta requires the webhook at this canonical path. Internally the same
// route is also available under /v1/facebook/webhook for local testing.
app.all("/v1/webhooks/facebook", async (context) => {
  const target = new URL(context.req.url);
  target.pathname = "/webhook";
  return facebookRoute.fetch(new Request(target, context.req.raw), context.env, context.executionCtx);
});
app.route("/v1/trust", trustRoute);
app.route("/v1/admin", adminRoute);

app.notFound((c) => apiError(c, 404, "NOT_FOUND", "Route not found"));

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      level: "error",
      event: "unhandled_error",
      requestId: c.get("requestId"),
      message: error.message,
    }),
  );

  return apiError(c, 500, "INTERNAL_ERROR", "Internal server error");
});

export default app;
