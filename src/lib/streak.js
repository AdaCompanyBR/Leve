// Ofensiva: dias seguidos de rotina saudável, calculados só dos registros reais. Função pura, testável.
//
// Regras (as mesmas mostradas na tela, em "Como a ofensiva funciona"):
// - Um dia conta quando cumpre PELO MENOS UM critério ligado pela pessoa: registrar uma refeição,
//   bater a meta de líquidos, registrar uma atividade feita ou cumprir metade da rotina do dia.
//   Concluir um desafio no dia também conta. Nenhum critério é obrigatório, nem atividade física.
// - Cada data conta uma vez só (registros repetidos não somam). Datas são locais (aaaa-mm-dd do aparelho).
// - Dias de descanso escolhidos e dias em pausa são neutros: não quebram nem somam.
// - Hoje ainda sem registro fica "pendente": a ofensiva não quebra antes de o dia acabar.
// - Proteção: a cada 7 dias cumpridos, a pessoa ganha 1 proteção (no máximo 2). Um dia perdido com
//   proteção disponível é coberto por ela, sem quebrar a ofensiva.
// - Dias futuros nunca entram.
import { addDays, diffDays, weekStart } from './dates.js';

export const CRITERIA = [
  { id: 'meal', label: 'Registrar uma refeição', hint: 'Qualquer item no diário alimentar.' },
  { id: 'water', label: 'Bater a meta de líquidos', hint: 'A sua meta individual do dia.' },
  { id: 'activity', label: 'Registrar uma atividade feita', hint: 'Caminhada, treino ou outra atividade marcada como feita.' },
  { id: 'routine', label: 'Cumprir metade da rotina do dia', hint: 'Refeições nos horários e hábitos da aba Hoje.' },
];
export const DEFAULT_STREAK = { criteria: { meal: true, water: true, activity: true, routine: true }, restDays: [], pauses: [] };
export const MAX_SHIELDS = 2;
export const SHIELD_EVERY = 7;

/** Um dia é válido? `f`: fatos do dia ({ meals, waterMet, activity, routineHalf, challengeDone }). */
export function isValidDay(f, criteria = DEFAULT_STREAK.criteria) {
  if (!f) return false;
  if (f.challengeDone) return true;
  return (criteria.meal !== false && f.meals > 0)
    || (criteria.water !== false && !!f.waterMet)
    || (criteria.activity !== false && !!f.activity)
    || (criteria.routine !== false && !!f.routineHalf);
}

const dow = iso => new Date(iso + 'T12:00:00').getDay(); // 0 = domingo
export const inPause = (date, pauses = []) => pauses.some(p => date >= p.from && (!p.to || date <= p.to));

/**
 * Simula a ofensiva dia a dia, de `start` até `today` (inclusive).
 * facts(date) -> fatos do dia. Devolve o resumo e o estado de cada dia (para o calendário).
 */
export function computeStreak({ start, today, facts, config = DEFAULT_STREAK }) {
  const cfg = { ...DEFAULT_STREAK, ...config, criteria: { ...DEFAULT_STREAK.criteria, ...(config?.criteria ?? {}) } };
  const rest = new Set(cfg.restDays ?? []);
  const days = {};
  let current = 0, best = 0, shields = 0, totalActive = 0, runStart = null;
  let prevBest = 0, recordBeatenOn = null, comebackOn = null, brokeBefore = false;
  if (!start || start > today) start = today;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const f = facts(d);
    const valid = isValidDay(f, cfg.criteria);
    let st;
    if (valid) {
      if (current === 0) runStart = d;
      current++; totalActive++; st = 'done';
      if (current % SHIELD_EVERY === 0 && shields < MAX_SHIELDS) shields++;
      // Recorde superado: passou a maior ofensiva de antes desta sequência (de pelo menos 3 dias).
      if (prevBest >= 3 && current === prevBest + 1 && !recordBeatenOn) recordBeatenOn = d;
      // Retomada: 7 dias seguidos depois de uma interrupção.
      if (brokeBefore && current === 7 && !comebackOn) comebackOn = d;
    } else if (inPause(d, cfg.pauses)) st = 'paused';
    else if (rest.has(dow(d))) st = 'rest';
    else if (d === today) st = 'pending';
    else if (current > 0 && shields > 0) { shields--; st = 'protected'; }
    else {
      st = 'missed';
      if (current > 0) { prevBest = Math.max(prevBest, current); brokeBefore = true; }
      current = 0; runStart = null;
    }
    best = Math.max(best, current);
    days[d] = st;
  }
  return {
    current, best, shields, totalActive, runStart, days, recordBeatenOn, comebackOn,
    todayDone: days[today] === 'done',
    consistentWeeks: consistentWeeks(days, today, start),
  };
}

/**
 * Semanas consistentes (segunda a domingo): pelo menos 4 dias cumpridos, ou todos os dias que contavam
 * (sem descanso e sem pausa) cumpridos, com no mínimo 3. A semana atual só entra quando já atingiu isso.
 */
export function consistentWeeks(days, today, start) {
  let n = 0;
  for (let w = weekStart(start); w <= today; w = addDays(w, 7)) {
    let done = 0, open = 0;
    for (let i = 0; i < 7; i++) {
      const st = days[addDays(w, i)];
      if (st === 'done') done++;
      if (st && st !== 'rest' && st !== 'paused') open++;
    }
    if (done >= 4 || (done >= 3 && done === open && addDays(w, 6) < today)) n++;
  }
  return n;
}

/** Estado de cada dia de uma semana para o calendário (dias futuros = 'future'). */
export function weekDays(days, monday, today, config = DEFAULT_STREAK) {
  const rest = new Set(config.restDays ?? []);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    if (date > today) return { date, state: rest.has(dow(date)) ? 'rest-future' : inPause(date, config.pauses) ? 'paused' : 'future' };
    return { date, state: days[date] ?? (rest.has(dow(date)) ? 'rest' : 'none') };
  });
}

/** Mensagem curta e positiva para o cartão. Nunca culpa. */
export function streakMessage(s) {
  if (s.current === 0) return s.best > 0 ? 'Hoje é um bom dia para retomar a sua rotina, no seu ritmo.' : 'Registre uma refeição, beba a sua meta de líquidos ou mexa o corpo para começar.';
  if (!s.todayDone && s.current > 0) return 'Sua ofensiva continua. Um registro hoje mantém o ritmo.';
  if (s.current >= s.best && s.best >= 3) return 'Este é o seu recorde pessoal. Continue respeitando o seu ritmo.';
  if (s.best - s.current <= 3 && s.best >= 5) return `Seu recorde pessoal (${s.best} dias) está cada vez mais próximo.`;
  if (s.current >= 7) return 'Você está construindo uma rotina consistente. Continue respeitando seu ritmo.';
  return 'Você completou mais um dia da sua rotina!';
}

export const daysBetween = diffDays;
