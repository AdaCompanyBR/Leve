import test from 'node:test';
import assert from 'node:assert/strict';
import { bmr, tdee, bmi, healthyRange, validateGoal, plan, macros, ageOn, etaDate } from '../src/lib/calc.js';

const base = { sex: 'm', birthDate: '1990-06-15', heightCm: 180, weightKg: 90, activity: 'sedentario', pace: 'moderado' };
const TODAY = '2026-11-11';

test('TMB Mifflin-St Jeor', () => {
  assert.equal(bmr({ sex: 'm', kg: 90, cm: 180, age: 36 }), 900 + 1125 - 180 + 5);
  assert.equal(bmr({ sex: 'f', kg: 60, cm: 165, age: 30 }), 600 + 1031.25 - 150 - 161);
});

test('gasto total = TMB x fator', () => {
  assert.equal(tdee({ sex: 'm', kg: 90, cm: 180, age: 36, activity: 'moderado' }), 1850 * 1.55);
});

test('idade considera se o aniversário já passou', () => {
  assert.equal(ageOn('1990-06-15', '2026-06-14'), 35);
  assert.equal(ageOn('1990-06-15', '2026-06-15'), 36);
});

test('IMC e faixa saudável', () => {
  assert.ok(Math.abs(bmi(81, 180) - 25) < 1e-9);
  const r = healthyRange(180);
  assert.equal(r.min, 60); // 18,5 x 3,24 = 59,94 -> arredonda para cima
  assert.equal(r.max, 80.6); // 24,9 x 3,24 = 80,676 -> arredonda para baixo
  assert.equal(r.ideal, 71.3);
  assert.ok(bmi(r.min, 180) >= 18.5 && bmi(r.max, 180) <= 24.9);
});

test('peso-alvo fora da faixa saudável é recusado', () => {
  assert.equal(validateGoal(55, 180).ok, false);
  assert.equal(validateGoal(85, 180).ok, false);
  assert.equal(validateGoal(72, 180).ok, true);
  assert.equal(validateGoal(NaN, 180).ok, false);
});

test('plano moderado: déficit de 550 kcal', () => {
  const p = plan({ ...base, activity: 'moderado' }, TODAY);
  assert.equal(p.mode, 'deficit');
  assert.equal(p.tdee, 2868);
  assert.equal(p.deficit, 550);
  assert.equal(p.target, 2318);
  assert.deepEqual(p.locks, []);
  assert.equal(p.goalKg, 71.3);
  assert.ok(p.eta > TODAY);
});

test('trava: déficit máximo de 25% do gasto', () => {
  const p = plan({ ...base, sex: 'f', heightCm: 160, weightKg: 70, pace: 'intenso', activity: 'moderado' }, TODAY);
  // TMB 700+1000-180-161 = 1359; gasto 2106; intenso pede 825 > 25% (527)
  assert.ok(p.locks.includes('deficit25'));
  assert.equal(p.target, Math.round(1359 * 1.55 * 0.75));
  assert.ok(p.kgWeek < 0.75);
});

test('trava: piso de 1.200 kcal (mulheres) e 1.500 (homens)', () => {
  const f = plan({ sex: 'f', birthDate: '1970-01-01', heightCm: 150, weightKg: 58, activity: 'sedentario', pace: 'intenso' }, TODAY);
  assert.ok(f.locks.includes('piso'));
  assert.equal(f.target, 1200);
  const m = plan({ sex: 'm', birthDate: '1960-01-01', heightCm: 165, weightKg: 70, activity: 'sedentario', pace: 'intenso' }, TODAY);
  assert.ok(m.target >= 1500);
  assert.ok(m.locks.includes('piso'));
});

test('menor de 18 anos: nenhum plano de déficit', () => {
  const p = plan({ ...base, birthDate: '2010-01-01' }, TODAY);
  assert.equal(p.mode, 'menor');
  assert.equal(p.target, null);
  assert.equal(p.deficit, 0);
});

