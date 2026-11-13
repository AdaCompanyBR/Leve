import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak, isValidDay, weekDays, streakMessage } from '../src/lib/streak.js';
import { computeXP, levelFor, XP_RULES } from '../src/lib/xp.js';
import { earned, achievementProgress } from '../src/lib/challenges.js';
import { addDays } from '../src/lib/dates.js';

const T = '2026-11-13'; // sexta-feira
const run = (validDates, opts = {}) => {
  const set = new Set(validDates);
  return computeStreak({ start: opts.start ?? addDays(T, -40), today: T, facts: d => (set.has(d) ? { meals: 1 } : null), config: opts.config });
};
const lastN = n => Array.from({ length: n }, (_, i) => addDays(T, -i));

test('um critério basta; nenhum é obrigatório', () => {
  assert.equal(isValidDay({ meals: 1 }), true);
  assert.equal(isValidDay({ waterMet: true }), true);
  assert.equal(isValidDay({ activity: true }), true);
  assert.equal(isValidDay({ routineHalf: true }), true);
  assert.equal(isValidDay({}), false);
  assert.equal(isValidDay({ meals: 1 }, { meal: false, water: true }), false);
  assert.equal(isValidDay({ challengeDone: true }, { meal: false, water: false, activity: false, routine: false }), true);
});

test('dias seguidos contam; hoje sem registro fica pendente e não quebra', () => {
  const s = run(lastN(5).slice(1)); // ontem e 3 dias antes, hoje ainda não
  assert.equal(s.current, 4);
  assert.equal(s.days[T], 'pending');
  assert.equal(s.todayDone, false);
  const s2 = run(lastN(5));
  assert.equal(s2.current, 5); assert.equal(s2.todayDone, true);
});

test('um dia perdido sem proteção zera; o recorde fica', () => {
  const dates = [...lastN(3), ...Array.from({ length: 5 }, (_, i) => addDays(T, -5 - i))]; // 5 dias, 1 falta, 3 dias
  const s = run(dates);
  assert.equal(s.current, 3);
  assert.equal(s.best, 5);
  assert.equal(s.days[addDays(T, -3)], 'missed');
});

test('proteção: a cada 7 dias, cobre um dia perdido', () => {
  const dates = [...lastN(2), ...Array.from({ length: 7 }, (_, i) => addDays(T, -3 - i))]; // 7 dias, 1 falta, 2 dias
  const s = run(dates);
  assert.equal(s.days[addDays(T, -2)], 'protected');
  assert.equal(s.current, 9);
  assert.equal(s.shields, 0);
});

test('descanso e pausa são neutros', () => {
  // T é sexta (5). Descanso na quinta (4): falta na quinta não quebra.
  const dates = [T, ...Array.from({ length: 4 }, (_, i) => addDays(T, -2 - i))];
  assert.equal(run(dates, { config: { restDays: [4] } }).current, 5);
  assert.equal(run(dates).current, 1);
  const paused = run(dates, { config: { pauses: [{ from: addDays(T, -1), to: addDays(T, -1) }] } });
  assert.equal(paused.days[addDays(T, -1)], 'paused');
  assert.equal(paused.current, 5);
});

test('cada data conta uma vez, mesmo com vários registros', () => {
  const s = computeStreak({ start: addDays(T, -2), today: T, facts: () => ({ meals: 9, waterMet: true, activity: true, routineHalf: true }) });
  assert.equal(s.current, 3); assert.equal(s.totalActive, 3);
});

test('dias futuros não entram', () => {
  const s = run(lastN(3));
  assert.ok(!Object.keys(s.days).some(d => d > T));
  const w = weekDays(s.days, '2026-11-09', T);
  assert.equal(w.at(-1).state, 'future');
  assert.equal(w[4].state, 'done');
});

test('recordista e superação', () => {
  // 4 dias, quebra, depois 8 dias seguidos até hoje
  const first = Array.from({ length: 4 }, (_, i) => addDays(T, -20 - i));
  const s = run([...first, ...lastN(8)]);
  assert.ok(s.recordBeatenOn); // passou de 4
  assert.ok(s.comebackOn);     // 7 dias depois de interromper
  assert.ok(earned({ mine: [], streak: s }).includes('recordista'));
  assert.ok(earned({ mine: [], streak: s }).includes('superacao'));
});

test('semanas consistentes', () => {
  const s = run(lastN(30));
  assert.ok(s.consistentWeeks >= 4);
  assert.equal(run([]).consistentWeeks, 0);
});

test('conquistas de ofensiva e andamento', () => {
  const s = run(lastN(8));
  const ids = earned({ mine: [], streak: s });
  assert.ok(ids.includes('primeiro-dia') && ids.includes('uma-semana'));
  assert.ok(!ids.includes('duas-semanas'));
  assert.deepEqual(achievementProgress({ mine: [], streak: s })['duas-semanas'], { value: 8, target: 14 });
});

test('XP: regras transparentes, sem dobrar', () => {
  const days = { [T]: 'done', [addDays(T, -1)]: 'done', [addDays(T, -2)]: 'missed' };
  const facts = d => (d === T ? { waterMet: true, activity: true } : {});
  const r = computeXP({ days, facts, concluded: ['a', 'a', 'b'], achievements: ['x', 'x'] });
  assert.equal(r.parts.days, 2 * XP_RULES.day);
  assert.equal(r.parts.goals, XP_RULES.water + XP_RULES.activity);
  assert.equal(r.parts.challenges, 2 * XP_RULES.challenge);
  assert.equal(r.parts.achievements, XP_RULES.achievement);
  assert.equal(computeXP({}).xp, 0);
});

test('níveis', () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(99).level, 1);
  assert.equal(levelFor(100).level, 2);
  assert.equal(levelFor(100).name, 'Broto');
  assert.equal(levelFor(3200).level, 10);
  assert.equal(levelFor(4000).level, 11);
  const l = levelFor(175); assert.equal(l.inLevel, 75); assert.equal(l.span, 150);
});

test('mensagens nunca culpam', () => {
  for (const s of [{ current: 0, best: 0 }, { current: 0, best: 9 }, { current: 3, best: 3, todayDone: false }, { current: 12, best: 12, todayDone: true }])
    assert.doesNotMatch(streakMessage(s), /perdeu|falhou|não conseguiu|culpa/i);
});
