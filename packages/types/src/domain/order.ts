import type { Database } from "../database.types";
import type { LaoAddress } from "../api/orders";

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];
export type OrderWithAddress = Order & { shipping_address: LaoAddress };

export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderItemInsert =
  Database["public"]["Tables"]["order_items"]["Insert"];

export type OrderWithItems = OrderWithAddress & { items: OrderItem[] };
