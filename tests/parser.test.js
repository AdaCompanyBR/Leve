import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePhrase } from '../src/lib/parser.js';
import { makeIndex, search } from '../src/lib/search.js';
import { toGrams, nutrientsFor } from '../src/lib/portions.js';

const taco = JSON.parse(readFileSync(new URL('../data/taco.json', import.meta.url), 'utf8'));
const index = makeIndex(taco);
const top = q => search(index, q)[0]?.food.n;

test('frase livre: "2 ovos mexidos e um pão francês"', () => {
  const items = parsePhrase('2 ovos mexidos e um pão francês');
  assert.equal(items.length, 2);
  assert.deepEqual([items[0].qty, items[0].unit, items[0].query], [2, 'unidade', 'ovos mexidos']);
  assert.deepEqual([items[1].qty, items[1].unit, items[1].query], [1, 'unidade', 'pao frances']);
});

test('frase livre: unidades caseiras e gramas', () => {
  const items = parsePhrase('3 colheres de sopa de arroz, 1 concha de feijão; 200g de frango + meia xícara de leite e 1 e meia fatia de queijo');
  assert.deepEqual(items.map(i => [i.qty, i.unit, i.query]), [
    [3, 'colher de sopa', 'arroz'], [1, 'concha', 'feijao'], [200, 'g', 'frango'], [0.5, 'xícara', 'leite'], [1.5, 'fatia', 'queijo'],
  ]);
});

test('frase livre: decimais, frações, kg e litros', () => {
  assert.deepEqual(parsePhrase('1,5 copo de suco de laranja').map(i => [i.qty, i.unit, i.query]), [[1.5, 'copo', 'suco de laranja']]);
  assert.equal(parsePhrase('1/2 mamão')[0].qty, 0.5);
  assert.deepEqual(parsePhrase('0,3 kg de batata').map(i => [i.qty, i.unit]), [[300, 'g']]);
  assert.equal(parsePhrase('meia dúzia de ovos')[0].qty, 6);
  assert.equal(parsePhrase('banana')[0].qty, 1);
  assert.deepEqual(parsePhrase(' , e '), []);
});

test('busca aproximada na TACO', () => {
  assert.equal(top('pao frances'), 'Pão, trigo, francês');
  assert.match(top('ovos mexidos'), /^Ovo, de galinha, inteiro, frito/);
  assert.match(top('ovo cozido'), /^Ovo, de galinha, inteiro, cozido/);
  assert.equal(top('arroz'), 'Arroz, tipo 1, cozido');
  assert.equal(top('arroz integral'), 'Arroz, integral, cozido');
  assert.equal(top('feijão'), 'Feijão, carioca, cozido');
  assert.equal(top('feijao preto'), 'Feijão, preto, cozido');
  assert.equal(top('banana'), 'Banana, prata, crua');
  assert.equal(top('banana nanica'), 'Banana, nanica, crua');
  assert.equal(top('iogurte'), 'Iogurte, natural');
  assert.equal(top('queijo mussarela'), 'Queijo, mozarela');
  assert.match(top('frango grelhado'), /^Frango, peito, sem pele, grelhado/);
  assert.match(top('batata doce'), /^Batata, doce, cozida/);
  assert.match(top('bananna prata'), /^Banana, prata/); // erro de digitação
  assert.deepEqual(search(index, 'xyzabc'), []);
});

test('porções e nutrientes vêm da TACO sem alteração', () => {
  const pao = taco.find(f => f.n === 'Pão, trigo, francês');
  assert.equal(pao.k, 300);
  assert.deepEqual(toGrams(pao.n, 'unidade', 1), { grams: 50, exact: false, known: true });
  assert.equal(nutrientsFor(pao, 50).kcal, 150);
  assert.deepEqual(toGrams('Qualquer coisa', 'g', 120), { grams: 120, exact: true, known: true });
  assert.equal(toGrams('Jiló, cru', 'unidade', 1).known, false); // genérico: o app pede conferência
});
