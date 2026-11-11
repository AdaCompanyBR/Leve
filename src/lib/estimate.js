// Média de calorias de produtos parecidos no Open Food Facts. Funções puras: a busca na rede
// fica na interface; aqui só se filtra, resume e monta o endereço.
import { tokens } from './search.js';

export const MIN_PRODUCTS = 3;

export function offSearchUrl(query, country = 'brazil') {
  const p = new URLSearchParams({
    search_terms: query, search_simple: '1', action: 'process', json: '1', page_size: '50',
    fields: 'product_name,product_name_pt,brands,nutriments,serving_quantity',
  });
  if (country) { p.set('tagtype_0', 'countries'); p.set('tag_contains_0', 'contains'); p.set('tag_0', country); }
  return `https://world.openfoodfacts.org/cgi/search.pl?${p}`;
}

const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};
const median = xs => quantile([...xs].sort((a, b) => a - b), 0.5);

/** kcal por 100 g de um produto do Open Food Facts, ou null. */
export function kcalOf(p) {
  const nm = p?.nutriments ?? {};
  let k = Number(nm['energy-kcal_100g']);
  if (!Number.isFinite(k) && Number.isFinite(Number(nm['energy-kj_100g']))) k = Number(nm['energy-kj_100g']) / 4.184;
  return Number.isFinite(k) && k > 0 && k <= 900 ? k : null;
}

/** O nome do produto contém a maior parte das palavras pedidas? */
export function relevant(name, query) {
  const want = tokens(query);
  if (!want.length) return false;
  const have = new Set(tokens(name));
  const hits = want.filter(t => have.has(t) || [...have].some(h => h.startsWith(t) && t.length >= 4)).length;
  return hits / want.length >= 0.6;
}

/**
 * Resume os produtos parecidos: mediana das calorias e dos macros por 100 g, faixa onde está
 * a metade do meio, porção típica e alguns exemplos. Devolve null com menos de MIN_PRODUCTS.
 */
export function summarize(products, query) {
  const rows = [];
  const seen = new Set();
  for (const p of products ?? []) {
    const name = (p.product_name_pt || p.product_name || '').trim();
    const k = kcalOf(p);
    if (!name || k == null || !relevant(name, query)) continue;
    const key = name.toLowerCase() + '|' + Math.round(k);
    if (seen.has(key)) continue;
    seen.add(key);
    const nm = p.nutriments ?? {};
    const num = v => (Number.isFinite(Number(v)) ? Number(v) : null);
    rows.push({ name: [name, p.brands?.split(',')[0]?.trim()].filter(Boolean).join(', '), k,
      p: num(nm.proteins_100g), c: num(nm.carbohydrates_100g), f: num(nm.fat_100g), serving: num(p.serving_quantity) });
  }
  if (rows.length < MIN_PRODUCTS) return null;
  const ks = rows.map(r => r.k).sort((a, b) => a - b);
  const k = median(ks);
  const macro = key => { const xs = rows.map(r => r[key]).filter(v => v != null); return xs.length ? Math.round(median(xs) * 10) / 10 : 0; };
  const servings = rows.map(r => r.serving).filter(v => v > 0 && v <= 1000);
  // Exemplos mais próximos da mediana.
  const examples = [...rows].sort((a, b) => Math.abs(a.k - k) - Math.abs(b.k - k)).slice(0, 3).map(r => ({ name: r.name, k: Math.round(r.k) }));
  return {
    count: rows.length, k: Math.round(k), p: macro('p'), c: macro('c'), f: macro('f'),
    low: Math.round(quantile(ks, 0.25)), high: Math.round(quantile(ks, 0.75)),
    serving: servings.length >= 2 ? Math.round(median(servings)) : null, examples,
  };
}
