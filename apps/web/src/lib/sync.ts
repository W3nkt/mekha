import { apiRequest } from "./api";
import { db } from "./db";

let syncing = false;
export async function syncToServer() { if (syncing || !navigator.onLine) return; syncing = true; try { const unsynced = await db.syncQueue.filter((item) => item.synced_at === null && !item.requires_review).toArray(); for (const item of unsynced) { try { await apiRequest(`/v1/sync/${item.entity_type}`, { method: "POST", body: JSON.stringify(item.payload) }); await db.syncQueue.update(item.id!, { synced_at: new Date().toISOString() }); } catch (error) { const attempts = item.attempts + 1; await db.syncQueue.update(item.id!, { attempts, last_error: String(error), requires_review: attempts >= 3 }); } } } finally { syncing = false; } }
export const registerSyncListeners = () => { const onOnline = () => void syncToServer(); const onVisibility = () => { if (document.visibilityState === "visible") void syncToServer(); }; window.addEventListener("online", onOnline); document.addEventListener("visibilitychange", onVisibility); return () => { window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVisibility); }; };
