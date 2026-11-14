// Ofensiva: dias seguidos de rotina saudável, validados automaticamente pelos registros. Função pura,
// testável, sem rede — a mesma regra pode rodar no servidor.
//
// Regras (as mesmas mostradas na tela, em "Como a ofensiva funciona"):
// - Um dia vale quando UM dos três critérios fixos é cumprido por inteiro (a pessoa não escolhe):
//   1. Hidratação: 100% da meta individual de líquidos do dia. Com orientação médica para limitar
//      líquidos, este critério não se aplica (o app nunca empurra a beber mais).
//   2. Alimentação: todas as refeições previstas na rotina do dia registradas (3 a 6, conforme o perfil).
//   3. Atividade física: 30 minutos de atividades feitas no dia (a meta diária da rotina, alinhada aos
//      150 min por semana da OMS), contando só atividades de 10 minutos ou mais.
// - Registros válidos: feitos até o fim do dia seguinte (não há recuperação ilimitada de dias antigos);
//   registros repetidos (mesma bebida no mesmo minuto, mesma atividade no mesmo horário) contam uma vez.
// - Dias já validados ficam congelados: mudar a meta ou apagar um registro depois não muda o passado.
// - Cada data conta uma vez. Datas são locais (aaaa-mm-dd do aparelho). Dias futuros nunca entram.
// - Hoje ainda não cumprido fica "pendente": a ofensiva não quebra antes de o dia acabar.
// - Dias de descanso (até 3 por semana) e pausas são neutros: não quebram nem somam.
// - Proteção: a cada 7 dias cumpridos, 1 proteção (no máximo 2); cobre um dia sem validação.
import { addDays, weekStart, fromISO } from './dates.js';

export const ACTIVITY_GOAL_MIN = 30;
export const MIN_BOUT_MIN = 10;
export const MILESTONES = [3, 7, 15, 30, 60, 100];
export const CRITERIA = [
  { id: 'agua', label: 'Hidratação', icon: 'drop', rule: '100% da sua meta de líquidos do dia.' },
  { id: 'refeicoes', label: 'Alimentação', icon: 'fork', rule: 'Todas as refeições previstas na sua rotina registradas.' },
  { id: 'atividade', label: 'Atividade física', icon: 'run', rule: `${ACTIVITY_GOAL_MIN} minutos de atividades feitas, contando as de ${MIN_BOUT_MIN} minutos ou mais.` },
];
export const DEFAULT_STREAK = { restDays: [], restHistory: [], pauses: [] };
export const MAX_PAUSE_DAYS_60 = 14; // no máximo 14 dias em pausa a cada 60 dias
export const MAX_SHIELDS = 2;
export const SHIELD_EVERY = 7;
export const MAX_REST_DAYS = 3;

// ---------------------------------------------------------------------------
// Registros válidos

/** Fim do prazo para registrar um dia: 23:59:59,999 do dia seguinte, no horário local. */
export function graceEnd(date) {
  const d = fromISO(addDays(date, 2));
  return d.getTime() - 1;
}
/** Bebidas do dia que contam: dentro do prazo e sem repetição (mesmo tipo, volume e minuto). */
export function validDrinks(drinks, date) {
  const end = graceEnd(date), seen = new Set(), out = [];
  for (const d of drinks) {
    if (d.date !== date) continue;
    if ((d.createdAt ?? d.ts ?? 0) > end) continue;
    const key = `${d.type}|${d.ml}|${Math.floor((d.ts ?? 0) / 60000)}`;
    if (seen.has(key)) continue;
    seen.add(key); out.push(d);
  }
  return out;
}
/** Minutos de atividade que contam no dia: feitas, no prazo, de 10 min ou mais, sem repetição. */
export function activeMinutes(activities, date) {
  const end = graceEnd(date), seen = new Set();
  let min = 0;
  for (const a of activities) {
    if (a.date !== date || a.status !== 'feita' || !(a.minutes >= MIN_BOUT_MIN)) continue;
    if ((a.updatedAt ?? 0) > end) continue;
    const key = `${a.type}|${a.start}`;
    if (seen.has(key)) continue;
    seen.add(key); min += a.minutes;
  }
  return min;
}

// ---------------------------------------------------------------------------
// Validação do dia

/**
 * Progresso dos três critérios. `f`: { water, waterGoal, waterBlocked, mealsDone, mealsTotal, activeMin }.
 * Cada item: { id, value, target, pct, done, applicable }.
 */
