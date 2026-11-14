import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateGarden, stageOf, SPECIAL_TREES, seasonOf, mergeHistory } from '../src/lib/garden.js';
import { addDays } from '../src/lib/dates.js';

const T = '2026-11-14';
// Monta os estados a partir de uma string: d = regada, x = dia sem validação, r = descanso, p = pausa.
const build = (pattern, end = T) => {
  const days = {}; const n = pattern.length;
  [...pattern].forEach((c, i) => { days[addDays(end, i - n + 1)] = { d: 'done', x: 'missed', r: 'rest', p: 'paused', o: 'pending', s: 'protected' }[c]; });
  return { days, start: addDays(end, -n + 1) };
};
const sim = (pattern, doneOf) => { const { days, start } = build(pattern); return simulateGarden({ start, today: T, days, doneOf }); };

test('estágios pelas regadas', () => {
  assert.equal(stageOf(1).id, 'germinacao'); assert.equal(stageOf(3).id, 'germinacao');
  assert.equal(stageOf(4).id, 'broto'); assert.equal(stageOf(8).id, 'desenvolvimento');
  assert.equal(stageOf(16).id, 'fortalecimento'); assert.equal(stageOf(31).id, 'florescimento');
  assert.equal(stageOf(61).id, 'madura'); assert.equal(stageOf(101).id, 'extraordinaria');
});

test('cada dia completo sem regada tira 10 pontos; o prazo protege ontem', () => {
  const g = sim('ddddd' + 'xxx' + 'xo'); // 5 regadas, 3 dias fechados sem regada, ontem em aberto, hoje
  assert.equal(g.current.vitality, 70);
  assert.equal(g.current.daysLeft, 7);
  assert.equal(g.yesterdayOpen, true);
});

test('10 dias completos sem regada: a árvore seca de vez e a próxima regada planta outra', () => {
  const g = sim('ddd' + 'x'.repeat(10) + 'x' + 'd');
  assert.equal(g.trees.length, 2);
  assert.ok(g.trees[0].died);
  assert.equal(g.trees[0].vitality, 0);
  assert.equal(g.current.planted, T);
  assert.equal(g.current.waterings, 1);
});

test('recuperação: +10 por regada, até 100, sem perder o estágio', () => {
  const g = sim('d'.repeat(10) + 'xxxxxx' + 'ddd'); // 10 regadas, 6 dias fechados sem regada (40%), volta 3 regadas
  assert.equal(g.current.vitality, 70);
  assert.equal(g.current.waterings, 13);
  assert.equal(g.current.stage.id, 'desenvolvimento');
});

test('descanso, pausa e proteção não tiram vitalidade', () => {
  const g = sim('ddd' + 'rrppss' + 'xd');
  assert.equal(g.current.vitality, 100);
});

test('árvores especiais: permanentes, com data', () => {
  const g = sim('d'.repeat(31), () => ['agua']);
  assert.ok(g.special.constancia && g.special.vitalidade);
  assert.ok(!g.special.nutricao);
  // Superação: cair a 30% ou menos e voltar a 100%
  const s = sim('d' + 'x'.repeat(8) + 'd'.repeat(8)); // cai a 20% e volta a 100%
  assert.ok(s.special.superacao);
  assert.equal(SPECIAL_TREES.length, 6);
});

test('histórico guarda as árvores secas', () => {
  const g = sim('ddd' + 'x'.repeat(11) + 'd');
  const map = mergeHistory(g.trees, { t20250101: { planted: '2025-01-01', died: '2025-02-01', waterings: 9 } });
  assert.equal(map.size, 2);
});

test('estações do hemisfério sul', () => {
  assert.equal(seasonOf('2026-11-14'), 'primavera'); assert.equal(seasonOf('2026-01-10'), 'verao');
  assert.equal(seasonOf('2026-04-10'), 'outono'); assert.equal(seasonOf('2026-07-10'), 'inverno');
});
