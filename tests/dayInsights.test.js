import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayInsights } from '../src/lib/dayInsights.js';

const base = {
  hour: 12, totals: { kcal: 0, p: 0, c: 0, f: 0 }, target: 2000, macros: { protein: 100, carbs: 250, fat: 60 },
  mealsLogged: [], entries: 0, liquids: { ml: 0, goal: 2000 }, activity: { minutes: 0, count: 0, planned: 0 },
  weather: null, daysLogged: 0, fluidRestriction: false,
};
const ids = d => dayInsights({ ...base, ...d }).map(x => x.id);

test('sem dados de manhã cedo, nada aparece', () => {
  assert.deepEqual(ids({ hour: 8 }), []);
});

test('sem refeição depois das 10h, avisa', () => {
  assert.ok(ids({ hour: 11 }).includes('sem-refeicao'));
});

test('proteína atrás do ritmo das calorias', () => {
  const r = ids({ entries: 3, mealsLogged: ['cafe', 'almoco'], totals: { kcal: 1200, p: 20, c: 150, f: 40 } });
  assert.ok(r.includes('proteina'));
});

test('proteína em dia não gera aviso', () => {
  const r = ids({ entries: 3, mealsLogged: ['cafe', 'almoco'], totals: { kcal: 1200, p: 60, c: 140, f: 40 } });
  assert.ok(!r.includes('proteina'));
});

test('calor com restrição de líquidos não manda beber mais', () => {
  const r = dayInsights({ ...base, hour: 9, weather: { max: 34 }, fluidRestriction: true });
  const heat = r.find(x => x.id === 'calor');
  assert.match(heat.text, /médico/);
  assert.ok(!r.some(x => x.id === 'agua-baixa'));
});

test('água baixa à tarde e meta batida', () => {
  assert.ok(ids({ hour: 17, liquids: { ml: 400, goal: 2000 } }).includes('agua-baixa'));
  assert.ok(ids({ hour: 17, liquids: { ml: 2100, goal: 2000 } }).includes('agua-ok'));
});

test('no máximo quatro, sem repetir', () => {
  const r = dayInsights({ ...base, hour: 18, entries: 5, mealsLogged: ['cafe', 'almoco', 'lanches'], totals: { kcal: 2300, p: 20, c: 150, f: 120 },
    liquids: { ml: 200, goal: 2000 }, activity: { minutes: 30, count: 1 }, weather: { max: 33 }, daysLogged: 6 });
  assert.ok(r.length <= 4);
  assert.equal(new Set(r.map(x => x.id)).size, r.length);
});

test('regularidade só com 5 dias ou mais', () => {
  assert.ok(!ids({ hour: 8, daysLogged: 4 }).includes('regular'));
  assert.ok(ids({ hour: 8, daysLogged: 5 }).includes('regular'));
});
