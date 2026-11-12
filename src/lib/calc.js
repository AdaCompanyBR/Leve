// Cálculos de energia, faixa saudável, meta e macros. Funções puras.
import { addDays, fromISO } from './dates.js';

export const KCAL_PER_KG = 7700;
export const BMI_MIN = 18.5;
export const BMI_MAX = 24.9;
export const BMI_IDEAL = 22;
export const MAX_DEFICIT_RATIO = 0.25;
export const FLOOR = { f: 1200, m: 1500 };

export const ACTIVITY = [
  { id: 'sedentario', factor: 1.2, label: 'Sedentário', hint: 'Trabalho sentado, pouco ou nenhum exercício' },
  { id: 'leve', factor: 1.375, label: 'Levemente ativo', hint: 'Exercício leve de 1 a 3 dias por semana' },
  { id: 'moderado', factor: 1.55, label: 'Moderadamente ativo', hint: 'Exercício de 3 a 5 dias por semana' },
  { id: 'alto', factor: 1.725, label: 'Muito ativo', hint: 'Exercício intenso de 6 a 7 dias por semana' },
  { id: 'extremo', factor: 1.9, label: 'Extremamente ativo', hint: 'Trabalho físico pesado ou dois treinos por dia' },
];

/** Objetivos. O de "perder" é o comportamento original do app (perfis antigos não têm `goal`). */
export const GOALS = [
  { id: 'perder', label: 'Perder peso', hint: 'Déficit seguro, no ritmo que você escolher' },
  { id: 'ganhar', label: 'Ganhar massa muscular', hint: 'Um pouco acima do gasto, com proteína e treino de força' },
  { id: 'definir', label: 'Definir o corpo', hint: 'Perder gordura devagar, preservando os músculos' },
  { id: 'manter', label: 'Manter o peso', hint: 'Comer o quanto você gasta' },
  { id: 'saude', label: 'Comer melhor', hint: 'Hábitos mais saudáveis, sem foco na balança' },
];
export const goalById = id => GOALS.find(g => g.id === id) ?? GOALS[0];

/** Superávit para ganhar massa: pequeno, para o ganho ser mais músculo do que gordura. */
export const GAIN_PACES = [
  { id: 'suave', kcal: 200, label: 'Suave', hint: 'Cerca de 200 kcal acima do gasto' },
  { id: 'moderado', kcal: 350, label: 'Moderado', hint: 'Cerca de 350 kcal acima do gasto' },
  { id: 'intenso', kcal: 500, label: 'Intenso', hint: 'Cerca de 500 kcal acima do gasto' },
];
export const MAX_SURPLUS_RATIO = 0.15;   // superávit de no máximo 15% do gasto
export const GAIN_BMI_MAX = 27;          // acima disso, o app sugere definir em vez de ganhar
export const RECOMP_RATIO = 0.10;        // definir: déficit de 10% do gasto
/** Proteína em g por kg, por objetivo. A referência é o peso atual limitado ao topo da faixa saudável. */
export const PROTEIN_PER_KG = { perder: 1.6, ganhar: 1.8, definir: 2.0, manter: 1.2, saude: 1.2 };

export const PACES = [
  { id: 'suave', kgWeek: 0.25, label: 'Suave', hint: '0,25 kg por semana' },
  { id: 'moderado', kgWeek: 0.5, label: 'Moderado', hint: '0,5 kg por semana' },
  { id: 'intenso', kgWeek: 0.75, label: 'Intenso', hint: '0,75 kg por semana' },
];

const round1 = n => Math.round(n * 10) / 10;

export function ageOn(birthISO, todayISO) {
  const b = fromISO(birthISO), t = fromISO(todayISO);
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age;
}

export const bmi = (kg, cm) => kg / (cm / 100) ** 2;
export const kgAtBmi = (b, cm) => b * (cm / 100) ** 2;

/** Faixa de peso saudável (IMC 18,5 a 24,9) e peso sugerido (IMC 22). */
export function healthyRange(cm) {
  // min arredonda para cima e max para baixo: os limites nunca saem da faixa.
  return {
    min: Math.ceil(kgAtBmi(BMI_MIN, cm) * 10) / 10,
    max: Math.floor(kgAtBmi(BMI_MAX, cm) * 10) / 10,
    ideal: round1(kgAtBmi(BMI_IDEAL, cm)),
  };
}

/** Peso-alvo só é aceito dentro da faixa saudável. */
export function validateGoal(goalKg, cm) {
  const r = healthyRange(cm);
  if (!Number.isFinite(goalKg)) return { ok: false, reason: 'Informe um peso em quilos.' };
  if (goalKg < r.min) return { ok: false, reason: `Esse peso fica abaixo do IMC 18,5. O mínimo saudável para a sua altura é ${fmtKg(r.min)} kg.` };
  if (goalKg > r.max) return { ok: false, reason: `O peso-alvo precisa ficar na faixa saudável, até ${fmtKg(r.max)} kg.` };
  return { ok: true };
}

const fmtKg = n => n.toFixed(1).replace('.', ',');

/** Taxa metabólica basal, Mifflin-St Jeor. sex: 'm' | 'f'. */
export function bmr({ sex, kg, cm, age }) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161);
}

export function activityFactor(id) {
  return (ACTIVITY.find(a => a.id === id) ?? ACTIVITY[0]).factor;
}

