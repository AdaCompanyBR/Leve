// Estimar calorias de algo que não está na tabela nem tem código de barras:
// receitas típicas (TACO) e média de produtos parecidos no Open Food Facts.
import { h, icon, int, dec1, openSheet } from './dom.js';
import { state, saveFood } from '../store.js';
import { search } from '../lib/search.js';
import { RECIPE_GROUP } from '../lib/recipes.js';
import { offSearchUrl, summarize } from '../lib/estimate.js';

const cache = new Map();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Receitas típicas parecidas com o pedido. */
export function recipeMatches(query, limit = 3) {
  return search(state.index, query, 12).filter(r => r.food.g === RECIPE_GROUP && r.score >= 0.6).slice(0, limit).map(r => r.food);
}

async function fetchJson(url, ms = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('rede');
    return await res.json();
  } finally { clearTimeout(t); }
}

/** Média de produtos parecidos no Open Food Facts: primeiro do Brasil, depois do mundo. */
export async function onlineAverage(query) {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  let s = summarize((await fetchJson(offSearchUrl(query, 'brazil'))).products, query);
  if (!s) s = summarize((await fetchJson(offSearchUrl(query, null))).products, query);
  cache.set(key, s);
  return s;
}

const servingText = f => `1 ${f.servingUnit} ≈ ${int(f.serving)} g`;

/** Detalhe de uma receita típica: ingredientes, gramas e calorias de cada um. */
export function recipeDetails(food, open = false) {
  return h('details.est-details', { open },
    h('summary', 'Como a conta foi feita'),
    h('ul.est-ingr', food.ingredients.map(it => h('li', h('span', it.n, it.note ? h('span.est-note', ` (${it.note})`) : null), h('span', `${int(it.grams)} g · ${int(it.kcal)} kcal`)))),
    h('p.fine', `Receita típica: as quantidades são de um preparo comum e os valores vêm da TACO. Se o seu foi diferente, ajuste a porção ou os valores.`));
}

/**
 * Sheet de estimativa. `onPick(food)` recebe o alimento escolhido (receita ou média salva);
 * sem ele, abre o alimento para registrar.
 */
export function estimateSheet(query, { onPick } = {}) {
  query = query.trim();
  const pick = food => { sheet.close(); setTimeout(() => onPick(food), 280); };
  const recipes = recipeMatches(query);
  const online = h('div.est-online', { 'aria-live': 'polite' });

  const recipeSection = recipes.length ? h('section.est-section',
    h('h3.est-h', 'Receita típica'),
    h('p.est-sub', 'Calculada com os ingredientes de um preparo comum, com valores da TACO.'),
    recipes.map((f, i) => h('div.est-card',
      h('div.est-top', h('div', h('p.est-name', f.n), h('p.est-meta', `${servingText(f)} · ${int(f.k)} kcal por 100 g`)),
        h('p.est-kcal', h('b', `≈ ${int(f.servingKcal)}`), ' kcal')),
      recipeDetails(f, i === 0 && recipes.length === 1),
      h('button.btn.primary.block', { type: 'button', onclick: () => pick(f) }, 'Usar esta estimativa')))) : null;

  async function loadOnline() {
    online.replaceChildren(h('p.est-loading', h('span.est-spin', { 'aria-hidden': 'true' }), 'Procurando produtos parecidos no Open Food Facts…'));
    if (!navigator.onLine) return online.replaceChildren(h('p.est-sub', 'Sem internet agora. A média de produtos parecidos precisa de conexão.'), retry());
    try {
      const s = await onlineAverage(query);
      if (!s) {
        online.replaceChildren(h('p.est-sub', `Não achamos produtos parecidos com “${query}” com calorias cadastradas. Tente um nome mais simples (por exemplo, sem a marca).`));
        return;
      }
      const use = async () => {
        const food = await saveFood({ n: cap(query), k: s.k, p: s.p, c: s.c, f: s.f, source: 'media', count: s.count, low: s.low, high: s.high,
          serving: s.serving ?? undefined, servingUnit: s.serving ? 'unidade' : undefined });
        pick(food);
      };
      online.replaceChildren(h('div.est-card',
        h('div.est-top', h('div', h('p.est-name', `Média de ${s.count} produtos`), h('p.est-meta', `a maioria entre ${int(s.low)} e ${int(s.high)} kcal por 100 g`)),
          h('p.est-kcal', h('b', `≈ ${int(s.k)}`), ' kcal/100 g')),
        h('p.est-macros', `Proteína ${dec1(s.p)} g · Carboidrato ${dec1(s.c)} g · Gordura ${dec1(s.f)} g, por 100 g`),
        s.serving ? h('p.est-meta', `Porção mais comum: ${int(s.serving)} g, ≈ ${int(s.k * s.serving / 100)} kcal`) : null,
        h('details.est-details', h('summary', 'Produtos usados como exemplo'),
          h('ul.est-ingr', s.examples.map(e => h('li', h('span', e.name), h('span', `${int(e.k)} kcal/100 g`))))),
        h('button.btn.primary.block', { type: 'button', onclick: use }, 'Usar esta média')));
    } catch {
      online.replaceChildren(h('p.est-sub', 'A busca no Open Food Facts falhou. Tente de novo em instantes.'), retry());
    }
  }
  const retry = () => h('button.btn.tonal.compact', { type: 'button', onclick: loadOnline }, 'Tentar de novo');

  const sheet = openSheet({
    title: `Estimar “${query}”`, wide: true,
    content: [
      h('p.sheet-text', 'Não há código de barras nem item igual na tabela. Estas são estimativas: confira e ajuste se souber os valores reais.'),
      recipeSection,
      h('section.est-section', h('h3.est-h', 'Média de produtos parecidos'), online),
      h('section.est-section',
        h('h3.est-h', 'Sabe os valores?'),
        h('button.btn.tonal.block', { type: 'button', onclick: () => pick({ manual: true, n: cap(query) }) }, icon('plus'), 'Cadastrar com os valores do rótulo')),
    ],
  });
  loadOnline();
  return sheet;
}
