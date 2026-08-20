import type { CourierAdapter } from "@mekha/types";
import type { ApiBindings } from "../types";
import { MockCourierAdapter } from "./mock.adapter";

/**
 * Always Mock today: Mekha ships with the adapter interface real Anousith
 * integration will implement, but no Anousith API credentials or confirmed
 * settlement file format exist yet. Swap this once they do.
 */
export function getCourierAdapter(_env: ApiBindings): CourierAdapter {
  return new MockCourierAdapter();
}
