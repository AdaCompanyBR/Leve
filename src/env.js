// Serviço central de contexto ambiental: localização, consulta à Open-Meteo, cache e avisos.
// Todas as telas leem daqui (env.ctx), sem consultar a API por conta própria.
//
// Localização (LGPD): o app usa a localização do aparelho. Pede uma única vez em cada aparelho,
// na primeira abertura depois do cadastro; depois relê a posição sem perguntar (ao abrir, ao
// voltar para o app, no máximo a cada 15 minutos), e só enquanto o navegador mantiver a
// permissão. Nunca dispara um segundo pedido sozinho. Quem negar pode escolher a cidade pelo
// nome. Guardamos só coordenadas arredondadas para 2 casas (cerca de 1 km), nunca o endereço.
// "Remover localização" apaga tudo e para de usar a do aparelho.
import { WEATHER } from './config.js';
import { state, subscribe, saveSettings, recordEnvDay, waterGoalOn } from './store.js';
import { dayRecord } from './lib/envHistory.js';
import { buildContext, alerts, FORECAST_PARAMS, AIR_PARAMS, query } from './lib/environment.js';

const CACHE = 'leve-env';
const WX_TTL = 30 * 60e3, AIR_TTL = 60 * 60e3, GPS_TTL = 15 * 60e3, TICK = 15 * 60e3;
const round = v => Math.round(v * 100) / 100;

export const env = { ctx: null, loading: false, error: null, airError: null, fetchedAt: null, airAt: null };
const listeners = new Set();
export const onEnv = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach(fn => fn(env));

let notify = () => {};
export const setEnvNotifier = fn => { notify = fn; };

export const location = () => state.settings.location ?? null;
const keyOf = loc => `${loc.lat},${loc.lon}`;

const cache = {
  get() { try { return JSON.parse(localStorage.getItem(CACHE)) ?? null; } catch { return null; } },
  set(v) { try { localStorage.setItem(CACHE, JSON.stringify(v)); } catch { /* sem armazenamento: só na memória */ } },
  clear() { try { localStorage.removeItem(CACHE); } catch { /* idem */ } },
};

async function getJSON(url, ms = 9000) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(t); }
}

function rebuild(c) {
  env.ctx = c?.wx ? buildContext({ forecast: c.wx, air: c.air ?? null }) : null;
  env.fetchedAt = c?.wxAt ?? null; env.airAt = c?.airAt ?? null;
}

// ---------------------------------------------------------------------------
// Consulta (com cache e sem pedidos duplicados)

let inflight = null;
export function refresh({ force = false } = {}) {
  const loc = location();
  if (!loc) { env.ctx = null; emit(); return Promise.resolve(); }
  if (inflight) return inflight;
  inflight = (async () => {
    let c = cache.get();
    if (c?.key !== keyOf(loc)) c = { key: keyOf(loc) };
    rebuild(c); emit();
    const now = Date.now();
    const needWx = force || !c.wx || now - (c.wxAt ?? 0) > WX_TTL;
    const needAir = force || now - (c.airAt ?? 0) > AIR_TTL;
    if (!needWx && !needAir) return;
    env.loading = true; emit();
    const base = `latitude=${loc.lat}&longitude=${loc.lon}`;
    const [wx, air] = await Promise.allSettled([
      needWx ? getJSON(`${WEATHER.forecast}?${base}&${query(FORECAST_PARAMS)}`) : Promise.resolve(null),
      needAir ? getJSON(`${WEATHER.air}?${base}&${query(AIR_PARAMS)}`) : Promise.resolve(null),
    ]);
    if (needWx) {
      if (wx.status === 'fulfilled' && wx.value?.hourly) { c.wx = wx.value; c.wxAt = Date.now(); env.error = null; }
      else env.error = navigator.onLine === false ? 'Sem internet. Mostrando a última previsão salva.' : 'A previsão do tempo não respondeu agora.';
    }
    if (needAir) {
      if (air.status === 'fulfilled' && air.value?.current) { c.air = air.value; c.airAt = Date.now(); env.airError = null; }
      else env.airError = 'A qualidade do ar não respondeu agora.';
    }
    cache.set(c);
    rebuild(c);
  })().catch(() => { env.error = 'A previsão do tempo não respondeu agora.'; })
    .finally(() => { env.loading = false; inflight = null; emit(); dispatchAlerts(); record(); });
  return inflight;
}