test('quem já está no peso-alvo ou abaixo recebe manutenção', () => {
  const p = plan({ ...base, weightKg: 68 }, TODAY);
  assert.equal(p.mode, 'manutencao');
  assert.equal(p.deficit, 0);
  assert.equal(p.target, p.tdee);
});

test('peso-alvo inválido salvo no perfil volta para o IMC 22', () => {
  assert.equal(plan({ ...base, goalKg: 50 }, TODAY).goalKg, 71.3);
  assert.equal(plan({ ...base, goalKg: 75 }, TODAY).goalKg, 75);
});

test('gasto adaptado substitui a fórmula', () => {
  const p = plan({ ...base, tdeeOverride: 2500 }, TODAY);
  assert.equal(p.tdee, 2500);
  assert.equal(p.adapted, true);
  assert.equal(p.target, 1950);
});

test('macros: 1,6 g/kg de proteína, 25% de gordura, resto carboidrato', () => {
  const m = macros(2000, 70);
  assert.deepEqual(m, { protein: 112, fat: 56, carbs: Math.round((2000 - 448 - 504) / 4) });
});

test('data de chegada', () => {
  assert.equal(etaDate(80, 79, 550, '2026-01-01'), '2026-01-15'); // 7700/550 = 14 dias
  assert.equal(etaDate(80, 79, 0, '2026-01-01'), null);
  assert.equal(etaDate(70, 72, 500, '2026-01-01'), '2026-01-01');
});

test('objetivo: ganhar massa usa superávit pequeno e mais proteína', () => {
  const p = plan({ ...base, weightKg: 72, activity: 'moderado', goal: 'ganhar', gainPace: 'moderado' }, TODAY);
  assert.equal(p.mode, 'superavit');
  assert.equal(p.surplus, 350);
  assert.equal(p.target, p.tdee + 350);
  assert.equal(p.macros.protein, Math.round(1.8 * 72));
  assert.equal(p.eta, null);
});

test('objetivo: ganhar massa com IMC 27 ou mais não soma superávit', () => {
  const p = plan({ ...base, weightKg: 90, goal: 'ganhar', gainPace: 'intenso' }, TODAY); // IMC 27,8
  assert.ok(p.locks.includes('imc-alto'));
  assert.equal(p.surplus, 0);
  assert.equal(p.target, p.tdee);
});

test('objetivo: superávit limitado a 15% do gasto', () => {
  const p = plan({ sex: 'f', birthDate: '1960-01-01', heightCm: 150, weightKg: 45, activity: 'sedentario', goal: 'ganhar', gainPace: 'intenso' }, TODAY);
  assert.ok(p.locks.includes('superavit15'));
  assert.ok(p.surplus <= p.tdee * 0.15 + 1);
});

test('objetivo: definir corta 10% e respeita o piso', () => {
  const p = plan({ ...base, weightKg: 82, activity: 'moderado', goal: 'definir' }, TODAY);
  assert.equal(p.mode, 'recomposicao');
  assert.ok(Math.abs(p.target - p.tdee * 0.9) <= 1);
  assert.equal(p.macros.protein, Math.round(2.0 * 80.6)); // peso limitado ao topo da faixa saudável
  const magra = plan({ ...base, weightKg: 58, goal: 'definir' }, TODAY); // IMC 17,9
  assert.equal(magra.mode, 'manutencao');
  assert.ok(magra.locks.includes('imc-baixo'));
});

test('objetivo: manter e comer melhor ficam no gasto; menor de 18 continua sem meta', () => {
  for (const goal of ['manter', 'saude']) {
    const p = plan({ ...base, goal }, TODAY);
    assert.equal(p.mode, 'manutencao');
    assert.equal(p.target, p.tdee);
  }
  assert.equal(plan({ ...base, birthDate: '2012-01-01', goal: 'ganhar' }, TODAY).mode, 'menor');
});

test('perfil antigo sem objetivo continua perdendo peso', () => {
  assert.equal(plan(base, TODAY).goal, 'perder');
  assert.equal(plan(base, TODAY).mode, 'deficit');
});
