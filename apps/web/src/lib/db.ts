import Dexie, { type Table } from "dexie";

export type LocalOrder = { id?: number; order_id: string; seller_id: string; status: string; payload: Record<string, unknown>; created_at: string };
export type OrderEvent = { id?: number; order_id: string; type: "created" | "confirmed" | "status_changed" | "note_added"; payload: Record<string, unknown>; created_at: string; synced: boolean };
export type SyncQueueItem = { id?: number; entity_type: string; payload: Record<string, unknown>; created_at: string; synced_at: string | null; attempts: number; last_error?: string; requires_review?: boolean };

export class MeKhaDB extends Dexie { orders!: Table<LocalOrder, number>; orderEvents!: Table<OrderEvent, number>; syncQueue!: Table<SyncQueueItem, number>; constructor() { super("MeKhaDB"); this.version(1).stores({ orders: "++id, order_id, seller_id, status, created_at", orderEvents: "++id, order_id, synced, created_at", syncQueue: "++id, entity_type, synced_at, attempts" }); } }
export const db = new MeKhaDB();