export function tdee({ sex, kg, cm, age, activity }) {
  return bmr({ sex, kg, cm, age }) * activityFactor(activity);
}

/** Proteína em g por kg (1,6 por padrão) do peso de referência, gordura 25% das calorias, o resto em carboidratos. */
export function macros(targetKcal, refKg, perKg = 1.6) {
  const protein = Math.min(Math.round(perKg * refKg), Math.round((targetKcal * 0.4) / 4));
  const fat = Math.round((targetKcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((targetKcal - protein * 4 - fat * 9) / 4));
  return { protein, fat, carbs };
}

/** Data em que `fromKg` chega a `goalKg` com o déficit diário dado. null se não houver déficit. */
export function etaDate(fromKg, goalKg, dailyDeficit, todayISO) {
  if (fromKg <= goalKg) return todayISO;
  if (!(dailyDeficit > 0)) return null;
  const days = Math.ceil(((fromKg - goalKg) * KCAL_PER_KG) / dailyDeficit);
  if (days > 3650) return null;
  return addDays(todayISO, days);
}

/**
 * Plano completo a partir do perfil.
 * profile: { sex, birthDate, heightCm, weightKg, activity, pace, goalKg?, tdeeOverride? }
 * profile.goal: 'perder' (padrão) | 'ganhar' | 'definir' | 'manter' | 'saude'
 * mode: 'deficit' | 'superavit' | 'recomposicao' | 'manutencao' | 'menor'
 * locks: travas de segurança que mudaram o resultado ('piso', 'deficit25', 'superavit15', 'imc-alto', 'imc-baixo').
 */
export function plan(profile, todayISO) {
  const { sex, birthDate, heightCm: cm, weightKg: kg, activity, pace } = profile;
  const age = ageOn(birthDate, todayISO);
  const range = healthyRange(cm);
  const goalKg = validateGoal(profile.goalKg, cm).ok ? profile.goalKg : range.ideal;
  const basal = bmr({ sex, kg, cm, age });
  const formulaTdee = basal * activityFactor(activity);
  const total = profile.tdeeOverride > 0 ? profile.tdeeOverride : formulaTdee;
  const floor = FLOOR[sex] ?? FLOOR.f;
  const goal = goalById(profile.goal).id;
  const refKg = Math.min(kg, range.max);
  const perKg = PROTEIN_PER_KG[goal];
  const base = {
    goal, age, bmi: bmi(kg, cm), range, goalKg, bmr: Math.round(basal), tdee: Math.round(total),
    formulaTdee: Math.round(formulaTdee), adapted: profile.tdeeOverride > 0, floor, locks: [],
  };

  if (age < 18) {
    // Menores de 18: nenhum plano de déficit.
    return { ...base, mode: 'menor', target: null, deficit: 0, kgWeek: 0, eta: null, macros: null };
  }
  const maintenance = (locks = []) => {
    const target = Math.round(total);
    return { ...base, mode: 'manutencao', locks, target, deficit: 0, surplus: 0, kgWeek: 0, eta: goal === 'perder' ? todayISO : null, macros: macros(target, goal === 'perder' ? goalKg : refKg, perKg) };
  };
  if (goal === 'manter' || goal === 'saude') return maintenance();

  if (goal === 'ganhar') {
    const locks = [];
    let surplus = (GAIN_PACES.find(g => g.id === profile.gainPace) ?? GAIN_PACES[0]).kcal;
    if (base.bmi >= GAIN_BMI_MAX) { surplus = 0; locks.push('imc-alto'); }
    if (surplus > total * MAX_SURPLUS_RATIO) { surplus = total * MAX_SURPLUS_RATIO; locks.push('superavit15'); }
    const target = Math.round(total + surplus);
    return { ...base, mode: 'superavit', locks, target, deficit: 0, surplus: Math.round(surplus), kgWeek: 0, eta: null, macros: macros(target, refKg, perKg) };
  }

  if (goal === 'definir') {
    if (base.bmi < BMI_MIN) return maintenance(['imc-baixo']);
    const locks = [];
    let target = total * (1 - RECOMP_RATIO);
    if (target < floor) { target = Math.min(floor, total); locks.push('piso'); }
    target = Math.round(target);
    const deficit = Math.max(0, Math.round(total - target));
    return { ...base, mode: 'recomposicao', locks, target, deficit, surplus: 0, kgWeek: (deficit * 7) / KCAL_PER_KG, eta: null, macros: macros(target, refKg, perKg) };
  }

  if (kg <= goalKg) return maintenance();

  const wanted = ((PACES.find(p => p.id === pace) ?? PACES[1]).kgWeek * KCAL_PER_KG) / 7;
  const locks = [];
  let deficit = wanted;
  const cap = total * MAX_DEFICIT_RATIO;
  if (deficit > cap) { deficit = cap; locks.push('deficit25'); }
  let target = total - deficit;
  if (target < floor) { target = Math.min(floor, total); locks.push('piso'); }
  target = Math.round(target);
  deficit = Math.max(0, total - target);
  return {
    ...base, mode: 'deficit', locks, target, deficit: Math.round(deficit),
    kgWeek: (deficit * 7) / KCAL_PER_KG,
    surplus: 0, eta: etaDate(kg, goalKg, deficit, todayISO),
    macros: macros(target, goalKg, perKg),
  };
}
