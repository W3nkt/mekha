import type { Database } from "../database.types";
export type TrustCheckRecord =
  Database["public"]["Tables"]["trust_checks"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
