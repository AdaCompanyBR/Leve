import test from 'node:test';
import assert from 'node:assert/strict';
import { mealSchedule, habits, buildRoutine, dayStatus, weekCount } from '../src/lib/routine.js';
import { plan } from '../src/lib/calc.js';

test('rotina: horários a partir da hora de acordar, com almoço e jantar em horas comuns', () => {
  const s = mealSchedule({ meals: 5, wake: '06:00', target: 2000, protein: 120 });
  assert.deepEqual(s.map(x => [x.id, x.time]), [['cafe', '06:30'], ['lanche-manha', '09:00'], ['almoco', '11:30'], ['lanche-tarde', '15:00'], ['jantar', '18:30']]);
  assert.equal(s.reduce((a, x) => a + x.kcal, 0), 2000);
  assert.equal(s.find(x => x.id === 'almoco').protein, 42);
  const tarde = mealSchedule({ meals: 3, wake: '09:00' });
  assert.deepEqual(tarde.map(x => x.time), ['09:30', '13:30', '21:30']);
  assert.equal(tarde[0].kcal, null);
});

test('rotina: hábitos mudam com o objetivo', () => {
  const ids = goal => habits({ goal, protein: 100 }).map(h => h.id);
  assert.ok(ids('ganhar').includes('forca') && ids('ganhar').includes('refeicoes'));
  assert.ok(!ids('ganhar').includes('vegetais'));
  assert.ok(ids('perder').includes('movimento'));
  assert.ok(ids('saude').includes('natura') && !ids('saude').includes('proteina'));
});

test('rotina: o que o app marca sozinho', () => {
  const profile = { sex: 'f', birthDate: '1990-01-01', heightCm: 165, weightKg: 70, activity: 'leve', pace: 'moderado', goal: 'ganhar', gainPace: 'suave', meals: 4, wake: '07:00' };
  const r = buildRoutine({ profile, plan: plan(profile, '2026-11-12'), waterGoal: 2000 });
  const st = dayStatus(r, {
    entries: [{ meal: 'cafe', ts: 1 }, { meal: 'almoco', ts: 2 }, { meal: 'lanches', ts: 3 }],
    water: 2100, waterGoal: 2000, protein: 50, proteinGoal: r.habits.find(h => h.id === 'proteina') ? 117 : null, weighed: false, checks: { forca: true },
  });
  assert.deepEqual(st.schedule.map(s => s.done), [true, true, true, false]);
  const h = Object.fromEntries(st.habits.map(x => [x.id, x.done]));
  assert.equal(h.agua, true);
  assert.equal(h.proteina, false);
  assert.equal(h.refeicoes, false);
  assert.equal(h.forca, true);
  assert.equal(st.total, st.schedule.length + st.habits.length);
});

test('rotina: contagem da semana vai de segunda até o dia', () => {
  const feitos = new Set(['2026-11-09', '2026-11-11', '2026-11-13']);
  assert.equal(weekCount(d => feitos.has(d), '2026-11-12'), 2); // quinta: conta seg e qua
});
