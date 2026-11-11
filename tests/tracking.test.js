import test from 'node:test';
import assert from 'node:assert/strict';
import { trendSeries } from '../src/lib/trend.js';
import { weekBudget } from '../src/lib/budget.js';
import { estimateTdee, shouldPropose } from '../src/lib/adaptive.js';
import { addDays, weekStart, diffDays } from '../src/lib/dates.js';

test('datas: semana começa na segunda', () => {
  assert.equal(weekStart('2026-11-11'), '2026-11-09'); // quarta -> segunda
  assert.equal(weekStart('2026-11-15'), '2026-11-09'); // domingo
  assert.equal(addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(diffDays('2026-01-01', '2026-01-15'), 14);
});

test('peso tendência suaviza a oscilação', () => {
  const s = trendSeries([{ date: '2026-01-01', kg: 80 }, { date: '2026-01-02', kg: 81 }, { date: '2026-01-03', kg: 79.5 }]);
  assert.equal(s[0].trend, 80);
  assert.ok(Math.abs(s[1].trend - 80.1) < 1e-9);
  assert.ok(Math.abs(s[2].trend - (80.1 + 0.1 * (79.5 - 80.1))) < 1e-9);
});

test('peso tendência: intervalo maior pesa mais', () => {
  const s = trendSeries([{ date: '2026-01-04', kg: 79 }, { date: '2026-01-01', kg: 80 }]);
  assert.equal(s[0].date, '2026-01-01');
  assert.ok(Math.abs(s[1].trend - (80 - (1 - 0.9 ** 3))) < 1e-9);
});

test('orçamento semanal: excesso é diluído nos dias restantes', () => {
  // quarta-feira; segunda comeu 2600 com meta 2000
  const b = weekBudget({ dailyTarget: 2000, floor: 1500, today: '2026-11-11', intakeByDate: { '2026-11-09': 2600, '2026-11-11': 500 } });
  assert.equal(b.weekly, 14000);
  assert.equal(b.carry, 600);
  assert.equal(b.daysLeft, 5);
  assert.equal(b.todayTarget, 1880);
  assert.equal(b.spent, 2600 + 2000 + 500); // terça sem registro conta como na meta
  assert.equal(b.balance, 14000 - 5100);
});

test('orçamento semanal respeita o piso', () => {
  const b = weekBudget({ dailyTarget: 1600, floor: 1500, today: '2026-11-15', intakeByDate: { '2026-11-14': 3000 } });
  assert.equal(b.todayTarget, 1500);
});

test('orçamento semanal: comer menos não vira crédito extra', () => {
  const b = weekBudget({ dailyTarget: 2000, floor: 1500, today: '2026-11-10', intakeByDate: { '2026-11-09': 1200 } });
  assert.equal(b.todayTarget, 2000);
  assert.equal(b.adjusted, false);
});

function scenario(days, intake, kgPerDay) {
  const weights = [], intakeByDate = {};
  for (let i = 0; i <= days; i++) {
    const d = addDays('2026-10-01', i);
    weights.push({ date: d, kg: 80 + kgPerDay * i });
    intakeByDate[d] = intake;
  }
  return { weights, intakeByDate, today: addDays('2026-10-01', days) };
}

test('gasto adaptativo: precisa de 14 dias', () => {
  const { weights, intakeByDate, today } = scenario(10, 2000, -0.05);
  assert.equal(estimateTdee({ series: trendSeries(weights), intakeByDate, today }), null);
});

test('gasto adaptativo: fórmula (ingestão - variação x 7700) / dias', () => {
  const { weights, intakeByDate, today } = scenario(21, 2000, -0.05);
  const series = trendSeries(weights);
  const e = estimateTdee({ series, intakeByDate, today });
  const delta = series.at(-1).trend - series[0].trend;
  assert.equal(e.days, 21);
  assert.equal(e.tdee, Math.round(2000 - (delta * 7700) / 21));
  assert.ok(e.tdee > 2000); // perdeu peso comendo 2000 -> gasta mais que 2000
});

test('gasto adaptativo: poucos dias registrados não geram estimativa', () => {
  const { weights, intakeByDate, today } = scenario(21, 2000, -0.05);
  for (let i = 0; i < 12; i++) delete intakeByDate[addDays('2026-10-01', i)];
  assert.equal(estimateTdee({ series: trendSeries(weights), intakeByDate, today }), null);
});

test('só propõe nova meta com diferença de 5% ou mais', () => {
  assert.equal(shouldPropose({ tdee: 2050 }, 2000), false);
  assert.equal(shouldPropose({ tdee: 2200 }, 2000), true);
  assert.equal(shouldPropose(null, 2000), false);
});
