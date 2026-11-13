// Serviço central de contexto ambiental: localização, consulta à Open-Meteo, cache e avisos.
// Todas as telas leem daqui (env.ctx), sem consultar a API por conta própria.
//
// Localização (LGPD): guardamos só o necessário para a previsão: nome da cidade, estado, país,
// fuso e coordenadas arredondadas para 2 casas (cerca de 1 km), em settings.location. Nada de
// endereço. O GPS só é pedido quando a pessoa toca em "Usar minha localização"; depois, só é
// relido sem perguntar se o navegador já tiver a permissão. "Remover localização" apaga tudo.
import { WEATHER } from './config.js';
import { state, saveSettings, recordEnvDay, waterGoalOn } from './store.js';
import { dayRecord } from './lib/envHistory.js';
import { buildContext, alerts, FORECAST_PARAMS, AIR_PARAMS, query } from './lib/environment.js';

const CACHE = 'leve-env';
const WX_TTL = 30 * 60e3, AIR_TTL = 60 * 60e3, GPS_TTL = 6 * 3600e3, TICK = 15 * 60e3;
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

/** GPS por pedido da pessoa. Devolve a localização salva. */
export async function useGps() {
  const p = await position();
  const lat = round(p.coords.latitude), lon = round(p.coords.longitude);
  const prev = location();
  // A Open-Meteo não traduz coordenadas em cidade; a cidade fica como estava se for perto.
  const near = prev && Math.abs(prev.lat - lat) < 0.15 && Math.abs(prev.lon - lon) < 0.15;
  await saveSettings({ location: { mode: 'gps', name: near ? prev.name : '', admin1: near ? prev.admin1 : '', country: near ? prev.country : '', lat, lon, tz: null, at: Date.now() } });
  cache.clear();
  await refresh({ force: true });
  return location();
}

/** Com modo GPS e permissão já dada, relê a posição de tempos em tempos, sem perguntar. */
async function quietGps() {
  const loc = location();
  if (loc?.mode !== 'gps' || Date.now() - (loc.at ?? 0) < GPS_TTL) return;
  try {
    const st = await navigator.permissions?.query?.({ name: 'geolocation' });
    if (st?.state !== 'granted') return;
    const p = await position({ timeout: 8000 });
    const lat = round(p.coords.latitude), lon = round(p.coords.longitude);
    const moved = Math.abs(loc.lat - lat) >= 0.05 || Math.abs(loc.lon - lon) >= 0.05;
    await saveSettings({ location: { ...loc, lat, lon, at: Date.now(), ...(moved ? { name: '', admin1: '', country: '', tz: null } : {}) } });
    if (moved) { cache.clear(); await refresh({ force: true }); }
  } catch { /* sem permissão ou sem sinal: fica a última posição */ }
}

export async function clearLocation() {
  await saveSettings({ location: null });
  cache.clear();
  env.ctx = null; env.error = null; env.airError = null; emit();
}

/** Nome para mostrar. Sem cidade (GPS), "Sua localização" e o fuso. */
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
  quietGps();
  setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, TICK);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh(); quietGps(); } });
  addEventListener('online', () => refresh());
}
