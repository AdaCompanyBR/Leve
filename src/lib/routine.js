// Rotina: horários de refeição e hábitos do dia, montados a partir do objetivo. Funções puras.
// Os hábitos usam recomendações públicas (OMS, Guia Alimentar para a População Brasileira,
// Academia Americana de Medicina do Sono) e não substituem orientação profissional.
import { addDays, weekStart } from './dates.js';

export const MEAL_COUNTS = [3, 4, 5, 6];
export const WAKE_TIMES = ['05:00', '06:00', '07:00', '08:00', '09:00'];

// Partes das calorias do dia em cada refeição, por número de refeições.
const SPLITS = {
  3: [['cafe', .30], ['almoco', .40], ['jantar', .30]],
  4: [['cafe', .25], ['almoco', .35], ['lanche-tarde', .15], ['jantar', .25]],
  5: [['cafe', .20], ['lanche-manha', .10], ['almoco', .35], ['lanche-tarde', .10], ['jantar', .25]],
  6: [['cafe', .20], ['lanche-manha', .10], ['almoco', .30], ['lanche-tarde', .10], ['jantar', .20], ['ceia', .10]],
};
// Horário de cada refeição: minutos depois de acordar, com limites para almoço e jantar ficarem em horas comuns.
const SLOT = {
  'cafe': { label: 'Café da manhã', meal: 'cafe', after: 30 },
  'lanche-manha': { label: 'Lanche da manhã', meal: 'lanches', after: 180 },
  'almoco': { label: 'Almoço', meal: 'almoco', after: 330, min: 690, max: 810 },
  'lanche-tarde': { label: 'Lanche da tarde', meal: 'lanches', after: 540 },
  'jantar': { label: 'Jantar', meal: 'jantar', after: 750, min: 1110, max: 1290 },
  'ceia': { label: 'Ceia', meal: 'lanches', after: 870, max: 1380 },
};

const toMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = min => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const round15 = m => Math.round(m / 15) * 15;

/** Refeições do dia com horário, calorias e proteína sugeridas. */
export function mealSchedule({ meals = 4, wake = '07:00', target = null, protein = null }) {
  const split = SPLITS[meals] ?? SPLITS[4];
  const w = toMin(wake);
  let last = 0;
  return split.map(([id, share]) => {
    const s = SLOT[id];
    let t = round15(w + s.after);
    if (s.min != null) t = Math.max(t, s.min);
    if (s.max != null) t = Math.min(t, s.max);
    t = Math.max(t, last + 120); // pelo menos 2 h entre refeições
    last = t;
    return {
      id, label: s.label, meal: s.meal, time: toHHMM(t), share,
      kcal: target ? Math.round((target * share) / 10) * 10 : null,
      protein: protein ? Math.round(protein * share) : null,
    };
  });
}

const L = ml => `${String(Math.round(ml / 100) / 10).replace('.', ',')} L`;

/** Hábitos por objetivo. `auto` diz como o app marca sozinho; sem `auto`, a pessoa marca. */
export function habits({ goal = 'perder', protein = null, waterGoal = 2000, meals = 4 }) {
  const H = {
    agua: { id: 'agua', label: `Beber ${L(waterGoal)} de líquidos`, detail: 'Água, chá, café e outras bebidas contam.', auto: 'agua' },
    proteina: protein ? { id: 'proteina', label: `Comer ${protein} g de proteína`, detail: 'Dividida entre as refeições: carnes, ovos, laticínios, feijões.', auto: 'proteina' } : null,
    pesoDia: { id: 'peso', label: 'Pesar-se pela manhã', detail: 'Em jejum, depois do banheiro. O que conta é a tendência, não o dia.', auto: 'peso' },
    pesoSemana: { id: 'peso', label: 'Pesar-se', detail: 'Duas vezes por semana, pela manhã e em jejum.', auto: 'peso', perWeek: 2 },
    pesoUma: { id: 'peso', label: 'Pesar-se', detail: 'Uma vez por semana, pela manhã e em jejum.', auto: 'peso', perWeek: 1 },
    movimento: { id: 'movimento', label: 'Mexer o corpo por 30 minutos', detail: 'Caminhada, bicicleta, dança. A OMS recomenda ao menos 150 minutos por semana.', perWeek: 5 },
    forca: { id: 'forca', label: 'Treino de força', detail: 'Musculação ou exercícios com o peso do corpo, aumentando a carga aos poucos. Procure orientação de um profissional de educação física.', perWeek: 3 },
    vegetais: { id: 'vegetais', label: 'Metade do prato com legumes e verduras', detail: 'No almoço e no jantar. Enchem o prato com poucas calorias.' },
    frutas: { id: 'frutas', label: 'Frutas, legumes e verduras: 400 g no dia', detail: 'É a recomendação da OMS, cerca de 5 porções.' },
    natura: { id: 'natura', label: 'Preferir comida de verdade', detail: 'O Guia Alimentar para a População Brasileira recomenda alimentos in natura ou pouco processados e evitar os ultraprocessados.' },
    refeicoes: { id: 'refeicoes', label: `Fazer as ${meals} refeições`, detail: 'Pular refeições dificulta chegar às calorias do dia.', auto: 'refeicoes' },
    sono: { id: 'sono', label: 'Dormir pelo menos 7 horas', detail: 'Sono curto aumenta a fome e atrapalha a recuperação dos músculos.' },
  };
  const byGoal = {
    perder: ['agua', 'proteina', 'vegetais', 'movimento', 'pesoDia', 'sono'],
    ganhar: ['refeicoes', 'proteina', 'forca', 'agua', 'sono', 'pesoSemana'],
    definir: ['proteina', 'forca', 'vegetais', 'agua', 'pesoDia', 'sono'],
    manter: ['agua', 'proteina', 'frutas', 'movimento', 'pesoUma'],
    saude: ['frutas', 'natura', 'agua', 'movimento', 'sono'],
  };
  return (byGoal[goal] ?? byGoal.perder).map(k => H[k]).filter(Boolean);
}

