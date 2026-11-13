// Compartilhamento de líquidos entre amigos, pelo Supabase (tabelas em supabase/sharing.sql).
// O que sai deste aparelho é só o resumo do dia: nome, figura, total em ml, meta e se aceita
// cutucadas. As bebidas, os horários e o diário de comida nunca saem.
import * as auth from './auth.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { state, subscribe, liquidsOn, waterGoalOn, bodyStyle } from './store.js';
import { todayISO } from './lib/dates.js';

export const available = () => auth.configured();
export const signedIn = () => auth.configured() && !!auth.current();
const meId = () => auth.current()?.user?.id;
const myName = () => (state.profile?.name || auth.userEmail()?.split('@')[0] || 'Amigo').slice(0, 40);

/** Estado em memória, para as telas desenharem na hora e atualizarem quando chegar resposta. */
export const share = { loaded: false, loading: false, missing: false, error: null, friends: [], sharingWith: [], me: null };
const listeners = new Set();
export const onShare = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach(fn => fn(share));

let notify = () => {};
/** Quem mostra os avisos (cutucadas, aplausos, amigo que bateu a meta). */
export const setNotifier = fn => { notify = fn; };

export class ShareError extends Error {}
const MESSAGES = [
  [/limite de 3/, 'Você já mandou 3 hoje para essa pessoa. Amanhã libera de novo.'],
  [/cutucadas desligadas/, 'Essa pessoa desligou as cutucadas e os aplausos.'],
  [/sem compartilhamento/, 'Essa pessoa não compartilha mais o progresso com você.'],
  [/inválido ou vencido/, 'Este convite venceu ou não existe mais. Peça um link novo.'],
  [/convite é seu/, 'Este convite é seu. Envie o link para outra pessoa.'],
];

async function rest(path, { method = 'GET', body, prefer } = {}) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${await auth.accessToken()}`, 'content-type': 'application/json', ...(prefer ? { prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new ShareError('Sem conexão. Tente de novo quando estiver online.'); }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw = `${err.message ?? ''} ${err.details ?? ''}`;
    // Tabela ou função que não existe: o SQL do compartilhamento ainda não foi rodado.
    if (res.status === 404 || ['42P01', '42883', 'PGRST202', 'PGRST205'].includes(err.code)) { share.missing = true; throw new ShareError('O compartilhamento ainda não foi ativado no servidor.'); }
    const known = MESSAGES.find(([re]) => re.test(raw));
    throw new ShareError(known ? known[1] : 'Não deu certo agora. Tente de novo em instantes.');
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

// ---------------------------------------------------------------------------
// Publicar o meu resumo do dia (só quando ele muda).

let lastPublished = '', publishTimer = null;
function snapshot() {
  const today = todayISO();
  return { user_id: meId(), name: myName(), body: bodyStyle(), day: today, ml: Math.min(20000, Math.round(liquidsOn(today).total)),
    goal: Math.round(waterGoalOn(today)), allow_pokes: state.settings.allowPokes !== false };
}
export async function publish(force = false) {
  if (!signedIn() || !state.profile || share.missing) return;
  const snap = snapshot(), key = JSON.stringify(snap);
  if (!force && key === lastPublished) return;
  await rest('share_status?on_conflict=user_id', { method: 'POST', body: { ...snap, updated_at: new Date().toISOString() }, prefer: 'resolution=merge-duplicates,return=minimal' });
  lastPublished = key;
}
const schedulePublish = () => { clearTimeout(publishTimer); publishTimer = setTimeout(() => publish().catch(() => {}), 1500); };

// ---------------------------------------------------------------------------
// Ler amigos, quem me vê e os avisos.

const seenKey = (id, day) => `leve-meta-${id}-${day}`;
const flag = { get: k => { try { return localStorage.getItem(k); } catch { return '1'; } }, set: k => { try { localStorage.setItem(k, '1'); } catch { /* sem armazenamento */ } } };

export async function refresh() {
  if (!signedIn()) return;
  share.loading = true; emit();
  try {
    const [links, statuses, pokes] = await Promise.all([
      rest('share_links?select=owner,viewer,owner_name,viewer_name,created_at&order=created_at'),
      rest('share_status?select=user_id,name,body,day,ml,goal,allow_pokes'),
      rest('share_pokes?select=id,from_name,kind,created_at&seen=eq.false&order=created_at'),
    ]);
    const me = meId(), today = todayISO();
    const byId = Object.fromEntries((statuses ?? []).map(s => [s.user_id, s]));
    share.friends = links.filter(l => l.viewer === me).map(l => {
      const s = byId[l.owner];
      const fresh = s && s.day === today;
      return { id: l.owner, name: s?.name || l.owner_name || 'Amigo', body: s?.body ?? 'f', ml: fresh ? s.ml : 0, goal: s?.goal ?? 2000, allowPokes: s?.allow_pokes !== false, fresh: !!fresh };
    });
    share.sharingWith = links.filter(l => l.owner === me).map(l => ({ id: l.viewer, name: l.viewer_name || 'Amigo' }));
    share.loaded = true; share.error = null; share.missing = false;
    // Amigo que bateu a meta hoje: um aviso por amigo por dia.
    if (state.settings.shareNotify !== false) {
      for (const f of share.friends) {
        if (f.fresh && f.ml >= f.goal && !flag.get(seenKey(f.id, today))) { flag.set(seenKey(f.id, today)); notify(`${f.name} bateu a meta de líquidos de hoje`); }
      }
    }
    if (pokes?.length) {
      for (const p of pokes) notify(p.kind === 'aplauso' ? `${p.from_name || 'Um amigo'} aplaudiu você pela meta de hoje` : `${p.from_name || 'Um amigo'} te cutucou: que tal um copo d'água?`);
      await rest(`share_pokes?id=in.(${pokes.map(p => p.id).join(',')})`, { method: 'PATCH', body: { seen: true }, prefer: 'return=minimal' }).catch(() => {});
    }
  } catch (err) {
    share.error = err.message;
  } finally {
    share.loading = false; emit();
  }
}

