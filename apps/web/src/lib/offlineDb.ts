import Dexie, { type EntityTable } from "dexie";
import type { CreateOrder } from "@mekha/types";

export type CachedProduct = {
  id: string;
  name: string;
  name_lao: string | null;
  photo_urls: string[];
  price: number;
  stock_count: number;
};

export type CachedCustomer = {
  id: string;
  phone: string;
  name: string | null;
  province: string | null;
  district: string | null;
  village_landmark: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  order_count: number;
};

export type CachedPlace = {
  id: string;
  province_id?: string;
  name_lo: string;
  name_en: string;
  sort_order: number;
};

export type PendingOrder = {
  localId: string;
  payload: CreateOrder;
  createdAt: string;
  attempts: number;
  lastError?: string;
  requiresReview?: boolean;
};

export type OrderEvent = {
  id: string;
  orderId: string;
  type: "created" | "confirmed" | "status_changed" | "note_added";
  payload: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
};

export type SyncQueueItem = {
  id: string;
  entityType: "order" | "order_event";
  entityId: string;
  payload: Record<string, unknown>;
  attempts: number;
  syncedAt: string | null;
  lastError?: string;
  requiresReview?: boolean;
  createdAt: string;
};

class MekhaOfflineDb extends Dexie {
  products!: EntityTable<CachedProduct, "id">;
  customers!: EntityTable<CachedCustomer, "id">;
  provinces!: EntityTable<CachedPlace, "id">;
  districts!: EntityTable<CachedPlace, "id">;
  pendingOrders!: EntityTable<PendingOrder, "localId">;
  orderEvents!: EntityTable<OrderEvent, "id">;
  syncQueue!: EntityTable<SyncQueueItem, "id">;

  constructor() {
    super("mekha-offline");
    this.version(1).stores({
      products: "id",
      customers: "id, phone",
      provinces: "id",
      districts: "id, province_id",
      pendingOrders: "localId, createdAt",
    });
    this.version(2).stores({
      products: "id",
      customers: "id, phone",
      provinces: "id",
      districts: "id, province_id",
      pendingOrders: "localId, createdAt, requiresReview",
      orderEvents: "id, orderId, synced, createdAt",
      syncQueue: "id, entityType, syncedAt, attempts, requiresReview, createdAt",
    });
  }
}

export const offlineDb = new MekhaOfflineDb();
