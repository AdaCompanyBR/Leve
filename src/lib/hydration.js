// Líquidos: tipos de bebida e somas por dia e por semana. Funções puras.
import { addDays, weekStart } from './dates.js';

/**
 * Tipos de bebida. `hydrates: false` registra o volume, mas não conta para a meta de líquidos.
 * `food` é o termo de busca na TACO para quem quiser registrar as calorias no diário.
 */
/**
 * Cada bebida tem uma cor (camada no corpo e nos copos), um ícone e, quando é gaseificada, `fizz`.
 * Cores com pouca saturação, legíveis no claro e no escuro.
 */
export const DRINKS = [
  { id: 'agua', label: 'Água', hydrates: true, color: '#5AB4F0', icon: 'drop' },
  { id: 'gas', label: 'Água com gás', hydrates: true, color: '#8FD0F5', icon: 'drop', fizz: true },
  { id: 'cafe', label: 'Café', hydrates: true, food: 'café infusão', color: '#9A6A4A', icon: 'mug' },
  { id: 'cha', label: 'Chá', hydrates: true, color: '#C9A24D', icon: 'mug' },
  { id: 'suco', label: 'Suco', hydrates: true, food: 'suco', color: '#F2A24A', icon: 'glass' },
  { id: 'leite', label: 'Leite', hydrates: true, food: 'leite', color: '#E6DED0', icon: 'glass' },
  { id: 'coco', label: 'Água de coco', hydrates: true, food: 'coco água', color: '#86CFC0', icon: 'glass' },
  { id: 'refri', label: 'Refrigerante', hydrates: true, food: 'refrigerante', color: '#8A5A44', icon: 'can', fizz: true },
  { id: 'zero', label: 'Refri zero', hydrates: true, color: '#A07A66', icon: 'can', fizz: true },
  { id: 'isotonico', label: 'Isotônico', hydrates: true, color: '#7FA8E8', icon: 'bottle' },
  { id: 'alcool', label: 'Bebida alcoólica', hydrates: false, food: 'cerveja', color: '#D9A441', icon: 'glass' },
  { id: 'outro', label: 'Outro', hydrates: true, color: '#9AA6B2', icon: 'glass' },
];
export const drinkById = id => DRINKS.find(d => d.id === id) ?? DRINKS[DRINKS.length - 1];

/** Tamanhos rápidos, em ml. */
export const SIZES = [150, 200, 250, 300, 350, 500];

/**
 * Total de líquidos de um dia. `legacy` é o total antigo por dia (só água, sem itens),
 * mantido para quem já usava o cartão de água antes desta aba.
 */
export function dayTotal(drinks, legacy, date) {
  let total = Math.max(0, legacy?.[date] ?? 0), other = 0;
  for (const d of drinks) {
    if (d.date !== date) continue;
    if (drinkById(d.type).hydrates) total += d.ml; else other += d.ml;
  }
  return { total, other };
}

/** Mililitros por tipo no dia, do maior para o menor (só o que conta para a meta). */
export function byType(drinks, legacy, date) {
  const out = {};
  const old = Math.max(0, legacy?.[date] ?? 0);
  if (old) out.agua = old;
  for (const d of drinks) if (d.date === date) out[d.type] = (out[d.type] ?? 0) + d.ml;
  return Object.entries(out).map(([type, ml]) => ({ type, ml, hydrates: drinkById(type).hydrates })).sort((a, b) => b.ml - a.ml);
}

/** Semana de segunda a domingo que contém `today`, com total por dia e quantos dias bateram a meta. */
export function weekSeries(drinks, legacy, goal, today) {
  const start = weekStart(today);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const { total } = dayTotal(drinks, legacy, date);
    return { date, ml: total, isToday: date === today, future: date > today };
  });
  const past = days.filter(d => !d.future);
  const logged = past.filter(d => d.ml > 0);
  return {
    days,
    metDays: past.filter(d => d.ml >= goal).length,
    avg: logged.length ? logged.reduce((s, d) => s + d.ml, 0) / logged.length : 0,
  };
}


/** Limite por registro, em ml. */
export const MAX_ML = 5000;

