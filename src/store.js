// Estado em memória com gravação imediata no IndexedDB.
import * as db from './db.js';
import { plan as calcPlan } from './lib/calc.js';
import { trendSeries } from './lib/trend.js';
import { weekBudget } from './lib/budget.js';
import { estimateTdee, shouldPropose } from './lib/adaptive.js';
import { addDays, todayISO } from './lib/dates.js';
import { makeIndex } from './lib/search.js';
import { dayTotal, goalOn, withGoal, DEFAULT_PRESETS } from './lib/hydration.js';
import { setUnitPrefs } from './lib/units.js';
import { buildRecipeFoods } from './lib/recipes.js';
import { registerServings } from './lib/portions.js';
import { buildRoutine, dayStatus } from './lib/routine.js';

export const MEALS = [
  { id: 'cafe', label: 'Café da manhã' },
  { id: 'almoco', label: 'Almoço' },
  { id: 'jantar', label: 'Jantar' },
  { id: 'lanches', label: 'Lanches' },
];

const DEFAULT_SETTINGS = { theme: 'auto', weightReminder: true, waterGoal: 2000, showSwaps: true };

export const state = {
  ready: false, profile: null, settings: { ...DEFAULT_SETTINGS }, entries: [], weights: [], foods: [], templates: [],
  favorites: [], water: {}, drinks: [], routine: {}, goalLog: [], presets: null, activities: [], envHistory: {}, avatar: null, myChallenges: [], checkins: {}, achievements: {}, adaptive: { declinedTdee: null }, taco: [], recipes: [], index: [],
};

const listeners = new Set();
export const subscribe = fn => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach(fn => fn());
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const kv = (key, value) => db.put('kv', { key, value });
const reindex = () => { state.index = makeIndex([...state.foods.filter(f => !f.hidden), ...state.taco, ...state.recipes]); };

export async function load() {
  const [kvs, entries, weights, foods, templates, drinks, taco] = await Promise.all([
    db.getAll('kv'), db.getAll('entries'), db.getAll('weights'), db.getAll('foods'), db.getAll('templates'), db.getAll('drinks'),
    fetch('./data/taco.json').then(r => { if (!r.ok) throw new Error('taco'); return r.json(); }),
  ]);
  const map = Object.fromEntries(kvs.map(r => [r.key, r.value]));
  // Versões antigas guardavam as bebidas numa lista só; agora cada uma é um registro.
  if (Array.isArray(map.drinks)) {
    await db.bulkPut('drinks', map.drinks);
    await db.del('kv', 'drinks');
    drinks.push(...map.drinks.filter(d => !drinks.some(x => x.id === d.id)));
  }
  Object.assign(state, {
    ready: true, profile: map.profile ?? null, settings: { ...DEFAULT_SETTINGS, ...map.settings }, entries, weights, foods, templates,
    favorites: map.favorites ?? [], water: map.water ?? {}, drinks, routine: map.routine ?? {}, goalLog: map.goalLog ?? [], presets: map.presets ?? null, activities: map.activities ?? [], envHistory: map.envHistory ?? {}, avatar: map.avatar ?? null, myChallenges: map.challenges ?? [], checkins: map.checkins ?? {}, achievements: map.achievements ?? {}, adaptive: map.adaptive ?? { declinedTdee: null }, taco,
  });
  setUnitPrefs(state.settings.units);
  state.recipes = buildRecipeFoods(taco);
  registerServings([...state.recipes, ...state.foods]);
  reindex();
}