// Histórico: um resumo por dia do que o app usou, para as análises da aba Progresso.
function record() {
  const ctx = env.ctx;
  if (!ctx || !env.fetchedAt || Date.now() - env.fetchedAt > 3 * 3600e3) return;
  const rec = dayRecord(ctx, { place: placeName(), goal: waterGoalOn(ctx.today), restricted: !!state.settings.fluidRestriction });
  if (rec) recordEnvDay(rec).catch(() => {});
}

// ---------------------------------------------------------------------------
// Alertas no app: uma vez por dia por alerta, só das categorias ligadas.

export const ALERT_CATEGORIES = [
  { id: 'calor', label: 'Calor', hint: 'Temperatura e sensação térmica elevadas, calor prolongado' },
  { id: 'uv', label: 'Sol (índice UV)', hint: 'Índice UV muito alto e os horários de maior intensidade' },
  { id: 'ar', label: 'Qualidade do ar', hint: 'Partículas e ozônio acima do recomendado' },
  { id: 'tempo', label: 'Tempo', hint: 'Tempestade, chuva forte, vento forte e mudança brusca de temperatura' },
];
export const alertOn = cat => (state.settings.envAlerts?.[cat] ?? true);
const SEEN = 'leve-env-avisos';
function dispatchAlerts() {
  const ctx = env.ctx;
  if (!ctx || document.visibilityState !== 'visible') return;
  let seen; try { seen = JSON.parse(localStorage.getItem(SEEN)) ?? []; } catch { seen = []; }
  const today = ctx.today;
  seen = seen.filter(id => id.startsWith(today));
  const fresh = alerts(ctx).filter(a => alertOn(a.category) && !seen.includes(a.id)).slice(0, 2);
  fresh.forEach((a, i) => setTimeout(() => notify(a), i * 4500));
  try { localStorage.setItem(SEEN, JSON.stringify([...seen, ...fresh.map(a => a.id)])); } catch { /* sem armazenamento */ }
}

// ---------------------------------------------------------------------------
// Localização

/** Busca cidades pelo nome (Open-Meteo Geocoding). */
export async function searchPlaces(name) {
  const q = name.trim();
  if (q.length < 2) return [];
  const data = await getJSON(`${WEATHER.geocoding}?name=${encodeURIComponent(q)}&count=8&language=pt&format=json`);
  return (data?.results ?? []).map(r => ({ name: r.name, admin1: r.admin1 ?? '', country: r.country ?? '', countryCode: r.country_code ?? '', lat: round(r.latitude), lon: round(r.longitude), tz: r.timezone ?? null }));
}

export async function setManualLocation(place) {
  await saveSettings({ location: { mode: 'manual', name: place.name, admin1: place.admin1, country: place.country, lat: place.lat, lon: place.lon, tz: place.tz, at: Date.now() } });
  cache.clear();
  return refresh({ force: true });
}

const position = (opts = {}) => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(Object.assign(new Error('sem gps'), { code: 'unsupported' }));
  navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60e3, ...opts });
});
export const GPS_ERRORS = { 1: 'Você não autorizou a localização. Dá para liberar nos ajustes do navegador ou escolher a cidade pelo nome.', 2: 'Não deu para descobrir a sua localização agora.', 3: 'A localização demorou demais. Tente de novo ou escolha a cidade.', unsupported: 'Este navegador não informa a localização. Escolha a cidade pelo nome.' };

// Estado do pedido neste aparelho (a permissão é de cada aparelho, não da conta).
const GEO = 'leve-geo';
const flags = {
  get() { try { return JSON.parse(localStorage.getItem(GEO)) ?? {}; } catch { return {}; } },
  set(v) { try { localStorage.setItem(GEO, JSON.stringify({ ...flags.get(), ...v })); } catch { /* sem armazenamento */ } },
};
/** idle | locating | ok | denied | unsupported | error */
export const geo = { state: 'idle' };
export const isDevice = loc => loc?.mode === 'device' || loc?.mode === 'gps';
export const deviceGranted = () => flags.get().granted === true && geo.state !== 'denied';

