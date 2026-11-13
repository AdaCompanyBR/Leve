import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext } from '../src/lib/environment.js';
import { assessActivity, afterAdvice, nextActivity, windowHours } from '../src/lib/activity.js';
import { foodTips } from '../src/lib/foodContext.js';
import { dayRecord, insights } from '../src/lib/envHistory.js';
import { dayStatus, habits } from '../src/lib/routine.js';
import { forecast, NOW, curve } from './fixtures.js';

const ctxOf = opts => buildContext({ forecast: forecast(opts), now: NOW });
// Dia quente: sensação de 39 °C às 14h-15h, UV 9 ao meio-dia; madrugada e fim de tarde mais frescos.
const hot = { feels: curve(22, 39, 14, 7), uv: (d, h) => Math.max(0, 9 - Math.abs(h - 12) * 1.6) };
const run = (extra = {}) => ({ type: 'corrida', date: '2026-11-13', start: '14:00', minutes: 45, intensity: 'intensa', outdoor: true, ...extra });

test('corrida às 14h no calor: desfavorável, com horário melhor sugerido e sem bloquear', () => {
  const a = assessActivity(ctxOf(hot), run());
  assert.equal(a.level, 'danger');
  assert.match(a.text, /^Condições desfavoráveis para corrida neste horário: sensação térmica de até \d+ °C/);
  assert.match(a.text, /Considere transferir para das \d+h às \d+h/);
  assert.ok(a.better.length >= 1);
  assert.ok(a.tips.some(t => /água/.test(t)));
});

test('sem horário melhor hoje, sugere a janela do dia seguinte', () => {
  // A partir das 9h fica quente até o fim do dia; o dia seguinte começa fresco.
  const ctx = ctxOf({ feels: (d, h) => (d === 1 ? (h >= 9 ? 37 : 24) : h <= 9 ? 22 : 34), uv: () => 1 });
  const a = assessActivity(ctx, run());
  assert.equal(a.better.length, 0); assert.ok(a.tomorrow.length >= 1);
  assert.match(a.text, /Considere o dia seguinte, das 5h às/);
});

test('a intensidade muda o nível: caminhada leve no mesmo horário fica em atenção', () => {
  const ctx = buildContext({ forecast: forecast({ feels: curve(22, 34, 14, 7) }), now: NOW });
  assert.equal(assessActivity(ctx, run()).level, 'danger');
  assert.equal(assessActivity(ctx, run({ type: 'caminhada', intensity: 'leve' })).level, 'warn');
});

test('UV alto pesa sozinho, sem calor', () => {
  const ctx = ctxOf({ feels: () => 22, uv: (d, h) => (h >= 10 && h <= 14 ? 9 : 1) });
  const a = assessActivity(ctx, run({ start: '11:00', intensity: 'leve', type: 'caminhada' }));
  assert.equal(a.level, 'warn'); assert.match(a.text, /índice UV de até 9/);
  assert.ok(a.tips.some(t => /Protetor solar/.test(t)));
});

test('duração longa no calor moderado vira atenção; janela cobre todas as horas', () => {
  const ctx = ctxOf({ feels: () => 28 });
  assert.equal(assessActivity(ctx, run({ type: 'caminhada', intensity: 'leve', minutes: 30 })).level, 'ok');
  assert.equal(assessActivity(ctx, run({ type: 'caminhada', intensity: 'leve', minutes: 75 })).level, 'warn');
  assert.deepEqual(windowHours(ctx, run({ start: '06:30', minutes: 90 })).map(h => h.hour), [6, 7]);
});

test('tempestade, vento forte para ciclismo e chance de chuva', () => {
  assert.equal(assessActivity(ctxOf({ code: (d, h) => (h === 14 ? 95 : 2) }), run({ intensity: 'leve', type: 'caminhada' })).level, 'danger');
  assert.equal(assessActivity(ctxOf({ gust: () => 70 }), run({ type: 'ciclismo', intensity: 'moderada' })).level, 'danger');
  assert.equal(assessActivity(ctxOf({ gust: () => 70 }), run({ type: 'caminhada', intensity: 'leve' })).level, 'warn');
  const rainy = assessActivity(ctxOf({ feels: () => 20, rainProb: () => 70 }), run({ type: 'caminhada', intensity: 'leve' }));
  assert.equal(rainy.level, 'caution'); assert.match(rainy.text, /70% de chance de chuva/);
});

test('sem alerta não diz "seguro"; local fechado e sem previsão', () => {
  const ok = assessActivity(ctxOf({ feels: () => 20 }), run({ type: 'caminhada', intensity: 'leve' }));
  assert.equal(ok.level, 'ok'); assert.match(ok.text, /não quer dizer que não haja risco/); assert.doesNotMatch(ok.text, /segur/i);
  const gym = assessActivity(ctxOf(hot), run({ type: 'musculacao', outdoor: false }));
  assert.equal(gym.level, 'indoor'); assert.match(gym.text, /ventilado/);
  assert.equal(assessActivity(null, run()).level, 'unknown');
  assert.equal(assessActivity(ctxOf(hot), run({ date: '2026-12-01' })).level, 'unknown');
});