/**
 * Converte o que a pessoa digitou em ml. Aceita vírgula ou ponto, e "ml" ou "L" no texto
 * ("1,5 L", "350ml", "0.33"). Sem unidade no texto, usa `unit`. Devolve NaN se não for válido.
 */
export function parseAmount(text, unit = 'ml') {
  const s = String(text ?? '').trim().toLowerCase().replace(/\s+/g, '');
  const m = s.match(/^(\d+(?:[.,]\d+)?|[.,]\d+)(ml|l|litros?)?$/);
  if (!m) return NaN;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = m[2] ? (m[2] === 'ml' ? 'ml' : 'l') : unit.toLowerCase();
  const ml = Math.round(u === 'l' ? n * 1000 : n);
  return ml > 0 && ml <= MAX_ML ? ml : NaN;
}

// ---------------------------------------------------------------------------
// Meta por dia: mudar a meta vale daqui para a frente. `log` é uma lista
// [{ from: 'AAAA-MM-DD', goal }] em ordem; antes do primeiro registro vale `fallback`.

/** Meta de líquidos de um dia. */
export function goalOn(log, fallback, date) {
  let goal = fallback;
  for (const g of log ?? []) if (g.from <= date) goal = g.goal;
  return goal;
}

/** Novo registro de meta a partir de `today`, preservando a meta antiga para os dias anteriores. */
export function withGoal(log, previous, goal, today) {
  const list = [...(log ?? [])];
  if (!list.length) list.push({ from: '0000-01-01', goal: previous });
  const rest = list.filter(g => g.from < today);
  rest.push({ from: today, goal });
  return rest;
}

/**
 * Meta sugerida: cerca de 35 ml por kg, mais um pouco para quem se exercita e para o calor.
 * Arredonda para 100 ml e fica entre 1,5 e 4,5 L. É uma referência, não uma prescrição.
 */
export const CLIMATES = [
  { id: 'calor', label: 'Calor', hint: 'A maior parte do ano é quente' },
  { id: 'temperado', label: 'Temperado', hint: 'Calor e frio moderados' },
  { id: 'frio', label: 'Frio', hint: 'A maior parte do ano é fria' },
];
const ACTIVITY_ML = { sedentario: 0, leve: 250, moderado: 500, alto: 750, extremo: 1000 };
const CLIMATE_ML = { calor: 500, temperado: 0, frio: 0 };
export function suggestWaterGoal({ weightKg, activity = 'sedentario', climate = 'temperado' }) {
  if (!(weightKg > 0)) return 2000;
  const ml = weightKg * 35 + (ACTIVITY_ML[activity] ?? 0) + (CLIMATE_ML[climate] ?? 0);
  return Math.min(4500, Math.max(1500, Math.round(ml / 100) * 100));
}

// ---------------------------------------------------------------------------
// Camadas: o que foi bebido no dia, em ordem, para encher o corpo e os copos.

/**
 * Camadas do dia, na ordem em que as bebidas foram registradas (só as que contam para a meta).
 * O total antigo (água sem itens) entra primeiro.
 */
export function dayLayers(drinks, legacy, date) {
  const out = [];
  const old = Math.max(0, legacy?.[date] ?? 0);
  if (old) out.push({ type: 'agua', ml: old });
  for (const d of [...drinks].filter(x => x.date === date).sort((a, b) => a.ts - b.ts)) {
    if (!drinkById(d.type).hydrates) continue;
    const last = out[out.length - 1];
    if (last && last.type === d.type) last.ml += d.ml; else out.push({ type: d.type, ml: d.ml });
  }
  return out;
}

/**
 * Converte camadas em faixas de 0 a 1 (fração da meta), de baixo para cima.
 * O que passa da meta não aparece: a figura fica cheia, mas o total continua contando.
 */
export function fillBands(layers, goal) {
  const bands = [];
  let at = 0;
  for (const l of layers) {
    if (at >= 1) break;
    const h = Math.min(1 - at, l.ml / goal);
    if (h <= 0) continue;
    bands.push({ type: l.type, from: at, to: at + h });
    at += h;
  }
  return { bands, level: at };
}

