import test from 'node:test';
import assert from 'node:assert/strict';
import { dayTotal, byType, weekSeries, drinkById } from '../src/lib/hydration.js';

const drinks = [
  { id: 'a', date: '2026-11-11', type: 'agua', ml: 250 },
  { id: 'b', date: '2026-11-11', type: 'cafe', ml: 150 },
  { id: 'c', date: '2026-11-11', type: 'alcool', ml: 350 },
  { id: 'd', date: '2026-11-10', type: 'agua', ml: 2000 },
];

test('líquidos: soma do dia inclui o total antigo e ignora bebida alcoólica', () => {
  assert.deepEqual(dayTotal(drinks, { '2026-11-11': 500 }, '2026-11-11'), { total: 900, other: 350 });
  assert.deepEqual(dayTotal(drinks, {}, '2026-11-09'), { total: 0, other: 0 });
});

test('líquidos: por tipo junta o total antigo com a água', () => {
  const t = byType(drinks, { '2026-11-11': 500 }, '2026-11-11');
  assert.deepEqual(t.map(x => [x.type, x.ml, x.hydrates]), [['agua', 750], ['alcool', 350], ['cafe', 150]].map(([a, b]) => [a, b, a !== 'alcool']));
});

test('líquidos: semana conta dias na meta e média dos dias com registro', () => {
  const w = weekSeries(drinks, {}, 2000, '2026-11-11'); // quarta
  assert.equal(w.days.length, 7);
  assert.equal(w.days[0].date, '2026-11-09');
  assert.equal(w.metDays, 1);
  assert.equal(w.avg, (2000 + 400) / 2);
  assert.ok(w.days[3].future && !w.days[2].future);
});

test('líquidos: tipo desconhecido vira "Outro"', () => {
  assert.equal(drinkById('xyz').id, 'outro');
});

test('líquidos: quantidade exata em ml ou litros', async () => {
  const { parseAmount } = await import('../src/lib/hydration.js');
  assert.equal(parseAmount('350'), 350);
  assert.equal(parseAmount('1,5', 'L'), 1500);
  assert.equal(parseAmount('0.33', 'l'), 330);
  assert.equal(parseAmount('1,5 L'), 1500);
  assert.equal(parseAmount('473ml', 'L'), 473);
  assert.equal(parseAmount('2 litros'), 2000);
  assert.equal(parseAmount('237,5'), 238);
  assert.ok(Number.isNaN(parseAmount('')));
  assert.ok(Number.isNaN(parseAmount('0')));
  assert.ok(Number.isNaN(parseAmount('abc')));
  assert.ok(Number.isNaN(parseAmount('6', 'L')));
});

test('líquidos: meta por dia preserva os dias anteriores', async () => {
  const { goalOn, withGoal } = await import('../src/lib/hydration.js');
  const log = withGoal([], 2000, 2500, '2026-11-12');
  assert.equal(goalOn(log, 2500, '2026-11-11'), 2000);
  assert.equal(goalOn(log, 2500, '2026-11-12'), 2500);
  const log2 = withGoal(log, 2500, 3000, '2026-11-12'); // mudou de novo no mesmo dia
  assert.equal(log2.length, 2);
  assert.equal(goalOn(log2, 3000, '2026-11-20'), 3000);
  assert.equal(goalOn([], 1800, '2020-01-01'), 1800);
});

test('líquidos: meta sugerida por peso, atividade e clima', async () => {
  const { suggestWaterGoal } = await import('../src/lib/hydration.js');
  assert.equal(suggestWaterGoal({ weightKg: 70, activity: 'leve', climate: 'temperado' }), 2700);
  assert.equal(suggestWaterGoal({ weightKg: 70, activity: 'leve', climate: 'calor' }), 3200);
  assert.equal(suggestWaterGoal({ weightKg: 35 }), 1500);
  assert.equal(suggestWaterGoal({ weightKg: 150, activity: 'extremo', climate: 'calor' }), 4500);
});

test('líquidos: camadas em ordem, sem bebida alcoólica, e faixas limitadas à meta', async () => {
  const { dayLayers, fillBands } = await import('../src/lib/hydration.js');
  const d = '2026-11-12';
  const layers = dayLayers([
    { date: d, type: 'agua', ml: 300, ts: 1 }, { date: d, type: 'agua', ml: 200, ts: 2 }, { date: d, type: 'cafe', ml: 200, ts: 3 },
    { date: d, type: 'alcool', ml: 350, ts: 4 }, { date: d, type: 'suco', ml: 300, ts: 5 }, { date: '2026-11-11', type: 'agua', ml: 999, ts: 0 },
  ], { [d]: 100 }, d);
  assert.deepEqual(layers, [{ type: 'agua', ml: 600 }, { type: 'cafe', ml: 200 }, { type: 'suco', ml: 300 }]);
  const { bands, level } = fillBands(layers, 1000);
  assert.equal(level, 1);
  assert.deepEqual(bands.map(b => [b.type, +b.from.toFixed(2), +b.to.toFixed(2)]), [['agua', 0, .6], ['cafe', .6, .8], ['suco', .8, 1]]);
});

test('líquidos: semana com meta de cada dia e dia de maior consumo', async () => {
  const { weekDetail } = await import('../src/lib/hydration.js');
  const drinks = [{ date: '2026-11-09', type: 'agua', ml: 2200, ts: 1 }, { date: '2026-11-10', type: 'cafe', ml: 500, ts: 1 }, { date: '2026-11-10', type: 'agua', ml: 1000, ts: 2 }];
  const w = weekDetail(drinks, {}, date => (date < '2026-11-10' ? 2000 : 2500), '2026-11-12');
  assert.equal(w.days[0].met, true);
  assert.equal(w.days[1].goal, 2500);
  assert.deepEqual(w.days[1].types, { cafe: 500, agua: 1000 });
  assert.equal(w.metDays, 1);
  assert.equal(w.best.date, '2026-11-09');
  assert.equal(w.total, 3700);
});

test('líquidos: atalhos aprendidos e completados com os padrões', async () => {
  const { shortcuts } = await import('../src/lib/hydration.js');
  const drinks = [1, 2, 3].map(i => ({ date: '2026-11-1' + i, type: 'cafe', ml: 180, ts: i })).concat([{ date: '2026-11-12', type: 'agua', ml: 600, ts: 9 }]);
  const s = shortcuts(drinks, '2026-11-12');
  assert.deepEqual(s[0], { type: 'cafe', ml: 180 });
  assert.equal(s.length, 4);
});

test('líquidos: frase falada vira bebida e volume', async () => {
  const { parseDrinkSpeech } = await import('../src/lib/hydration.js');
  assert.deepEqual(parseDrinkSpeech('Tomei 300 ml de café'), { type: 'cafe', ml: 300 });
  assert.deepEqual(parseDrinkSpeech('meio litro de água'), { type: 'agua', ml: 500 });
  assert.deepEqual(parseDrinkSpeech('dois copos de suco de laranja'), { type: 'suco', ml: 500 });
  assert.deepEqual(parseDrinkSpeech('uma lata de coca zero'), { type: 'zero', ml: 350 });
  assert.deepEqual(parseDrinkSpeech('1,5 litros de água com gás'), { type: 'gas', ml: 1500 });
  assert.equal(parseDrinkSpeech('bebi água'), null);
});
