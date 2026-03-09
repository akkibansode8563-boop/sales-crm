// ============================================================
// Offline DB utility – wraps IndexedDB for offline data queuing
// Usage: import { saveOfflineEntry, getOfflineQueue, clearEntry } from './offlineDB'
// ============================================================

const DB_NAME = 'sales-crm-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'offline-queue';
const DATA_STORE = 'cached-data';

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(QUEUE_STORE))
                db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains(DATA_STORE))
                db.createObjectStore(DATA_STORE, { keyPath: 'key' });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}

/** Save a CRM entry to the offline queue (e.g., a visit or sale record) */
export async function saveOfflineEntry(entry) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        const store = tx.objectStore(QUEUE_STORE);
        const req = store.add({
            ...entry,
            timestamp: Date.now(),
            synced: false,
        });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** Get all pending offline entries */
export async function getOfflineQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readonly');
        const req = tx.objectStore(QUEUE_STORE).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** Remove a synced entry by id */
export async function clearEntry(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(QUEUE_STORE, 'readwrite');
        const req = tx.objectStore(QUEUE_STORE).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/** Cache arbitrary data (e.g., last-loaded dashboard data) */
export async function cacheData(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DATA_STORE, 'readwrite');
        const req = tx.objectStore(DATA_STORE).put({ key, value, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/** Retrieve cached data */
export async function getCachedData(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(DATA_STORE, 'readonly');
        const req = tx.objectStore(DATA_STORE).get(key);
        req.onsuccess = () => resolve(req.result?.value ?? null);
        req.onerror = () => reject(req.error);
    });
}

/** Trigger background sync if supported */
export async function requestBackgroundSync() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-offline-queue');
        console.log('[Offline] Background sync registered');
    } else {
        // Fallback: manually flush when online
        console.log('[Offline] Background Sync not supported – will retry on reconnect');
    }
}

/** Returns true if there are pending unsynced entries */
export async function hasPendingEntries() {
    const queue = await getOfflineQueue();
    return queue.length > 0;
}