// ---------- Consultas ----------
export const foodById = id => state.taco.find(f => f.id === id) ?? state.recipes.find(f => f.id === id) ?? state.foods.find(f => f.id === id) ?? null;
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
  // O saldo da semana dilui excessos: só faz sentido em objetivos com déficit.
  if (!p?.target || !['deficit', 'recomposicao'].includes(p.mode)) return null;
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
export async function saveSettings(patch) { state.settings = { ...state.settings, ...patch }; setUnitPrefs(state.settings.units); await kv('settings', state.settings); emit(); }
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
// Líquidos: cada bebida é um item; `water` guarda o total antigo por dia, de antes da aba Líquidos.
export const liquidsOn = date => dayTotal(state.drinks, state.water, date);
/** Meta de líquidos de um dia (a meta muda daqui para a frente, os dias anteriores ficam como estavam). */
export const waterGoalOn = date => goalOn(state.goalLog, state.settings.waterGoal, date);
export async function setWaterGoal(goal) {
  goal = Math.round(goal);
  if (goal === state.settings.waterGoal && state.goalLog.length) return;
  state.goalLog = withGoal(state.goalLog, state.settings.waterGoal, goal, todayISO());
  await kv('goalLog', state.goalLog);
  await saveSettings({ waterGoal: goal });
}
/** Bebidas pré-definidas (tipo e quantidade) que aparecem no + da aba Líquidos. */
export const drinkPresets = () => state.presets ?? DEFAULT_PRESETS;
export async function savePreset(preset) {
  const list = [...drinkPresets()];
  const row = { id: preset.id ?? 'p-' + uid(), type: preset.type, ml: Math.round(preset.ml), ...(preset.name ? { name: preset.name } : {}) };
  const i = list.findIndex(p => p.id === row.id);
  if (i >= 0) list[i] = row; else list.push(row);
  state.presets = list; await kv('presets', list); emit();
  return row;
}
export async function removePreset(id) { state.presets = drinkPresets().filter(p => p.id !== id); await kv('presets', state.presets); emit(); }
export async function restorePresets(list) { state.presets = list; await kv('presets', list); emit(); }
// Atividades físicas (planejadas ou feitas): uma lista em kv 'activities', sincronizada com a conta.
export const activitiesOn = date => state.activities.filter(a => a.date === date).sort((a, b) => a.start.localeCompare(b.start));
export async function saveActivity(a) {
  const row = { ...a, id: a.id ?? 'a-' + uid(), updatedAt: Date.now() };
  state.activities = [...state.activities.filter(x => x.id !== row.id), row];
  await kv('activities', state.activities); emit();
  return row;
}
export async function removeActivity(id) { state.activities = state.activities.filter(x => x.id !== id); await kv('activities', state.activities); emit(); }
export async function restoreActivity(a) { state.activities = [...state.activities.filter(x => x.id !== a.id), a]; await kv('activities', state.activities); emit(); }

// Histórico do clima: um resumo por dia (o último do dia vale), guardado por até 400 dias.
export async function recordEnvDay(rec) {
  const prev = state.envHistory[rec.date];
  if (prev && JSON.stringify(prev) === JSON.stringify(rec)) return;
  const all = { ...state.envHistory, [rec.date]: rec };
  const keep = Object.keys(all).sort().slice(-400);
  state.envHistory = Object.fromEntries(keep.map(k => [k, all[k]]));
  await kv('envHistory', state.envHistory);   // sem emit: não precisa redesenhar a tela
}