// ---------------------------------------------------------------------------
// Convites, aceite, encerrar e cutucar.

function randomCode(n = 12) {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map(b => abc[b % abc.length]).join('');
}
export async function createInvite() {
  const code = randomCode();
  await rest('share_invites', { method: 'POST', body: { code, owner_name: myName() }, prefer: 'return=minimal' });
  await publish(true).catch(() => {});
  return `${location.origin}${location.pathname}#convite=${code}`;
}
export async function inviteInfo(code) {
  const rows = await rest('rpc/invite_info', { method: 'POST', body: { invite: code } });
  return rows?.[0] ?? null;
}
export async function acceptInvite(code, back) {
  const name = await rest('rpc/accept_invite', { method: 'POST', body: { invite: code, my_name: myName(), back } });
  await publish(true).catch(() => {});
  await refresh();
  return name;
}
export async function stopSharing(owner, viewer) {
  await rest(`share_links?owner=eq.${owner}&viewer=eq.${viewer}`, { method: 'DELETE', prefer: 'return=minimal' });
  await refresh();
}
export const stopSharingWith = viewer => stopSharing(meId(), viewer);
export const stopSeeing = owner => stopSharing(owner, meId());
export async function poke(target, kind) {
  await rest('rpc/send_poke', { method: 'POST', body: { target, poke_kind: kind, my_name: myName() } });
}

// ---------------------------------------------------------------------------
// Ciclo: começa com a sessão, publica quando os líquidos mudam e lê a cada minuto com o app aberto.

let running = false, timer = null, unsub = null;
const tick = () => { if (document.visibilityState === 'visible') { publish().catch(() => {}); refresh(); } };
export function start() {
  if (!signedIn() || running) return;
  running = true;
  unsub = subscribe(schedulePublish);
  timer = setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', tick);
  tick();
}
export function stop() {
  running = false; clearInterval(timer); clearTimeout(publishTimer); unsub?.(); unsub = null;
  document.removeEventListener('visibilitychange', tick);
  Object.assign(share, { loaded: false, loading: false, missing: false, error: null, friends: [], sharingWith: [] });
  lastPublished = ''; emit();
}
