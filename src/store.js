// Estado em memória com gravação imediata no IndexedDB.
import * as db from './db.js';
import { plan as calcPlan } from './lib/calc.js';
import { trendSeries } from './lib/trend.js';
import { weekBudget } from './lib/budget.js';
import { estimateTdee, shouldPropose } from './lib/adaptive.js';
import { addDays, todayISO } from './lib/dates.js';
import { makeIndex } from './lib/search.js';

export const MEALS = [
  { id: 'cafe', label: 'Café da manhã' },
  { id: 'almoco', label: 'Almoço' },
  { id: 'jantar', label: 'Jantar' },
  { id: 'lanches', label: 'Lanches' },
];

const DEFAULT_SETTINGS = { theme: 'auto', weightReminder: true, waterGoal: 2000 };

export const state = {
  ready: false, profile: null, settings: { ...DEFAULT_SETTINGS }, entries: [], weights: [], foods: [], templates: [],
  favorites: [], water: {}, adaptive: { declinedTdee: null }, taco: [], index: [],
};

const listeners = new Set();
export const subscribe = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach(fn => fn());
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const kv = (key, value) => db.put('kv', { key, value });
const reindex = () => { state.index = makeIndex([...state.foods.filter(f => !f.hidden), ...state.taco]); };

export async function load() {
  const [kvs, entries, weights, foods, templates, taco] = await Promise.all([
    db.getAll('kv'), db.getAll('entries'), db.getAll('weights'), db.getAll('foods'), db.getAll('templates'),
    fetch('./data/taco.json').then(r => { if (!r.ok) throw new Error('taco'); return r.json(); }),
  ]);
  const map = Object.fromEntries(kvs.map(r => [r.key, r.value]));
  Object.assign(state, {
    ready: true, profile: map.profile ?? null, settings: { ...DEFAULT_SETTINGS, ...map.settings }, entries, weights, foods, templates,
    favorites: map.favorites ?? [], water: map.water ?? {}, adaptive: map.adaptive ?? { declinedTdee: null }, taco,
  });
  reindex();
}