export function dayProgress(f = {}) {
  const water = { id: 'agua', value: Math.round(f.water ?? 0), target: Math.round(f.waterGoal ?? 0), applicable: !f.waterBlocked && (f.waterGoal ?? 0) > 0 };
  const meals = { id: 'refeicoes', value: f.mealsDone ?? 0, target: f.mealsTotal ?? 0, applicable: (f.mealsTotal ?? 0) > 0 };
  const act = { id: 'atividade', value: f.activeMin ?? 0, target: ACTIVITY_GOAL_MIN, applicable: true };
  return [water, meals, act].map(c => {
    const pct = c.target ? Math.min(1, c.value / c.target) : 0;
    return { ...c, pct, done: c.applicable && c.target > 0 && c.value >= c.target };
  });
}
/** Critério que validou o dia (o primeiro cumprido), ou null. Dias congelados trazem o próprio. */
export function validatedBy(f) {
  if (!f) return null;
  if (f.frozen) return f.frozen;
  return dayProgress(f).find(c => c.done)?.id ?? null;
}
export const isValidDay = f => validatedBy(f) != null;

const dow = iso => fromISO(iso).getDay(); // 0 = domingo
/** Dias de descanso valendo numa data: a escolha vale dali para a frente (restHistory), nunca para trás. */
export function restOn(date, cfg = DEFAULT_STREAK) {
  const hist = cfg.restHistory ?? [];
  let days = hist.length ? [] : (cfg.restDays ?? []);
  for (const h of hist) if (h.from <= date) days = h.days;
  return new Set(days.slice(0, MAX_REST_DAYS));
}
export const inPause = (date, pauses = []) => pauses.some(p => date >= p.from && (!p.to || date <= p.to));

/**
 * Simula a ofensiva dia a dia, de `start` até `today` (inclusive).
 * facts(date) -> fatos do dia. Devolve o resumo, o estado de cada dia e o critério que validou cada um.
 */
export function computeStreak({ start, today, facts, config = DEFAULT_STREAK }) {
  const cfg = { ...DEFAULT_STREAK, ...config };
  const days = {}, by = {};
  let current = 0, best = 0, shields = 0, totalActive = 0, runStart = null;
  let prevBest = 0, recordBeatenOn = null, comebackOn = null, brokeBefore = false;
  if (!start || start > today) start = today;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const v = validatedBy(facts(d));
    let st;
    if (v) {
      if (current === 0) runStart = d;
      current++; totalActive++; st = 'done'; by[d] = v;
      if (current % SHIELD_EVERY === 0 && shields < MAX_SHIELDS) shields++;
      if (prevBest >= 3 && current === prevBest + 1 && !recordBeatenOn) recordBeatenOn = d;
      if (brokeBefore && current === 7 && !comebackOn) comebackOn = d;
    } else if (inPause(d, cfg.pauses)) st = 'paused';
    else if (restOn(d, cfg).has(dow(d))) st = 'rest';
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
    current, best, shields, totalActive, runStart, days, by, recordBeatenOn, comebackOn,
    todayDone: days[today] === 'done',
    consistentWeeks: consistentWeeks(days, today, start),
    nextMilestone: MILESTONES.find(m => m > current) ?? null,
  };
}

/** Semanas consistentes: 4+ dias cumpridos, ou todos os que contavam (mínimo 3) numa semana já fechada. */
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
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const rest = restOn(date > today ? today : date, config);
    if (date > today) return { date, state: rest.has(dow(date)) ? 'rest-future' : inPause(date, config.pauses) ? 'paused' : 'future' };
    return { date, state: days[date] ?? (rest.has(dow(date)) ? 'rest' : 'none') };
  });
}

/** Nível visual da chama pelos marcos (0: até 6 dias, 1: 7+, 2: 30+, 3: 100+). */
export const flameTier = n => (n >= 100 ? 3 : n >= 30 ? 2 : n >= 7 ? 1 : 0);

/** Mensagem curta e positiva para o cartão. Nunca culpa. */
export function streakMessage(s) {
  if (s.current === 0) return s.best > 0 ? 'Hoje é um bom dia para retomar a sua rotina, no seu ritmo.' : 'Cumpra um dos três critérios de hoje para acender a sua ofensiva.';
  if (!s.todayDone) return 'Sua ofensiva continua. Cumpra um dos critérios de hoje para mantê-la.';
  if (s.current >= s.best && s.best >= 3) return 'Este é o seu recorde pessoal. Continue respeitando o seu ritmo.';
  if (s.best - s.current <= 3 && s.best >= 5) return `Seu recorde pessoal (${s.best} dias) está cada vez mais próximo.`;
  if (s.nextMilestone && s.nextMilestone - s.current <= 2) return `Faltam ${s.nextMilestone - s.current} ${s.nextMilestone - s.current === 1 ? 'dia' : 'dias'} para o marco de ${s.nextMilestone} dias.`;
  return 'Ofensiva mantida! Você completou mais um dia da sua rotina.';
}
