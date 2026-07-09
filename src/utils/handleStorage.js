const DB_NAME = 'cp-handles';
const STORE_NAME = 'handles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveHandle(key, handle) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ key, handle, savedAt: Date.now() });
    await tx.done;
  } catch {
    // IndexedDB unavailable — silently fail
  }
}

export async function getHandle(key) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const entry = await tx.objectStore(STORE_NAME).get(key);
    await tx.done;
    return entry?.handle || null;
  } catch {
    return null;
  }
}
