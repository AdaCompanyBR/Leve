// IndexedDB nativo. Tudo fica neste aparelho.
const NAME = 'leve';
const VERSION = 1;
export const STORES = { kv: 'key', entries: 'id', weights: 'date', foods: 'id', templates: 'id' };

let dbp;
function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      for (const [name, keyPath] of Object.entries(STORES)) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = t.onabort = () => reject(t.error);
  });
}

export const getAll = store => tx(store, 'readonly', s => s.getAll());
export const put = (store, value) => tx(store, 'readwrite', s => s.put(value));
export const del = (store, key) => tx(store, 'readwrite', s => s.delete(key));
export const clear = store => tx(store, 'readwrite', s => s.clear());
export const clearAll = () => Promise.all(Object.keys(STORES).map(clear));
export async function bulkPut(store, values) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    values.forEach(v => t.objectStore(store).put(v));
    t.oncomplete = resolve;
    t.onerror = t.onabort = () => reject(t.error);
  });
}
