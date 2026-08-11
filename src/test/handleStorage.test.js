import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';

// fake-indexeddb uses structured clone, which can't serialize functions.
// We test the storage layer with plain serializable objects rather than
// mock FileSystemDirectoryHandle instances. The actual handle serialization
// is a browser built-in that works with the real FileSystemDirectoryHandle.

import {
  saveHandle,
  getHandle,
  deleteHandle,
  listHandles,
  migrateOldHandle,
} from '../utils/handleStorage';

// A serializable "handle stub" — represents what IndexedDB would store
function stubHandle(name) {
  return { kind: 'directory', name, __stub: true };
}

describe('handleStorage', () => {
  beforeEach(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      for (const db of dbs) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  });

  describe('saveHandle and getHandle', () => {
    it('saves and retrieves a handle by project ID', async () => {
      const handle = stubHandle('my-project');
      await saveHandle('proj-001', handle);

      const retrieved = await getHandle('proj-001');
      expect(retrieved).not.toBeNull();
      expect(retrieved.kind).toBe('directory');
      expect(retrieved.name).toBe('my-project');
    });

    it('returns null for unknown project ID', async () => {
      const retrieved = await getHandle('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('returns null when no handle was saved', async () => {
      const retrieved = await getHandle('ghost-project');
      expect(retrieved).toBeNull();
    });
  });

  describe('UUID-based keys', () => {
    it('uses UUID in the key, not folder name', async () => {
      const handle = stubHandle('src');
      await saveHandle('uuid-123', handle);

      const byUuid = await getHandle('uuid-123');
      expect(byUuid).not.toBeNull();

      // Cannot retrieve by folder name — the key is based on UUID
      const byName = await getHandle('src');
      expect(byName).toBeNull();
    });

    it('two folders with same name get different IDs', async () => {
      const handleA = stubHandle('src');
      const handleB = stubHandle('src');

      await saveHandle('uuid-a', handleA);
      await saveHandle('uuid-b', handleB);

      const retrievedA = await getHandle('uuid-a');
      const retrievedB = await getHandle('uuid-b');

      expect(retrievedA).not.toBeNull();
      expect(retrievedB).not.toBeNull();
    });
  });

  describe('deleteHandle', () => {
    it('removes the handle from storage', async () => {
      await saveHandle('temp-proj', stubHandle('temp'));
      expect(await getHandle('temp-proj')).not.toBeNull();

      await deleteHandle('temp-proj');
      expect(await getHandle('temp-proj')).toBeNull();
    });
  });

  describe('listHandles', () => {
    it('returns all stored handles', async () => {
      await saveHandle('p1', stubHandle('d1'));
      await saveHandle('p2', stubHandle('d2'));

      const list = await listHandles();
      const ids = list.map((e) => e.projectId);
      expect(ids).toContain('p1');
      expect(ids).toContain('p2');
    });

    it('returns empty list when no handles', async () => {
      const list = await listHandles();
      expect(list).toEqual([]);
    });
  });

  describe('migrateOldHandle', () => {
    it('migrates an old name-based key to a UUID-based key', async () => {
      // Direct write to simulate old data format
      const req = indexedDB.open('cp-handles', 2);
      const db = await new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onupgradeneeded = (event) => {
          const d = event.target.result;
          if (!d.objectStoreNames.contains('handles')) {
            const store = d.createObjectStore('handles', { keyPath: 'key' });
            if (!store.indexNames.contains('projectId')) {
              store.createIndex('projectId', 'projectId', { unique: false });
            }
          }
        };
      });

      const oldHandle = stubHandle('old-folder');
      const tx = db.transaction('handles', 'readwrite');
      const store = tx.objectStore('handles');
      await new Promise((resolve, reject) => {
        const putReq = store.put({ key: 'local:old-folder', handle: oldHandle, savedAt: Date.now() });
        putReq.onsuccess = resolve;
        putReq.onerror = reject;
      });
      await new Promise((resolve) => { tx.oncomplete = resolve; });
      db.close();

      // Now migrate
      const migrated = await migrateOldHandle('old-folder', 'new-uuid');
      expect(migrated).not.toBeNull();
      expect(migrated.name).toBe('old-folder');

      // Old key should be gone
      const byOldName = await getHandle('old-folder');
      expect(byOldName).toBeNull();

      // New key should work
      const byNew = await getHandle('new-uuid');
      expect(byNew).not.toBeNull();
    });
  });
});
