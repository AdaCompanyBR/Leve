import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHALLENGES, challengeById, sources, evaluate, countedDates, adaptiveSuggestion, defaultTarget, startBlock, recommend, campaignFor, earned, trend, near } from '../src/lib/challenges.js';
import { addDays } from '../src/lib/dates.js';

const TODAY = '2026-11-30';
const day = n => addDays(TODAY, -n);
const ts = (date, h) => new Date(`${date}T${String(h).padStart(2, '0')}:00:00`).getTime();
const FOODS = {
  alface: { id: 'alface', n: 'Alface, crespa, crua', g: 'Verduras, hortaliças e derivados', fb: 1.8 },
  tomate: { id: 'tomate', n: 'Tomate, com semente, cru', g: 'Verduras, hortaliças e derivados', fb: 1.2 },
  banana: { id: 'banana', n: 'Banana, prata, crua', g: 'Frutas e derivados', fb: 2 },
  suco: { id: 'suco', n: 'Laranja, baía, suco', g: 'Frutas e derivados', fb: 0 },
  arroz: { id: 'arroz', n: 'Arroz, integral, cozido', g: 'Cereais e derivados', fb: 2.7 },
  feijao: { id: 'feijao', n: 'Feijão, carioca, cozido', g: 'Leguminosas e derivados', fb: 8.5 },
  frango: { id: 'frango', n: 'Frango, peito, grelhado', g: 'Carnes e derivados', fb: 0 },
};
const src = (o = {}) => sources({ goalFor: () => 2000, foodById: id => FOODS[id], ...o });
const uc = (id, startDate, target, extra = {}) => ({ id: 'u1', challengeId: id, startDate, target, status: 'ativo', pauses: [], ...extra });

test('catálogo: 15 desafios, todos com sobre, dicas, benefícios e medição', () => {
  assert.equal(CHALLENGES.length, 15);
  for (const c of CHALLENGES) {
    assert.ok(c.about && c.goal && c.how && c.measure, c.id);
    assert.ok(c.tips.length >= 3 && c.benefits.length >= 1, c.id);
    assert.ok([7, 14, 21].includes(c.days), c.id);
    assert.doesNotMatch(`${c.about} ${c.goal} ${c.tips.join(' ')}`, /jejum|dieta restritiva|suplement|perder \d+ ?kg/i, c.id);
  }
});

test('hidratação 21: usa os registros da aba Líquidos e a meta individual do dia', () => {
  const drinks = [];
  for (let i = 0; i < 10; i++) drinks.push({ id: 'd' + i, date: day(i), type: 'agua', ml: i % 2 ? 2100 : 1500, ts: ts(day(i), 9) });
  const s = src({ drinks, goalFor: d => (d < day(5) ? 2000 : 1500) });
  const ev = evaluate(challengeById('agua-21'), uc('agua-21', day(9), 1), s, TODAY);
  // dias 5–9 com meta 2000: só os de 2100 contam (i ímpar: 9, 7, 5); dias 0–4 com meta 1500: todos contam
  assert.equal(ev.completed, 8); assert.equal(ev.needed, 21); assert.equal(ev.done, false); assert.equal(ev.remaining, 13);
  // com 80%: nos dias de meta 2000 ainda é preciso 1600 (1500 não conta); nos de 1500, basta 1200
  const ev80 = evaluate(challengeById('agua-21'), uc('agua-21', day(9), 0.8), s, TODAY);
  assert.equal(ev80.completed, 8); assert.equal(ev80.days.find(x => x.date === day(0)).target, 1200);
});

test('o prazo não conclui nada; só o critério conclui', () => {
  const ev = evaluate(challengeById('agua-pura-7'), uc('agua-pura-7', day(20), null), src(), TODAY);
  assert.equal(ev.completed, 0); assert.equal(ev.done, false);
  const drinks = Array.from({ length: 7 }, (_, i) => ({ id: 'w' + i, date: day(i * 2), type: 'gas', ml: 200, ts: 1 }));
  const ok = evaluate(challengeById('agua-pura-7'), uc('agua-pura-7', day(20), null), src({ drinks }), TODAY);
  assert.equal(ok.completed, 7); assert.equal(ok.done, true, 'dias não precisam ser seguidos');
});

