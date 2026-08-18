import type { ApiBindings } from "../types";
import { AnousithAdapter } from "./anousith.adapter";
import { MockCourierAdapter } from "./mock.adapter";

export const getCourierAdapter = (env: ApiBindings) => env.ENVIRONMENT === "production" ? new AnousithAdapter() : new MockCourierAdapter();
