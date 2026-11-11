// Trocas mais leves: bloco compartilhado pela sheet de alimento, pela tela Hoje e pela aba Líquidos.
import { h, icon, int, openSheet } from './dom.js';
import { state, foodById } from '../store.js';
import { swapsFor, DRINK_SWAPS } from '../lib/swaps.js';
import { drinkById } from '../lib/hydration.js';

export const swapsOn = () => state.settings.showSwaps !== false;

/** Trocas para um alimento do diário (ou null). */
export function swapsForFood(food, grams) {
  if (!swapsOn() || !food) return null;
  return swapsFor(food, grams, state.taco);
}

const savedText = a => (a.kcal == null ? `quase sem calorias, ≈ ${int(a.saved)} kcal a menos` : a.kcal === 0 ? `${int(a.saved)} kcal a menos` : `${int(a.kcal)} kcal, ${int(a.saved)} a menos`);

/**
 * Lista de alternativas. `onPick(food, grams)` abre a alternativa da TACO para registrar.
 * Alternativas sem item na TACO (água, refrigerante zero) aparecem só como texto.
 */
export function altList(s, onPick) {
  return h('ul.swap-alts', s.alts.map(a => h('li',
    a.food && onPick
      ? h('button.swap-alt', { type: 'button', onclick: () => onPick(a.food, s.grams), 'aria-label': `${a.label}: ${savedText(a)}. Abrir` },
        h('span.swap-name', a.label), h('span.swap-save', savedText(a)), icon('next'))
      : h('div.swap-alt.static', h('span.swap-name', a.label), h('span.swap-save', savedText(a))))));
}

/** Bloco "Opção mais leve" dentro da sheet de alimento. */
export function swapBox(s, onPick, title = 'Opção mais leve') {
  if (!s) return null;
  return h('section.swap-box', { 'aria-label': title },
    h('p.swap-title', icon('swap'), title),
    h('p.swap-reason', s.reason),
    altList(s, onPick),
    h('p.swap-note', `Comparação na mesma quantidade (${int(s.grams)} g ou ml), com valores da TACO.`));
}

/** Sheet com a troca de um item já registrado. */
export function swapSheet(name, s, onPick) {
  const sheet = openSheet({ title: `Para a próxima vez: ${name}`, content: [swapBox(s, (f, g) => { sheet.close(); onPick?.(f, g); }, 'Por que trocar')] });
  return sheet;
}

/** Trocas dos itens de um dia, sem repetir o mesmo alimento, das que mais economizam para as que menos. */
export function daySwaps(entries, limit = 3) {
  if (!swapsOn()) return [];
  const seen = new Set(), out = [];
  for (const e of entries) {
    const key = e.foodId ?? e.name;
    if (seen.has(key)) continue;
    seen.add(key);
    const food = foodById(e.foodId) ?? (e.grams ? { n: e.name, k: e.kcal * 100 / e.grams } : null);
    const s = swapsFor(food, e.grams, state.taco);
    if (s) out.push({ entry: e, s, best: Math.max(...s.alts.map(a => a.saved)) });
  }
  return out.sort((a, b) => b.best - a.best).slice(0, limit);
}

/** Trocas para as bebidas registradas na aba Líquidos (sem números: o tipo é genérico). */
export function drinkSwaps(drinks) {
  if (!swapsOn()) return [];
  const types = [...new Set(drinks.map(d => d.type))].filter(t => DRINK_SWAPS[t]);
  return types.map(t => ({ type: t, label: drinkById(t).label, ...DRINK_SWAPS[t] }));
}
