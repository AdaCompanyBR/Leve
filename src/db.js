// IndexedDB nativo. Os dados ficam neste aparelho; com conta, também sincronizam com a nuvem.
const NAME = 'leve';
const VERSION = 2;
export const STORES = { kv: 'key', entries: 'id', weights: 'date', foods: 'id', templates: 'id', drinks: 'id' };
// `sync` guarda, por registro, a data da última mudança e se ela ainda precisa subir. Não é dado do usuário.
const INTERNAL = { sync: 'id' };

let dbp;
function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      for (const [name, keyPath] of Object.entries({ ...STORES, ...INTERNAL })) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath });
      }
    };
    req.onsuccess = () => {
      // Outra aba com uma versão nova do app pediu para atualizar o banco: esta fecha e recarrega.
      req.result.onversionchange = () => { req.result.close(); location.reload(); };
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    // Uma aba antiga ainda está com o banco aberto: espera ela fechar (ela recebe onversionchange).
    req.onblocked = () => console.warn('IndexedDB aguardando outra aba do Leve fechar');
  });
  return dbp;
}

// Avisa a sincronização sobre cada mudança feita pelo app. `quiet` desliga o aviso (dados vindos da nuvem).
let listener = null, quiet = 0;
export const onChange = fn => { listener = fn; };
export async function quietly(fn) { quiet++; try { return await fn(); } finally { quiet--; } }
const notify = changes => { if (listener && !quiet && changes.length) listener(changes); };
export const keyOf = (store, value) => value[STORES[store]];

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
export const get = (store, key) => tx(store, 'readonly', s => s.get(key));
export async function put(store, value) {
  const r = await tx(store, 'readwrite', s => s.put(value));
  if (STORES[store]) notify([{ store, key: keyOf(store, value) }]);
  return r;
}
export async function del(store, key) {
  const r = await tx(store, 'readwrite', s => s.delete(key));
  if (STORES[store]) notify([{ store, key, deleted: true }]);
  return r;
}
/** Apaga uma tabela. Com conta, os registros dela viram exclusões na nuvem. */
export async function clear(store) {
  const keys = STORES[store] ? await tx(store, 'readonly', s => s.getAllKeys()) : [];
  await tx(store, 'readwrite', s => s.clear());
  notify(keys.map(key => ({ store, key, deleted: true })));
}
export const clearAll = () => Promise.all(Object.keys(STORES).map(clear));
export async function bulkPut(store, values) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    values.forEach(v => t.objectStore(store).put(v));
    t.oncomplete = resolve;
    t.onerror = t.onabort = () => reject(t.error);
  });
  if (STORES[store]) notify(values.map(v => ({ store, key: keyOf(store, v) })));
}
export async function bulkDel(store, keys) {
  const db = await open();
  await new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readwrite');
    keys.forEach(k => t.objectStore(store).delete(k));
    t.oncomplete = resolve;
    t.onerror = t.onabort = () => reject(t.error);
  });
  if (STORES[store]) notify(keys.map(key => ({ store, key, deleted: true })));
}
