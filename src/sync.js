// Sincronização com a nuvem (tabela `records` no Supabase). Funciona assim:
// - cada mudança feita no app entra numa fila (tabela `sync` do IndexedDB) com a hora da mudança;
// - "subir" manda a fila para a função push_records, que só grava se a mudança for mais nova;
// - "baixar" traz o que mudou na nuvem desde a última vez e aplica o que for mais novo.
// Sem internet, a fila espera. Vale sempre a mudança mais recente de cada registro.
import * as db from './db.js';
import * as auth from './auth.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { SYNCED, rid, shouldApply, enqueue, pushRows } from './lib/syncrules.js';

const CURSOR = 'leve-sync-cursor';
const OVERLAP_MS = 10000; // relê um pouco antes do cursor: aplicar de novo não muda nada

const status = { state: 'idle', last: null, pending: 0, error: null };
const listeners = new Set();
export const onStatus = fn => (listeners.add(fn), () => listeners.delete(fn));
const set = patch => { Object.assign(status, patch); listeners.forEach(fn => fn({ ...status })); };
export const getStatus = () => ({ ...status });

let reload = async () => {};
export const setReloader = fn => { reload = fn; };

let stamps = {};
let tracking = false;

async function loadStamps() {
  stamps = Object.fromEntries((await db.getAll('sync')).map(s => [s.id, s]));
  set({ pending: Object.values(stamps).filter(s => s.dirty).length });
}
async function saveStamps(list) { await db.bulkPut('sync', list); }

// Registra as mudanças locais enquanto houver conta.
db.onChange(async changes => {
  if (!tracking) return;
  const next = enqueue(stamps, changes.filter(c => SYNCED.includes(c.store) && !String(c.key).startsWith('_')), Date.now());
  const changed = Object.values(next).filter(s => s !== stamps[s.id]);
  stamps = next;
  await saveStamps(changed);
  set({ pending: Object.values(stamps).filter(s => s.dirty).length });
  schedule();
});

async function rest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${await auth.accessToken()}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.message || `HTTP ${res.status}`), { status: res.status, code: err.code });
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function push() {
  const dirty = Object.values(stamps).filter(s => s.dirty);
  for (let i = 0; i < dirty.length; i += 200) {
    const batch = dirty.slice(i, i + 200);
    const values = await Promise.all(batch.map(s => (s.deleted ? null : db.get(s.store, s.key))));
    const rows = pushRows(batch, s => values[batch.indexOf(s)]);
    await rest('rpc/push_records', { method: 'POST', body: { rows } });
    const done = [];
    for (const s of batch) {
      const now = stamps[s.id];
      if (now && now.ts === s.ts) { stamps[s.id] = { ...now, dirty: false }; done.push(stamps[s.id]); }
    }
    await saveStamps(done);
  }
}

async function pull() {
  let cursor = null;
  try { cursor = localStorage.getItem(`${CURSOR}:${auth.current()?.user?.id}`); } catch { /* bloqueado */ }
  let applied = 0;
  for (;;) {
    const since = cursor ? new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString() : '1970-01-01T00:00:00Z';
    const rows = await rest(`records?select=store,key,value,deleted,updated_at,synced_at&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc&limit=1000`);
    const fresh = rows.filter(r => SYNCED.includes(r.store) && shouldApply(stamps[rid(r.store, r.key)], r));
    if (fresh.length) {
      await db.quietly(async () => {
        for (const store of SYNCED) {
          const mine = fresh.filter(r => r.store === store);
          const puts = mine.filter(r => !r.deleted && r.value != null).map(r => r.value);
          const dels = mine.filter(r => r.deleted || r.value == null).map(r => r.key);
          if (puts.length) await db.bulkPut(store, puts);
          if (dels.length) await db.bulkDel(store, dels);
        }
      });
      const marks = fresh.map(r => ({ id: rid(r.store, r.key), store: r.store, key: r.key, ts: r.updated_at, dirty: false, deleted: !!r.deleted }));
      marks.forEach(m => { stamps[m.id] = m; });
      await saveStamps(marks);
      applied += fresh.length;
    }
    const last = rows[rows.length - 1]?.synced_at;
    if (last && last !== cursor) { cursor = last; try { localStorage.setItem(`${CURSOR}:${auth.current()?.user?.id}`, cursor); } catch { /* bloqueado */ } }
    if (rows.length < 1000 || !last) break;
  }
  return applied;
}

let running = null, again = false, timer = null;
/** Sincroniza agora (baixa e sobe). Chamadas durante uma sincronização viram uma nova rodada no fim. */
export function syncNow() {
  if (!auth.configured() || !auth.current()) return Promise.resolve();
  if (running) { again = true; return running; }
  running = (async () => {
    set({ state: 'syncing', error: null });
    try {
      if (!navigator.onLine) throw Object.assign(new Error('offline'), { offline: true });
      const applied = await pull();
      await push();
      set({ state: 'idle', last: Date.now(), pending: Object.values(stamps).filter(s => s.dirty).length });
      if (applied) await reload();
    } catch (err) {
      console.warn('sync', err);
      set({ state: 'error', error: err.offline ? 'offline' : err.status === 404 ? 'schema' : err.status === 401 || err.code === 'no_session' ? 'auth' : 'falha' });
    } finally {
      running = null;
      if (again) { again = false; schedule(500); }
    }
  })();
  return running;
}

export function schedule(ms = 2000) {
  clearTimeout(timer);
  timer = setTimeout(syncNow, ms);
}

/**
 * Liga a sincronização para a conta atual. Na primeira vez neste aparelho, o que já existia aqui
 * entra com data antiga: se a nuvem tiver o mesmo registro (perfil, metas), vale o da nuvem;
 * o que só existe aqui sobe.
 */
export async function start() {
  if (!auth.configured() || !auth.current()) return;
  await loadStamps();
  const owner = (() => { try { return localStorage.getItem('leve-sync-owner'); } catch { return null; } })();
  const uid = auth.current().user?.id;
  if (owner !== uid) {
    await db.clear('sync');
    stamps = {};
    const seed = [];
    for (const store of SYNCED) {
      for (const v of await db.getAll(store)) {
        const key = String(db.keyOf(store, v));
        if (key.startsWith('_')) continue;
        seed.push({ id: rid(store, key), store, key, ts: 1, dirty: true, deleted: false });
      }
    }
    seed.forEach(s => { stamps[s.id] = s; });
    await saveStamps(seed);
    try { localStorage.setItem('leve-sync-owner', uid); } catch { /* bloqueado */ }
  }
  tracking = true;
  set({ pending: Object.values(stamps).filter(s => s.dirty).length });
  await syncNow();
}

/** Desliga a sincronização (ao sair da conta). */
export async function stop({ forgetDevice } = {}) {
  tracking = false;
  clearTimeout(timer);
  if (forgetDevice) {
    await db.clear('sync');
    stamps = {};
    try { localStorage.removeItem('leve-sync-owner'); Object.keys(localStorage).filter(k => k.startsWith(CURSOR)).forEach(k => localStorage.removeItem(k)); } catch { /* bloqueado */ }
  }
  set({ state: 'idle', pending: 0, error: null, last: null });
}

addEventListener('online', () => schedule(500));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(300); });
