import type { Database } from "../database.types";
import type { LaoAddress } from "../api/orders";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
export type OrderWithAddress = Order & { shipping_address: LaoAddress };