/** Semana com o total, as bebidas por tipo e a meta de cada dia, mais um resumo. */
export function weekDetail(drinks, legacy, goalFor, today, selected = today) {
  const start = weekStart(selected);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    const layers = dayLayers(drinks, legacy, date);
    const types = {};
    for (const l of layers) types[l.type] = (types[l.type] ?? 0) + l.ml;
    const ml = layers.reduce((s, l) => s + l.ml, 0);
    const goal = goalFor(date);
    return { date, ml, goal, met: ml >= goal, layers, types, future: date > today };
  });
  const past = days.filter(d => !d.future);
  const logged = past.filter(d => d.ml > 0);
  const total = past.reduce((s, d) => s + d.ml, 0);
  const best = logged.reduce((a, d) => (!a || d.ml > a.ml ? d : a), null);
  return { days, total, avg: logged.length ? total / logged.length : 0, metDays: past.filter(d => d.met && d.ml > 0).length, pastDays: past.length, best };
}

// ---------------------------------------------------------------------------
// Atalhos: as combinações de bebida e volume mais usadas nos últimos 30 dias.

export const DEFAULT_SHORTCUTS = [{ type: 'agua', ml: 250 }, { type: 'agua', ml: 500 }, { type: 'cafe', ml: 150 }, { type: 'cha', ml: 200 }];
export function shortcuts(drinks, today, n = 4) {
  const since = addDays(today, -30);
  const count = new Map();
  for (const d of drinks) {
    if (d.date < since || d.date > today) continue;
    const k = `${d.type}|${d.ml}`;
    const c = count.get(k) ?? { type: d.type, ml: d.ml, n: 0, last: 0 };
    c.n++; c.last = Math.max(c.last, d.ts ?? 0);
    count.set(k, c);
  }
  const top = [...count.values()].sort((a, b) => b.n - a.n || b.last - a.last).map(({ type, ml }) => ({ type, ml }));
  for (const s of DEFAULT_SHORTCUTS) if (top.length < n && !top.some(t => t.type === s.type && t.ml === s.ml)) top.push(s);
  return top.slice(0, n);
}

// ---------------------------------------------------------------------------
// Voz: "tomei 300 ml de café", "meio litro de água", "um copo de suco".

const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const WORDS = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, meio: .5, meia: .5 };
const CONTAINERS = { copo: 250, copos: 250, xicara: 150, xicaras: 150, garrafa: 500, garrafinha: 500, lata: 350, latinha: 350, caneca: 300, taca: 150, gole: 30 };
const TYPE_WORDS = [
  ['gas', /agua (com|c\/) gas|agua gaseificada/], ['coco', /agua de coco/], ['agua', /\bagua\b/], ['cafe', /\bcafe|cafezinho|expresso|espresso/],
  ['cha', /\bcha\b|\bmate\b/], ['suco', /\bsuco|\blimonada/], ['leite', /\bleite\b|vitamina/], ['zero', /(refri|refrigerante|coca).*(zero|diet)/],
  ['refri', /refri|refrigerante|\bcoca\b|guarana/], ['isotonico', /isotonico|gatorade|powerade/], ['alcool', /cerveja|vinho|caipirinha|chopp|drink/],
];

/** Entende uma frase falada. Devolve { type, ml } ou null se não achar volume. */
export function parseDrinkSpeech(text) {
  const t = norm(String(text ?? '')).replace(/,/g, '.');
  const type = (TYPE_WORDS.find(([, re]) => re.test(t)) ?? ['agua'])[0];
  let ml = null;
  let m = t.match(/(\d+(?:\.\d+)?)\s*(ml|mililitros?|l\b|litros?)/);
  if (m) ml = /^l|litro/.test(m[2]) ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
  if (ml == null && (m = t.match(/\b(meio|meia|um|uma|dois|duas|tres)\s+litros?\b/))) ml = WORDS[m[1]] * 1000;
  if (ml == null && (m = t.match(/\b(\d+|um|uma|dois|duas|tres|quatro|cinco|meio|meia)?\s*(copos?|xicaras?|garrafa|garrafinha|lata|latinha|caneca|taca)\b/))) {
    const q = m[1] ? (WORDS[m[1]] ?? parseFloat(m[1])) : 1;
    ml = q * CONTAINERS[m[2]];
  }
  if (ml == null) return null;
  ml = Math.round(ml);
  return ml > 0 && ml <= MAX_ML ? { type, ml } : null;
}
