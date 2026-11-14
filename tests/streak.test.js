import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, dayProgress, validatedBy, isValidDay, weekDays, streakMessage, validDrinks, activeMinutes, graceEnd, flameTier, MILESTONES } from '../src/lib/streak.js';
import { computeXP, levelFor, XP_RULES } from '../src/lib/xp.js';
import { earned, achievementProgress, ACHIEVEMENTS } from '../src/lib/challenges.js';
import { addDays, fromISO } from '../src/lib/dates.js';

const T = '2026-11-13'; // sexta-feira
const OK = { water: 2000, waterGoal: 2000, mealsDone: 0, mealsTotal: 4, activeMin: 0 };
const run = (validDates, opts = {}) => {
  const set = new Set(validDates);
  return computeStreak({ start: opts.start ?? addDays(T, -40), today: T, facts: d => (set.has(d) ? OK : { waterGoal: 2000, mealsTotal: 4 }), config: opts.config });
};
const lastN = n => Array.from({ length: n }, (_, i) => addDays(T, -i));

test('critérios fixos: um deles cumprido por inteiro basta', () => {
  assert.equal(validatedBy({ water: 2000, waterGoal: 2000, mealsTotal: 4 }), 'agua');
  assert.equal(validatedBy({ water: 1999, waterGoal: 2000, mealsDone: 4, mealsTotal: 4 }), 'refeicoes');
  assert.equal(validatedBy({ waterGoal: 2000, mealsTotal: 4, activeMin: 30 }), 'atividade');
  // parcial não vale
  assert.equal(isValidDay({ water: 1500, waterGoal: 2000, mealsDone: 3, mealsTotal: 4, activeMin: 29 }), false);
  // uma refeição isolada não vale
  assert.equal(isValidDay({ waterGoal: 2000, mealsDone: 1, mealsTotal: 4 }), false);
});

test('com restrição médica de líquidos, a hidratação não se aplica', () => {
  const p = dayProgress({ water: 3000, waterGoal: 2000, waterBlocked: true, mealsTotal: 4 });
  assert.equal(p[0].applicable, false); assert.equal(p[0].done, false);
  assert.equal(isValidDay({ water: 3000, waterGoal: 2000, waterBlocked: true, mealsTotal: 4 }), false);
});

test('progresso transparente de cada critério', () => {
  const [w, m, a] = dayProgress({ water: 1500, waterGoal: 2000, mealsDone: 3, mealsTotal: 4, activeMin: 30 });
  assert.equal(Math.round(w.pct * 100), 75); assert.equal(w.done, false);
  assert.deepEqual([m.value, m.target, m.done], [3, 4, false]);
  assert.equal(a.done, true);
});

test('registros válidos: prazo até o fim do dia seguinte', () => {
  const end = graceEnd(T);
  assert.equal(end, fromISO(addDays(T, 2)).getTime() - 1);
  const drinks = [
    { date: T, type: 'agua', ml: 500, ts: end - 1000 },
    { date: T, type: 'agua', ml: 500, ts: end - 1000, createdAt: end + 5000 }, // registrado depois do prazo
  ];
  assert.equal(validDrinks(drinks, T).length, 1);
});

test('registros repetidos contam uma vez', () => {
  const ts = fromISO(T).getTime() + 3600e3;
  const drinks = [{ date: T, type: 'agua', ml: 500, ts }, { date: T, type: 'agua', ml: 500, ts: ts + 20e3 }, { date: T, type: 'agua', ml: 500, ts: ts + 120e3 }];
  assert.equal(validDrinks(drinks, T).length, 2);
  const acts = [
    { date: T, type: 'caminhada', start: '07:00', minutes: 20, status: 'feita', updatedAt: ts },
    { date: T, type: 'caminhada', start: '07:00', minutes: 20, status: 'feita', updatedAt: ts }, // duplicada
    { date: T, type: 'corrida', start: '18:00', minutes: 5, status: 'feita', updatedAt: ts },    // curta demais
    { date: T, type: 'ciclismo', start: '19:00', minutes: 15, status: 'planejada', updatedAt: ts }, // não feita
  ];
  assert.equal(activeMinutes(acts, T), 20);
});

test('hoje pendente não quebra; falta sem proteção zera; o recorde fica', () => {
  const s = run(lastN(5).slice(1));
  assert.equal(s.current, 4); assert.equal(s.days[T], 'pending');
  const s2 = run([...lastN(3), ...Array.from({ length: 5 }, (_, i) => addDays(T, -5 - i))]);
  assert.equal(s2.current, 3); assert.equal(s2.best, 5);
});