test('hidratação consciente: manhã, tarde e noite', () => {
  const d0 = day(0);
  const drinks = [[8, 'agua'], [14, 'cafe'], [20, 'cha']].map(([h, type], i) => ({ id: 'p' + i, date: d0, type, ml: 200, ts: ts(d0, h) }));
  const ev = evaluate(challengeById('agua-ritmo-14'), uc('agua-ritmo-14', d0, null), src({ drinks }), TODAY);
  assert.equal(ev.days[0].done, true); assert.equal(ev.days[0].value, 3);
  const ev2 = evaluate(challengeById('agua-ritmo-14'), uc('agua-ritmo-14', d0, null), src({ drinks: drinks.slice(0, 2) }), TODAY);
  assert.equal(ev2.days[0].done, false);
});

test('alimentação: verduras distintas, frutas frescas (sem suco), grupos e fibras proporcionais', () => {
  const d0 = day(0);
  const e = (foodId, grams, meal = 'almoco') => ({ date: d0, foodId, grams, meal });
  const entries = [e('alface', 50), e('tomate', 80), e('suco', 200, 'cafe'), e('arroz', 150), e('feijao', 140), e('frango', 120, 'jantar')];
  const s = src({ entries, kcalTarget: 1500 });
  assert.equal(evaluate(challengeById('prato-colorido-7'), uc('prato-colorido-7', d0), s, TODAY).days[0].done, true);
  assert.equal(evaluate(challengeById('frutas-7'), uc('frutas-7', d0), s, TODAY).days[0].done, false, 'suco não conta');
  assert.equal(evaluate(challengeById('frutas-7'), uc('frutas-7', d0), src({ entries: [...entries, e('banana', 85, 'lanches')] }), TODAY).days[0].done, true);
  assert.equal(evaluate(challengeById('variedade-21'), uc('variedade-21', d0), s, TODAY).days[0].value, 5);
  const fib = evaluate(challengeById('fibras-14'), uc('fibras-14', d0), s, TODAY).days[0];
  assert.equal(fib.target, 21); assert.equal(fib.value, 18); assert.equal(fib.done, false);
});

test('alimentação consciente exige a pergunta do dia', () => {
  const d0 = day(0);
  const entries = ['cafe', 'almoco', 'jantar'].map(meal => ({ date: d0, foodId: 'arroz', grams: 100, meal }));
  const def = challengeById('consciente-7');
  assert.equal(evaluate(def, uc('consciente-7', d0), src({ entries }), TODAY).days[0].done, false);
  assert.equal(evaluate(def, uc('consciente-7', d0), src({ entries, checkins: { [d0]: { mindful: 'satisfeito' } } }), TODAY).days[0].done, true);
});

test('atividade: minutos do dia, caminhada acumulada e variedade de tipos', () => {
  const a = (date, type, minutes, status = 'feita', intensity = 'moderada') => ({ id: date + type, date, type, minutes, status, intensity });
  const acts = [a(day(0), 'caminhada', 20), a(day(1), 'caminhada', 10), a(day(2), 'corrida', 30, 'planejada')];
  const s = src({ activities: acts });
  const mov = evaluate(challengeById('movimento-7'), uc('movimento-7', day(2), 15), s, TODAY);
  assert.deepEqual(mov.days.map(x => x.done), [false, false, true], 'planejada não conta; 10 < 15');
  const walk = evaluate(challengeById('caminhada-14'), uc('caminhada-14', day(2), 90), s, TODAY);
  assert.equal(walk.sum, 30); assert.equal(walk.pct, 33); assert.equal(walk.done, false);
  const many = Array.from({ length: 9 }, (_, i) => a(day(i), 'caminhada', 20));
  const body = evaluate(challengeById('corpo-21'), uc('corpo-21', day(10), 9), src({ activities: many }), TODAY);
  assert.equal(body.completed, 9); assert.equal(body.done, false); assert.match(body.missing, /2 tipos/);
  const mixed = [...many, a(day(9), 'ciclismo', 30)];
  assert.equal(evaluate(challengeById('corpo-21'), uc('corpo-21', day(10), 9), src({ activities: mixed }), TODAY).done, true);
});

test('sono, telas, pausas e recuperação pelo registro rápido', () => {
  const d0 = day(0);
  const chk = { [d0]: { sleep: { bed: '23:20', wake: '07:10' }, screens: 40, pauses: 3, body: 'cansado' } };
  const t = { bed: '23:00', wake: '07:00' };
  assert.equal(evaluate(challengeById('sono-14'), uc('sono-14', d0, t), src({ checkins: chk }), TODAY).days[0].done, true);
  assert.equal(evaluate(challengeById('sono-14'), uc('sono-14', d0, { bed: '22:00', wake: '07:00' }), src({ checkins: chk }), TODAY).days[0].done, false);
  assert.ok(near('23:50', '00:20'), 'atravessa a meia-noite');
  assert.equal(evaluate(challengeById('desconecte-7'), uc('desconecte-7', d0, 30), src({ checkins: chk }), TODAY).days[0].done, true);
  assert.equal(evaluate(challengeById('pausas-7'), uc('pausas-7', d0, 4), src({ checkins: chk }), TODAY).days[0].done, false);
  const intense = [{ id: 'x', date: d0, type: 'corrida', minutes: 30, status: 'feita', intensity: 'intensa' }];
  assert.equal(evaluate(challengeById('recuperacao-7'), uc('recuperacao-7', d0), src({ checkins: chk, activities: intense }), TODAY).days[0].done, false);
  assert.equal(evaluate(challengeById('recuperacao-7'), uc('recuperacao-7', d0), src({ checkins: chk }), TODAY).days[0].done, true);
});

