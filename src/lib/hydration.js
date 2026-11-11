// Líquidos: tipos de bebida e somas por dia e por semana. Funções puras.
import { addDays, weekStart } from './dates.js';

/**
 * Tipos de bebida. `hydrates: false` registra o volume, mas não conta para a meta de líquidos.
 * `food` é o termo de busca na TACO para quem quiser registrar as calorias no diário.
 */
export const DRINKS = [
  { id: 'agua', label: 'Água', hydrates: true },
  { id: 'cafe', label: 'Café', hydrates: true, food: 'café infusão' },
  { id: 'cha', label: 'Chá', hydrates: true },
  { id: 'suco', label: 'Suco', hydrates: true, food: 'suco' },
  { id: 'leite', label: 'Leite', hydrates: true, food: 'leite' },
  { id: 'coco', label: 'Água de coco', hydrates: true, food: 'coco água' },
  { id: 'refri', label: 'Refrigerante', hydrates: true, food: 'refrigerante' },
  { id: 'zero', label: 'Refri zero', hydrates: true },
  { id: 'isotonico', label: 'Isotônico', hydrates: true },
  { id: 'alcool', label: 'Bebida alcoólica', hydrates: false, food: 'cerveja' },
  { id: 'outro', label: 'Outro', hydrates: true },
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