test('dias congelados continuam validados mesmo sem os registros', () => {
  const s = computeStreak({ start: addDays(T, -2), today: T, facts: d => (d === T ? OK : { frozen: 'agua', frozenDone: ['agua'] }) });
  assert.equal(s.current, 3); assert.equal(s.by[addDays(T, -2)], 'agua');
});

test('proteção, descanso e pausa', () => {
  const p = run([...lastN(2), ...Array.from({ length: 7 }, (_, i) => addDays(T, -3 - i))]);
  assert.equal(p.days[addDays(T, -2)], 'protected'); assert.equal(p.current, 9);
  const dates = [T, ...Array.from({ length: 4 }, (_, i) => addDays(T, -2 - i))];
  assert.equal(run(dates, { config: { restDays: [4] } }).current, 5);
  assert.equal(run(dates, { config: { pauses: [{ from: addDays(T, -1), to: addDays(T, -1) }] } }).current, 5);
  // no máximo 3 dias de descanso valem
  const all = run([], { config: { restDays: [0, 1, 2, 3, 4, 5, 6] } });
  assert.ok(Object.values(all.days).includes('missed'));
});

test('dias futuros não entram', () => {
  const s = run(lastN(3));
  assert.ok(!Object.keys(s.days).some(d => d > T));
  assert.equal(weekDays(s.days, '2026-11-09', T).at(-1).state, 'future');
});

test('marcos 3, 7, 15, 30, 60 e 100 com medalha e XP', () => {
  assert.deepEqual(MILESTONES, [3, 7, 15, 30, 60, 100]);
  const ids = earned({ mine: [], streak: run(lastN(16)) });
  for (const id of ['primeiro-dia', 'tres-dias', 'uma-semana', 'quinze-dias']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('um-mes'));
  const xps = ['tres-dias', 'uma-semana', 'quinze-dias', 'um-mes', 'dois-meses', 'cem-seguidos'].map(id => ACHIEVEMENTS.find(a => a.id === id).xp);
  assert.deepEqual(xps, [20, 50, 100, 200, 400, 700]);
  assert.deepEqual(achievementProgress({ mine: [], streak: run(lastN(16)) })['um-mes'], { value: 16, target: 30 });
  assert.equal(run(lastN(5)).nextMilestone, 7);
});

test('recordista e superação', () => {
  const s = run([...Array.from({ length: 4 }, (_, i) => addDays(T, -20 - i)), ...lastN(8)]);
  const ids = earned({ mine: [], streak: s });
  assert.ok(ids.includes('recordista') && ids.includes('superacao'));
});

test('XP sem dobrar', () => {
  const days = { [T]: 'done', [addDays(T, -1)]: 'done', [addDays(T, -2)]: 'missed' };
  const r = computeXP({ days, doneOf: d => (d === T ? ['agua', 'atividade', 'agua'] : ['refeicoes']), concluded: ['a', 'a', 'b'], achievements: ['x', 'x', 'y'], xpOf: id => (id === 'y' ? 50 : 25) });
  assert.equal(r.parts.days, 2 * XP_RULES.day);
  assert.equal(r.parts.goals, 3 * XP_RULES.criterion);
  assert.equal(r.parts.challenges, 2 * XP_RULES.challenge);
  assert.equal(r.parts.achievements, 75);
});

test('níveis e chama', () => {
  assert.equal(levelFor(100).name, 'Broto'); assert.equal(levelFor(4000).level, 11);
  assert.deepEqual([0, 6, 7, 30, 100].map(flameTier), [0, 0, 1, 2, 3]);
});

test('mensagens nunca culpam', () => {
  for (const s of [{ current: 0, best: 0 }, { current: 0, best: 9 }, { current: 3, best: 3, todayDone: false }, { current: 12, best: 12, todayDone: true }])
    assert.doesNotMatch(streakMessage(s), /perdeu|falhou|não conseguiu|culpa/i);
});

test('mudar os dias de descanso não muda o passado', () => {
  const dates = [T, ...Array.from({ length: 4 }, (_, i) => addDays(T, -2 - i))]; // falta na quinta (ontem)
  const cfg = { restHistory: [{ from: T, days: [4] }] }; // descanso na quinta escolhido só hoje
  assert.equal(run(dates, { config: cfg }).current, 1);
  assert.equal(run(dates, { config: { restHistory: [{ from: '2000-01-01', days: [4] }] } }).current, 5);
});