/** Frase que resume a estratégia de cada objetivo. */
export function focusText(goal, plan) {
  const n = v => Math.round(v).toLocaleString('pt-BR');
  switch (goal) {
    case 'ganhar': return plan?.surplus ? `${n(plan.surplus)} kcal acima do gasto, proteína em todas as refeições e treino de força.` : 'Comer o quanto você gasta, com proteína alta e treino de força.';
    case 'definir': return plan?.deficit ? `Um déficit pequeno (${n(plan.deficit)} kcal), proteína alta para preservar os músculos e treino de força.` : 'Proteína alta e treino de força, comendo o quanto você gasta.';
    case 'manter': return 'Comer o quanto você gasta e acompanhar o peso uma vez por semana.';
    case 'saude': return 'Comida de verdade, frutas e verduras todos os dias, água e movimento.';
    default: return plan?.deficit ? `Um déficit de ${n(plan.deficit)} kcal por dia, proteína para preservar os músculos e movimento.` : 'Comer o quanto você gasta.';
  }
}

/** Monta a rotina completa. */
export function buildRoutine({ profile, plan, waterGoal = 2000 }) {
  const goal = plan?.goal ?? profile.goal ?? 'perder';
  const meals = profile.meals ?? 4;
  const protein = plan?.macros?.protein ?? null;
  return {
    goal, meals, wake: profile.wake ?? '07:00',
    schedule: mealSchedule({ meals, wake: profile.wake ?? '07:00', target: plan?.target ?? null, protein }),
    habits: habits({ goal, protein, waterGoal, meals }),
    focus: focusText(goal, plan),
  };
}

/**
 * O que já foi feito no dia. `day` traz os registros do dia: entries (com meal e ts), water (ml),
 * weighed (bool), protein (g) e checks ({ idDoHábito: true } marcados à mão).
 */
export function dayStatus(routine, day) {
  const byMeal = {};
  for (const e of [...day.entries].sort((a, b) => a.ts - b.ts)) (byMeal[e.meal] ??= []).push(e);
  const used = {};
  const schedule = routine.schedule.map(s => {
    const i = used[s.meal] = (used[s.meal] ?? -1) + 1;   // 2º lanche do dia vale para o 2º horário de lanche
    return { ...s, done: (byMeal[s.meal]?.length ?? 0) > i };
  });
  const goals = { water: day.waterGoal ?? 2000, protein: routine.habits.find(x => x.id === 'proteina') ? day.proteinGoal : null };
  const habits = routine.habits.map(x => {
    let done;
    if (x.auto === 'agua') done = day.water >= goals.water;
    else if (x.auto === 'proteina') done = day.protein >= (day.proteinGoal ?? Infinity);
    else if (x.auto === 'peso') done = !!day.weighed;
    else if (x.auto === 'refeicoes') done = schedule.every(s => s.done);
    else done = !!day.checks?.[x.id];
    return { ...x, done };
  });
  const all = [...schedule, ...habits];
  return { schedule, habits, done: all.filter(x => x.done).length, total: all.length };
}

/** Quantos dias da semana (segunda a domingo) um hábito foi feito, até `date`. */
export function weekCount(isDone, date) {
  const start = weekStart(date);
  let n = 0;
  for (let d = start; d <= date; d = addDays(d, 1)) if (isDone(d)) n++;
  return n;
}