async function permission() {
  try { return (await navigator.permissions?.query?.({ name: 'geolocation' }))?.state ?? 'unknown'; } catch { return 'unknown'; }
}

async function applyPosition(p) {
  const lat = round(p.coords.latitude), lon = round(p.coords.longitude);
  const prev = location();
  const moved = !isDevice(prev) || Math.abs(prev.lat - lat) >= 0.05 || Math.abs(prev.lon - lon) >= 0.05;
  await saveSettings({ location: { mode: 'device', name: '', admin1: '', country: '', lat, lon, tz: null, at: Date.now() } });
  if (moved) { cache.clear(); await refresh({ force: true }); }
}

/**
 * Localização do aparelho. Sem `userAsked`: pede só se este aparelho nunca perguntou; se já
 * perguntou, só relê quando a permissão já está dada. Com `userAsked` (botão), pede de novo.
 */
let locating = null;
export function deviceLocate(opts = {}) {
  if (locating && !opts.userAsked) return locating;
  locating = locate(opts).finally(() => { locating = null; });
  return locating;
}
async function locate({ userAsked = false } = {}) {
  if (!navigator.geolocation) { geo.state = 'unsupported'; emit(); if (userAsked) throw Object.assign(new Error('sem gps'), { code: 'unsupported' }); return; }
  const f = flags.get(), perm = await permission();
  if (f.off && !userAsked) return;
  if (perm === 'denied') { flags.set({ asked: true, granted: false }); geo.state = 'denied'; emit(); if (userAsked) throw Object.assign(new Error('negado'), { code: 1 }); return; }
  const silent = perm === 'granted' || (perm === 'unknown' && f.granted);
  if (!silent && !userAsked && f.asked) return;   // já perguntou uma vez neste aparelho
  const loc = location();
  if (silent && !userAsked && isDevice(loc) && Date.now() - (loc.at ?? 0) < GPS_TTL) return;
  flags.set({ asked: true, off: false });
  if (!isDevice(loc) || userAsked) { geo.state = 'locating'; emit(); }
  try {
    const p = await position({ timeout: silent ? 10000 : 30000 });
    flags.set({ granted: true }); geo.state = 'ok';
    await applyPosition(p);
    emit();
  } catch (err) {
    if (err?.code === 1) { flags.set({ granted: false }); geo.state = 'denied'; } else geo.state = isDevice(loc) ? 'ok' : 'error';
    emit();
    if (userAsked) throw err;
  }
}

/** Botão "Usar a localização do aparelho". */
export async function useGps() {
  await deviceLocate({ userAsked: true });
  return location();
}

export async function clearLocation() {
  flags.set({ off: true });   // revoga: não usa mais a do aparelho até a pessoa pedir
  await saveSettings({ location: null });
  cache.clear();
  env.ctx = null; env.error = null; env.airError = null; emit();
}

/** Nome para mostrar. Pela localização do aparelho, "Sua localização". */
export function placeName(loc = location(), ctx = env.ctx) {
  if (!loc) return '';
  if (loc.name) return [loc.name, loc.admin1].filter(Boolean).join(', ');
  return 'Sua localização';
}

// ---------------------------------------------------------------------------
// Ciclo: ao abrir, ao voltar para o app e a cada 15 minutos com ele aberto.

let started = false;
export function startEnv() {
  if (started) return;
  started = true;
  const c = cache.get();
  if (location() && c?.key === keyOf(location())) rebuild(c);
  refresh();
  // O pedido único espera o cadastro terminar (com o app aberto de verdade, não nas telas de entrada).
  let off = null;
  const kick = () => { if (!state.profile) return; off?.(); off = null; deviceLocate(); };
  off = subscribe(kick); kick();
  setInterval(() => { if (document.visibilityState === 'visible') { refresh(); deviceLocate(); } }, TICK);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh(); deviceLocate(); } });
  addEventListener('online', () => refresh());
}
