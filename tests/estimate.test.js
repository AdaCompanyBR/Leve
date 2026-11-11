import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRecipeFoods, RECIPES } from '../src/lib/recipes.js';
import { summarize, relevant, kcalOf, offSearchUrl } from '../src/lib/estimate.js';
import { makeIndex, search } from '../src/lib/search.js';
import { parsePhrase } from '../src/lib/parser.js';
import { registerServings, toGrams } from '../src/lib/portions.js';

const taco = JSON.parse(readFileSync(new URL('../data/taco.json', import.meta.url)));
const recipes = buildRecipeFoods(taco);
registerServings(recipes);
const index = makeIndex([...taco, ...recipes]);

test('receitas: todos os ingredientes existem na TACO e as contas fecham', () => {
  assert.equal(recipes.length, RECIPES.length);
  const sand = recipes.find(r => r.id === 'r-sand-nat-frango');
  // 50 g pão integral (253) + 50 g frango cozido (163) + 10 g maionese (302) + 15 g cenoura (34) + 10 g alface (11) + 25 g tomate (15)
  const expected = 0.5 * 253 + 0.5 * 163 + 0.1 * 302 + 0.15 * 34 + 0.1 * 11 + 0.25 * 15;
  assert.equal(sand.servingKcal, Math.round(expected));
  assert.equal(sand.k, Math.round(expected / 160 * 100));
  for (const r of recipes) assert.ok(r.k > 0 && r.k < 900 && r.serving > 0, r.n);
});

test('receitas: aparecem na busca e na frase livre, com a porção da receita', () => {
  assert.equal(search(index, 'sanduiche natural de frango', 3)[0].food.id, 'r-sand-nat-frango');
  assert.equal(search(index, 'misto quente', 3)[0].food.id, 'r-misto');
  assert.equal(search(index, 'esfirra', 3)[0].food.id, 'r-esfiha');
  const [item] = parsePhrase('1 sanduíche natural de frango');
  const food = search(index, item.query, 1)[0].food;
  assert.equal(food.id, 'r-sand-nat-frango');
  assert.equal(toGrams(food.n, item.unit, item.qty).grams, 160);
  assert.equal(toGrams(food.n, 'unidade', 2).grams, 320);
});

test('média: usa a mediana dos produtos parecidos e ignora os sem relação', () => {
  const mk = (name, k, extra = {}) => ({ product_name: name, nutriments: { 'energy-kcal_100g': k, proteins_100g: 10, carbohydrates_100g: 25, fat_100g: 8 }, ...extra });
  const s = summarize([
    mk('Sanduíche natural de frango', 200, { serving_quantity: 150 }), mk('Sanduiche Natural Frango Light', 180, { serving_quantity: 170 }),
    mk('Sanduíche natural de frango com cenoura', 230), mk('Sanduíche natural frango e queijo', 260),
    mk('Chocolate ao leite', 540), mk('Sanduíche natural de frango', 0), { product_name: 'Sanduíche natural de frango' },
  ], 'sanduiche natural de frango');
  assert.equal(s.count, 4);
  assert.equal(s.k, 215);
  assert.equal(s.p, 10);
  assert.equal(s.serving, 160);
  assert.ok(s.low <= s.k && s.k <= s.high);
  assert.equal(summarize([mk('Sanduíche natural', 200)], 'sanduiche natural'), null);
});

test('média: kJ vira kcal e nome sem relação não conta', () => {
  assert.equal(Math.round(kcalOf({ nutriments: { 'energy-kj_100g': 418.4 } })), 100);
  assert.equal(relevant('Bolo de cenoura', 'sanduiche natural de frango'), false);
  assert.match(offSearchUrl('pão de mel'), /search_terms=p%C3%A3o\+de\+mel/);
});