test('pausa: os dias em pausa não contam; histórico preservado', () => {
  const c = uc('agua-pura-7', day(9), null, { pauses: [{ from: day(6), to: day(3) }] });
  assert.equal(countedDates(c, TODAY).length, 7);
  assert.ok(!countedDates(c, TODAY).includes(day(5)));
});

test('adaptativo: só sugere meta mais leve, depois de 7 dias com menos de 40%', () => {
  const def = challengeById('movimento-7');
  const acts = [{ id: 'a', date: day(0), type: 'caminhada', minutes: 25, status: 'feita' }];
  const c = uc('movimento-7', day(9), 20);
  const ev = evaluate(def, c, src({ activities: acts }), TODAY);
  assert.deepEqual(adaptiveSuggestion(def, c, ev), { target: 15, label: '15 min' });
  const hyd = challengeById('agua-21'), ch = uc('agua-21', day(9), 1);
  assert.deepEqual(adaptiveSuggestion(hyd, ch, evaluate(hyd, ch, src(), TODAY)), { target: 0.8, label: '80% da meta' });
  assert.equal(adaptiveSuggestion(def, uc('movimento-7', day(3), 20), evaluate(def, uc('movimento-7', day(3), 20), src(), TODAY)), null, 'cedo demais');
});

test('metas individuais a partir do perfil e bloqueios de saúde', () => {
  assert.equal(defaultTarget(challengeById('movimento-7'), { activity: 'sedentario' }), 10);
  assert.deepEqual(defaultTarget(challengeById('sono-14'), { wake: '06:30' }), { bed: '22:30', wake: '06:30' });
  assert.match(startBlock(challengeById('agua-21'), { restricted: true }), /orientação do seu médico/);
  assert.equal(startBlock(challengeById('agua-pura-7'), { restricted: true }), null);
  assert.match(startBlock(challengeById('fibras-14'), { kcalTarget: null }), /nutricionista/);
});

test('recomendações só com dados; sem dados, nenhuma', () => {
  assert.deepEqual(recommend({ src: src(), today: TODAY }), []);
  const drinks = Array.from({ length: 5 }, (_, i) => ({ id: 'r' + i, date: day(i + 1), type: 'agua', ml: 800, ts: 1 }));
  const r = recommend({ src: src({ drinks }), today: TODAY });
  assert.equal(r[0].id, 'agua-21'); assert.match(r[0].why, /5 dos últimos 14 dias/);
  assert.ok(!recommend({ src: src({ drinks }), today: TODAY, restricted: true }).some(x => x.id === 'agua-21'));
});

test('campanhas sazonais: ativa e próxima', () => {
  assert.equal(campaignFor('2026-04-10').title, 'Mês do Movimento'); assert.equal(campaignFor('2026-04-10').active, true);
  const next = campaignFor('2026-11-13');
  assert.equal(next.active, false); assert.equal(next.start, '2026-12-01'); assert.equal(next.inDays, 18);
});

test('conquistas só por conclusão real', () => {
  const mine = [{ id: 'a', challengeId: 'agua-21', status: 'ativo' }];
  assert.deepEqual(earned({ mine, evals: { a: { completed: 3 } } }), []);
  assert.deepEqual(earned({ mine, evals: { a: { completed: 8 } } }), ['persistencia']);
  const done = [{ id: 'b', challengeId: 'agua-21', status: 'concluido', final: { completed: 21 } }];
  assert.deepEqual(earned({ mine: done, evals: {} }).sort(), ['consistencia', 'hidratacao', 'persistencia', 'primeiros-passos'].sort());
});

test('evolução: compara as duas últimas semanas', () => {
  const mk = arr => arr.map(done => ({ done }));
  assert.equal(trend(mk([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1].map(Boolean))), 'subindo');
  assert.equal(trend(mk([1, 1, 1].map(Boolean))), null);
});
