// Conta no Supabase (e-mail e senha), falando direto com a API REST do Supabase Auth.
// A sessão fica neste aparelho. Com Face ID ligado, ela fica cifrada e só abre com o rosto ou a digital
// (veja biometric.js).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { authMessage } from './lib/syncrules.js';

export const configured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const PLAIN = 'leve-session';

let session = null;           // { access_token, refresh_token, expires_at, user: { id, email } }
let sealer = null;            // função que cifra a sessão quando o Face ID está ligado
const listeners = new Set();
export const onAuth = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach(fn => fn(session));

export class AuthError extends Error {
  constructor(raw) { super(authMessage(raw)); this.raw = raw; this.code = raw?.code ?? raw?.error_code ?? raw?.error; }
}

const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* armazenamento bloqueado */ } },
  del: k => { try { localStorage.removeItem(k); } catch { /* armazenamento bloqueado */ } },
};

async function call(path, { method = 'POST', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method, headers: { apikey: SUPABASE_ANON_KEY, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new AuthError({ code: 'network' }); }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new AuthError(data);
  return data;
}

function adopt(data) {
  if (!data?.access_token) return null;
  session = {
    access_token: data.access_token, refresh_token: data.refresh_token,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: { id: data.user?.id ?? session?.user?.id, email: data.user?.email ?? session?.user?.email },
  };
  persist();
  emit();
  return session;
}

function persist() {
  if (!session) return;
  if (sealer) { sealer(session); store.del(PLAIN); } else store.set(PLAIN, JSON.stringify(session));
}

/** Sessão salva sem cifra (sem Face ID). */
export function restorePlain() {
  try { session = JSON.parse(store.get(PLAIN)); } catch { session = null; }
  return session;
}
/** Sessão aberta pelo Face ID. `seal` é chamado sempre que a sessão mudar (renovação do token). */
export function restoreUnlocked(s, seal) { session = s; sealer = seal; emit(); return session; }
export function setSealer(seal) { sealer = seal; persist(); if (!seal && session) store.set(PLAIN, JSON.stringify(session)); }

export const current = () => session;
export const userEmail = () => session?.user?.email ?? null;

export async function signIn(email, password) {
  return adopt(await call('token?grant_type=password', { body: { email: email.trim(), password } }));
}

/** Cria a conta. Se o projeto pedir confirmação por e-mail, volta sem sessão: `{ confirm: true }`. */
export async function signUp(email, password) {
  const redirect = location.origin + location.pathname;
  const data = await call(`signup?redirect_to=${encodeURIComponent(redirect)}`, { body: { email: email.trim(), password } });
  return adopt(data) ?? { confirm: true };
}

export async function recover(email) {
  const redirect = location.origin + location.pathname;
  await call(`recover?redirect_to=${encodeURIComponent(redirect)}`, { body: { email: email.trim() } });
}

export async function setPassword(password) {
  await call('user', { method: 'PUT', body: { password }, token: await accessToken() });
}

let refreshing = null;
/** Token válido para chamar a API, renovando quando falta pouco para vencer. */
export async function accessToken() {
  if (!session) throw new AuthError({ code: 'no_session' });
  if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
  refreshing ??= call('token?grant_type=refresh_token', { body: { refresh_token: session.refresh_token } })
    .then(adopt)
    .catch(err => { if (err.code !== 'network') forget(); throw err; })
    .finally(() => { refreshing = null; });
  return (await refreshing).access_token;
}

/** Links do e-mail (confirmação e troca de senha) voltam com a sessão no endereço. */
export function fromRedirect() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.get('access_token')) return null;
  const type = p.get('type');
  history.replaceState(null, '', location.pathname + location.search);
  const s = adopt({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in')) || 3600 });
  return s ? { type } : null;
}

export async function loadUser() {
  if (!session || session.user?.email) return;
  const u = await call('user', { method: 'GET', token: await accessToken() }).catch(() => null);
  if (u?.email) { session.user = { id: u.id, email: u.email }; persist(); emit(); }
}

/** Esquece a sessão neste aparelho. */
export function forget() {
  session = null; sealer = null;
  store.del(PLAIN);
  emit();
}

export async function signOut() {
  const token = session?.access_token;
  forget();
  if (token) await call('logout', { token }).catch(() => {});
}
