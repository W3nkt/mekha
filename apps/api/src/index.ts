import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";

import { apiError } from "./lib/errors";
import { structuredLogger } from "./lib/logger";
import { corsMiddleware } from "./middleware/cors";
import { publicRateLimit } from "./middleware/rateLimit";
import { adminRoute } from "./routes/admin";
import { customersRoute } from "./routes/customers";
import { healthRoute } from "./routes/health";
import { ordersRoute } from "./routes/orders";
import { productsRoute } from "./routes/products";
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
app.route("/v1/orders", ordersRoute);
app.route("/v1/products", productsRoute);
app.route("/v1/customers", customersRoute);
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
