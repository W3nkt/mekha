import type { CourierAdapter } from "@mekha/types";
import { MockCourierAdapter } from "./mock.adapter";

/** Production seam; credentials and endpoint are intentionally not hard-coded. */
export class AnousithAdapter extends MockCourierAdapter implements CourierAdapter {
  readonly name = "anousith" as const;
}