// ---------- Consultas ----------
export const foodById = id => state.taco.find(f => f.id === id) ?? state.foods.find(f => f.id === id) ?? null;
export const latestWeight = () => {
  const s = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  return s.length ? s[s.length - 1].kg : state.profile?.weightKg;
};
export const series = () => trendSeries(state.weights);
export function getPlan() {
  if (!state.profile) return null;
  return calcPlan({ ...state.profile, weightKg: latestWeight() }, todayISO());
}
export const dayEntries = date => state.entries.filter(e => e.date === date).sort((a, b) => a.ts - b.ts);
export function totals(entries) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const e of entries) { t.kcal += e.kcal; t.p += e.p; t.c += e.c; t.f += e.f; }
  return t;
}
export function intakeByDate() {
  const out = {};
  for (const e of state.entries) out[e.date] = (out[e.date] ?? 0) + e.kcal;
  return out;
}
export function budgetFor(date) {
  const p = getPlan();
  if (!p?.target) return null;
  return weekBudget({ dailyTarget: p.target, floor: p.floor, today: date, intakeByDate: intakeByDate() });
}
export function adaptiveStatus() {
  const p = getPlan();
  if (!p || p.mode === 'menor') return null;
  const estimate = estimateTdee({ series: series(), intakeByDate: intakeByDate(), today: todayISO() });
  const propose = shouldPropose(estimate, p.tdee) && state.adaptive.declinedTdee !== estimate.tdee;
  const loggedDays = Object.keys(intakeByDate()).length;
  return { estimate, propose, loggedDays, weighIns: state.weights.length, plan: p };
}
export function recents(limit = 12) {
  const seen = new Set(), out = [];
  for (const e of [...state.entries].sort((a, b) => b.ts - a.ts)) {
    if (!e.foodId || seen.has(e.foodId)) continue;
    const food = foodById(e.foodId);
    if (!food) continue;
    seen.add(e.foodId);
    out.push({ food, last: e });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- Mudanças ----------
export async function saveProfile(patch) {
  const first = !state.profile;
  state.profile = { ...state.profile, ...patch };
  await kv('profile', state.profile);
  if (first && state.profile.weightKg) await setWeight(todayISO(), state.profile.weightKg, true);
  emit();
}
export async function saveSettings(patch) { state.settings = { ...state.settings, ...patch }; await kv('settings', state.settings); emit(); }
export async function addEntries(items) {
  const now = Date.now();
  const rows = items.map((it, i) => ({ ...it, id: uid(), ts: now + i }));
  state.entries.push(...rows);
  await db.bulkPut('entries', rows);
  emit();
  return rows;
}
export async function updateEntry(id, patch) {
  const e = state.entries.find(x => x.id === id);
  if (!e) return;
  Object.assign(e, patch);
  await db.put('entries', e);
  emit();
}
export async function removeEntry(id) {
  state.entries = state.entries.filter(e => e.id !== id);
  await db.del('entries', id);
  emit();
}
export async function copyPreviousDay(date) {
  const prev = dayEntries(addDays(date, -1));
  if (!prev.length) return 0;
  await addEntries(prev.map(({ id, ts, ...rest }) => ({ ...rest, date })));
  return prev.length;
}
export async function setWeight(date, kg, silent) {
  const row = { date, kg };
  state.weights = [...state.weights.filter(w => w.date !== date), row];
  await db.put('weights', row);
  if (!silent) emit();
}
export async function removeWeight(date) { state.weights = state.weights.filter(w => w.date !== date); await db.del('weights', date); emit(); }
export async function addWater(date, ml) {
  state.water = { ...state.water, [date]: Math.max(0, (state.water[date] ?? 0) + ml) };
  await kv('water', state.water);
  emit();
}
export async function toggleFavorite(foodId) {
  state.favorites = state.favorites.includes(foodId) ? state.favorites.filter(f => f !== foodId) : [foodId, ...state.favorites];
  await kv('favorites', state.favorites);
  emit();
}
export async function saveFood(food) {
  const row = { ...food, id: food.id ?? 'c' + uid() };
  state.foods = [...state.foods.filter(f => f.id !== row.id), row];
  await db.put('foods', row);
  reindex();
  emit();
  return row;
}
export async function saveTemplate(name, entries) {
  const row = { id: uid(), name, items: entries.map(({ id, ts, date, meal, ...rest }) => rest) };
  state.templates.push(row);
  await db.put('templates', row);
  emit();
}
export async function removeTemplate(id) { state.templates = state.templates.filter(t => t.id !== id); await db.del('templates', id); emit(); }
export async function acceptTdee(tdee) { await saveProfile({ tdeeOverride: tdee }); }
export async function declineTdee(tdee) { state.adaptive = { declinedTdee: tdee }; await kv('adaptive', state.adaptive); emit(); }

// ---------- Exportar, importar, apagar ----------
export function exportData() {
  const { profile, settings, entries, weights, foods, templates, favorites, water, adaptive } = state;
  return { app: 'leve', version: 1, exportedAt: new Date().toISOString(), profile, settings, entries, weights, foods, templates, favorites, water, adaptive };
}
export async function importData(data) {
  if (data?.app !== 'leve' || !Array.isArray(data.entries) || !Array.isArray(data.weights)) throw new Error('Arquivo não reconhecido');
  await db.clearAll();
  await Promise.all([
    db.bulkPut('entries', data.entries), db.bulkPut('weights', data.weights), db.bulkPut('foods', data.foods ?? []),
    db.bulkPut('templates', data.templates ?? []),
    db.bulkPut('kv', ['profile', 'settings', 'favorites', 'water', 'adaptive'].filter(k => data[k] != null).map(key => ({ key, value: data[key] }))),
  ]);
  await load();
  emit();
}
export async function wipe() {
  await db.clearAll();
  await load();
  emit();
}
