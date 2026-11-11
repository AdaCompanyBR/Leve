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