test('restrição de líquidos troca a dica de água antes e depois', () => {
  const ctx = ctxOf(hot);
  assert.ok(assessActivity(ctx, run(), { restricted: true }).tips.some(t => /orientação do seu médico/.test(t)));
  const after = afterAdvice(run(), ctx, { restricted: true });
  assert.match(after[0], /orientação do seu médico/);
  assert.ok(afterAdvice(run(), ctx).every(t => !/\d+\s?ml|suor|eletr/i.test(t)), 'não calcula perdas');
  assert.ok(afterAdvice(run(), ctx).some(t => /calor/.test(t)));
});

test('próxima atividade a partir de agora', () => {
  const list = [run({ id: 1, start: '07:00' }), run({ id: 2, start: '18:00' }), run({ id: 3, date: '2026-11-14', start: '06:00' }), run({ id: 4, start: '19:00', status: 'feita' })];
  assert.equal(nextActivity(list, '2026-11-13', '09:00').id, 2);
  assert.equal(nextActivity(list, '2026-11-13', '18:30').id, 3);
});

test('alimentação: dia quente, dia frio e dia de atividade, no máximo duas sugestões', () => {
  const tips = foodTips(ctxOf(hot), { activities: [run()] });
  assert.deepEqual(tips.map(t => t.id), ['calor', 'atividade']);
  assert.ok(tips[0].items.some(i => i.label === 'Melancia')); assert.match(tips[0].source, /USDA/);
  assert.deepEqual(foodTips(ctxOf({ feels: () => 12 })).map(t => t.id), ['frio']);
  assert.deepEqual(foodTips(ctxOf({ feels: () => 22 }), { activities: [run({ intensity: 'leve', type: 'caminhada' })] }), []);
  assert.ok(foodTips(ctxOf(hot)).every(t => !/obrigat|proibid|evite/i.test(t.text)));
});

test('histórico do dia: meta guardada e meta estimada sempre nula', () => {
  const rec = dayRecord(ctxOf(hot), { place: 'São Paulo', goal: 2000 });
  assert.equal(rec.date, '2026-11-13'); assert.equal(rec.goal, 2000); assert.equal(rec.estimatedGoal, null);
  assert.ok(rec.cls.length); assert.ok(rec.feelsMax >= 38); assert.ok(rec.tip);
});

test('análises: só com dados suficientes e com a base de cada frase', () => {
  const today = '2026-11-30';
  const history = {}, drinks = [], acts = [];
  for (let i = 1; i <= 10; i++) {
    const d = `2026-11-${String(30 - i).padStart(2, '0')}`;
    const isHot = i <= 5;
    history[d] = { date: d, feelsMax: isHot ? 33 : 22, goal: 2000 };
    drinks.push({ id: 'x' + i, date: d, type: 'agua', ml: isHot ? (i <= 4 ? 2200 : 1500) : 1600, ts: 1 });
    if (i % 2 === 0) { acts.push({ id: 'a' + i, date: d, type: 'caminhada', start: '07:00', minutes: 40, status: 'feita' }); drinks.push({ id: 'y' + i, date: d, type: 'agua', ml: 400, ts: 2 }); }
  }
  const out = insights({ history, drinks, goalFor: () => 2000, activities: acts, today });
  const by = Object.fromEntries(out.map(x => [x.id, x]));
  assert.match(by['calor-meta'].text, /100% dos dias quentes|80% dos dias quentes/);
  assert.ok(by['calor-consumo']); assert.ok(by['atividade-consumo']);
  assert.match(by['horario-caminhada'].text, /caminhadas de manhã/);
  assert.equal(insights({ history: {}, drinks: drinks.slice(0, 2), goalFor: () => 2000, activities: [], today }).length, 0);
  // Sem diferença real entre os grupos, a frase não aparece.
  const same = drinks.filter(x => !String(x.id).startsWith('y'));
  assert.ok(!insights({ history, drinks: same.map(x => ({ ...x, ml: 1800 })), goalFor: () => 2000, activities: acts, today }).some(x => x.id === 'atividade-consumo'));
});

test('rotina: movimento e força marcados pelas atividades feitas', () => {
  const routine = { schedule: [], habits: habits({ goal: 'perder' }) };
  const base = { entries: [], water: 0, protein: 0, checks: {} };
  assert.equal(dayStatus(routine, { ...base, activeMin: 20 }).habits.find(x => x.id === 'movimento').done, false);
  assert.equal(dayStatus(routine, { ...base, activeMin: 35 }).habits.find(x => x.id === 'movimento').done, true);
  const r2 = { schedule: [], habits: habits({ goal: 'ganhar' }) };
  assert.equal(dayStatus(r2, { ...base, strength: true }).habits.find(x => x.id === 'forca').done, true);
});
