import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { swapsFor, RULES } from '../src/lib/swaps.js';

const taco = JSON.parse(readFileSync(new URL('../data/taco.json', import.meta.url)));
const byName = n => taco.find(f => f.n === n);

test('trocas: toda alternativa citada existe na TACO', () => {
  const names = new Set(taco.map(f => f.n));
  for (const r of RULES) for (const a of r.alts) if (typeof a === 'string') assert.ok(names.has(a), `${r.id}: ${a}`);
});

test('trocas: suco de uva sugere água e refrigerante zero, com o motivo', () => {
  const s = swapsFor(byName('Uva, suco concentrado, envasado'), 300, taco);
  assert.equal(s.rule, 'suco');
  assert.equal(s.kcal, 174);
  assert.match(s.reason, /açúcar/);
  assert.deepEqual(s.alts.slice(0, 2).map(a => [a.label.split(' ')[0], a.kcal, a.saved]), [['Água', 0, 174], ['Refrigerante', null, 174]]);
});

test('trocas: produto de fora da TACO também recebe sugestão pelo nome', () => {
  const coca = { n: 'Coca-Cola Original', k: 42 };
  assert.equal(swapsFor(coca, 350, taco).rule, 'refri');
  assert.equal(swapsFor({ n: 'Coca-Cola Zero', k: 0.2 }, 350, taco), null);
});

test('trocas: só sugere quando a economia vale a pena', () => {
  const s = swapsFor(byName('Batata, inglesa, frita'), 100, taco);
  assert.ok(s.alts.every(a => a.saved >= 15 && a.kcal <= 267 * 0.85));
  assert.equal(swapsFor(byName('Alface, crespa, crua') ?? { n: 'Alface', k: 11, g: 'Verduras, hortaliças e derivados' }, 100, taco), null);
  assert.equal(swapsFor(byName('Uva, suco concentrado, envasado'), 10, taco), null); // 6 kcal: não vale
});

test('trocas: nomes parecidos não disparam regra errada', () => {
  assert.notEqual(swapsFor(byName('Macarrão, molho bolognesa'), 200, taco)?.rule, 'biscoito');
  assert.notEqual(swapsFor(byName('Farinha, de mandioca, torrada'), 30, taco)?.rule, 'pao');
  assert.equal(swapsFor(byName('Limão, galego, suco'), 30, taco), null);
});
