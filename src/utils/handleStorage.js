const DB_NAME = 'cp-handles';
const DB_VERSION = 2;
const STORE_NAME = 'handles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      }

      // v2 migration: create index on projectId for lookup
      if (oldVersion < 2) {
        const tx = event.target.transaction;
        const store = tx.objectStore(STORE_NAME);
        if (!store.indexNames.contains('projectId')) {
          store.createIndex('projectId', 'projectId', { unique: false });
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked. Close other ContextPacker tabs.'));
  });
}

/**
 * Wrap an IDBRequest in a promise.
 */
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wait for a transaction to complete (resolve) or fail (reject).
 */
function waitForTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

/**
 * Save a directory handle for a project.
 * @param {string} projectId - stable UUID for the project
 * @param {FileSystemDirectoryHandle} handle
 */
export async function saveHandle(projectId, handle) {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      key: `local:${projectId}`,
      projectId,
      handle,
      savedAt: Date.now(),
    });
    await waitForTransaction(tx);
    return true;
  } catch (err) {
    console.warn('Failed to save handle to IndexedDB:', err);
    return false;
  } finally {
    db?.close();
  }
}

/**
 * Retrieve a directory handle by project ID.
 * @param {string} projectId
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function getHandle(projectId) {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entry = await promisifyRequest(store.get(`local:${projectId}`));
    await waitForTransaction(tx);
    return entry?.handle || null;
  } catch (err) {
    console.warn('Failed to get handle from IndexedDB:', err);
    return null;
  } finally {
    db?.close();
  }
}

/**
 * List all stored handles with their metadata.
 * @returns {Promise<Array<{key: string, projectId: string, savedAt: number}>>}
 */
export async function listHandles() {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entries = await promisifyRequest(store.getAll());
    await waitForTransaction(tx);
    return entries.map(({ key, projectId, savedAt }) => ({ key, projectId, savedAt }));
  } catch (err) {
    console.warn('Failed to list handles from IndexedDB:', err);
    return [];
  } finally {
    db?.close();
  }
}

/**
 * Delete a stored handle by project ID.
 * @param {string} projectId
 */
export async function deleteHandle(projectId) {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(`local:${projectId}`);
    await waitForTransaction(tx);
    return true;
  } catch (err) {
    console.warn('Failed to delete handle from IndexedDB:', err);
    return false;
  } finally {
    db?.close();
  }
}

/**
 * Check whether a directory handle matches any stored handle via isSameEntry().
 * Returns the existing projectId if found, or null.
 * @param {FileSystemDirectoryHandle} candidate
 * @returns {Promise<string|null>} - existing projectId or null
 */
export async function findMatchingHandle(candidate) {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entries = await promisifyRequest(store.getAll());
    await waitForTransaction(tx);

    for (const entry of entries) {
      if (!entry.handle) continue;
      try {
        if (await candidate.isSameEntry(entry.handle)) {
          return entry.projectId;
        }
      } catch {
        // isSameEntry may fail if handles are from different origins — skip
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to find matching handle:', err);
    return null;
  } finally {
    db?.close();
  }
}

/**
 * Migrate an old-style key (local:<name>) to a new UUID-based key.
 * Attempts to read the old entry, assign a new UUID, and rewrite.
 * @param {string} oldName - the folder name used as the old key
 * @param {string} newProjectId - the new UUID to assign
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function migrateOldHandle(oldName, newProjectId) {
  let db;
  try {
    db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const oldKey = `local:${oldName}`;
    const oldEntry = await promisifyRequest(store.get(oldKey));
    if (!oldEntry) {
      await waitForTransaction(tx);
      return null;
    }
    // Write under new key and delete old
    store.put({
      key: `local:${newProjectId}`,
      projectId: newProjectId,
      handle: oldEntry.handle,
      savedAt: Date.now(),
    });
    store.delete(oldKey);
    await waitForTransaction(tx);
    return oldEntry.handle || null;
  } catch (err) {
    console.warn('Failed to migrate old handle:', err);
    return null;
  } finally {
    db?.close();
  }
}