// Desafios da pessoa (kv 'challenges'), registros rápidos do que o app não mede (kv 'checkins',
// por data) e conquistas desbloqueadas (kv 'achievements', id -> data). O progresso não é
// guardado: é recalculado dos registros originais; ao concluir ou encerrar, guarda-se um resumo.
const saveChallenges = async () => { await kv('challenges', state.myChallenges); emit(); };
export async function startChallenge({ challengeId, target, startDate, expectedEnd }) {
  const uc = { id: 'uc-' + uid(), challengeId, target, startDate, expectedEnd, status: 'ativo', pauses: [], createdAt: Date.now() };
  state.myChallenges = [...state.myChallenges, uc];
  await saveChallenges();
  return uc;
}
export async function updateChallenge(id, patch) {
  state.myChallenges = state.myChallenges.map(c => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
  await saveChallenges();
}
export async function saveCheckin(date, patch) {
  state.checkins = { ...state.checkins, [date]: { ...(state.checkins[date] ?? {}), ...patch } };
  await kv('checkins', state.checkins); emit();
}
export async function unlockAchievements(ids, date) {
  const add = ids.filter(id => !state.achievements[id]);
  if (!add.length) return [];
  state.achievements = { ...state.achievements, ...Object.fromEntries(add.map(id => [id, date])) };
  await kv('achievements', state.achievements); emit();
  return add;
}

/** Foto de perfil: imagem pequena (data URL), guardada em kv 'avatar' e sincronizada com a conta. */
export async function saveAvatar(dataUrl) { state.avatar = dataUrl || null; await kv('avatar', state.avatar); emit(); }

/** Corpo da aba Líquidos: escolha em Ajustes, ou o sexo do cadastro. */
export const bodyStyle = () => state.settings.body ?? (state.profile?.sex === 'm' ? 'm' : 'f');
export const dayDrinks = date => state.drinks.filter(d => d.date === date).sort((a, b) => a.ts - b.ts);
export async function addDrink(date, type, ml, extra = {}) {
  const row = { id: uid(), date, type, ml: Math.round(ml), ts: Date.now(), ...extra };
  state.drinks = [...state.drinks, row];
  await db.put('drinks', row);
  emit();
  return row;
}
export async function updateDrink(id, patch) {
  state.drinks = state.drinks.map(d => (d.id === id ? { ...d, ...patch } : d));
  const row = state.drinks.find(d => d.id === id);
  if (row) await db.put('drinks', JSON.parse(JSON.stringify(row)));
  emit();
}
export async function removeDrink(id) {
  state.drinks = state.drinks.filter(d => d.id !== id);
  await db.del('drinks', id);
  emit();
}
export async function clearLegacyWater(date) {
  const { [date]: _, ...rest } = state.water;
  state.water = rest;
  await kv('water', state.water);
  emit();
}
export async function restoreDrink(row) { state.drinks = [...state.drinks, row]; await db.put('drinks', row); emit(); }
/** Tira `ml` de água do dia: primeiro do último copo de água registrado, depois do total antigo. */
export async function removeWater(date, ml) {
  const last = dayDrinks(date).filter(d => d.type === 'agua').pop();
  if (last) return removeDrink(last.id);
  state.water = { ...state.water, [date]: Math.max(0, (state.water[date] ?? 0) - ml) };
  await kv('water', state.water);
  emit();
}
// ---------- Rotina ----------
export function getRoutine() {
  const p = getPlan();
  return p ? buildRoutine({ profile: state.profile, plan: p, waterGoal: state.settings.waterGoal }) : null;
}
export function routineStatus(date, routine = getRoutine()) {
  if (!routine) return null;
  const p = getPlan();
  return dayStatus(routine, {
    entries: dayEntries(date), water: liquidsOn(date).total, waterGoal: waterGoalOn(date),
    protein: totals(dayEntries(date)).p, proteinGoal: p?.macros?.protein ?? null,
    weighed: state.weights.some(w => w.date === date), checks: state.routine[date] ?? {},
    activeMin: activitiesOn(date).filter(a => a.status === 'feita').reduce((n, a) => n + (a.minutes || 0), 0),
    strength: activitiesOn(date).some(a => a.status === 'feita' && a.type === 'musculacao'),
  });
}
export async function toggleRoutineCheck(date, id) {
  const day = { ...(state.routine[date] ?? {}) };
  if (day[id]) delete day[id]; else day[id] = true;
  state.routine = { ...state.routine, [date]: day };
  await kv('routine', state.routine);
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
  registerServings([row]);
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
  const { profile, settings, entries, weights, foods, templates, favorites, water, drinks, routine, goalLog, presets, activities, envHistory, avatar, myChallenges, checkins, achievements, adaptive } = state;
  return { app: 'leve', version: 1, exportedAt: new Date().toISOString(), profile, settings, entries, weights, foods, templates, favorites, water, drinks, routine, goalLog, presets, activities, envHistory, avatar, challenges: myChallenges, checkins, achievements, adaptive };
}
export async function importData(data) {
  if (data?.app !== 'leve' || !Array.isArray(data.entries) || !Array.isArray(data.weights)) throw new Error('Arquivo não reconhecido');
  await db.clearAll();
  await Promise.all([
    db.bulkPut('entries', data.entries), db.bulkPut('weights', data.weights), db.bulkPut('foods', data.foods ?? []),
    db.bulkPut('templates', data.templates ?? []), db.bulkPut('drinks', data.drinks ?? []),
    db.bulkPut('kv', ['profile', 'settings', 'favorites', 'water', 'routine', 'goalLog', 'presets', 'activities', 'envHistory', 'avatar', 'challenges', 'checkins', 'achievements', 'adaptive'].filter(k => data[k] != null).map(key => ({ key, value: data[key] }))),
  ]);
  await load();
  emit();
}
/** Relê tudo do aparelho (depois de baixar mudanças da nuvem). */
export async function reload() { await load(); emit(); }
export async function wipe() {
  await db.clearAll();
  await load();
  emit();
}
