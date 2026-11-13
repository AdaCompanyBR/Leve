// Evolução pessoal: liga as regras puras (ofensiva, XP, conquistas) aos registros reais do app.
// Nada aqui inventa dado: tudo sai do diário, dos líquidos, das atividades, da rotina e dos desafios.
import { state, liquidsOn, waterGoalOn, routineStatus, getRoutine } from './store.js';
import { computeStreak, DEFAULT_STREAK } from './lib/streak.js';
import { computeXP, levelFor } from './lib/xp.js';
import { achievementProgress } from './lib/challenges.js';
import { todayISO, addDays } from './lib/dates.js';

const HISTORY_DAYS = 400; // até onde a ofensiva olha para trás

export const streakConfig = () => {
  const c = state.settings.streak ?? {};
  return { ...DEFAULT_STREAK, ...c, criteria: { ...DEFAULT_STREAK.criteria, ...(c.criteria ?? {}) } };
};

/** Fatos de cada dia, indexados uma vez por cálculo. */
function factsIndex() {
  const meals = new Map(), acts = new Set(), challenges = new Set();
  for (const e of state.entries) { const s = meals.get(e.date) ?? new Set(); s.add(e.meal); meals.set(e.date, s); }
  for (const a of state.activities) if (a.status === 'feita') acts.add(a.date);
  for (const uc of state.myChallenges) if (uc.status === 'concluido' && uc.endDate) challenges.add(uc.endDate);
  const routine = getRoutine();
  const cache = new Map();
  return date => {
    if (cache.has(date)) return cache.get(date);
    const goal = waterGoalOn(date);
    let routineHalf = false;
    if (routine) { const r = routineStatus(date, routine); routineHalf = !!r && r.total > 0 && r.done / r.total >= 0.5; }
    const f = {
      meals: meals.get(date)?.size ?? 0,
      waterMet: goal > 0 && liquidsOn(date).total >= goal,
      activity: acts.has(date),
      routineHalf,
      challengeDone: challenges.has(date),
    };
    cache.set(date, f);
    return f;
  };
}

/** Primeiro dia com algum registro (ou a data de cadastro), limitado a HISTORY_DAYS. */
function startDate(today) {
  const dates = [state.profile?.createdAt?.slice(0, 10)];
  for (const e of state.entries) dates.push(e.date);
  for (const d of state.drinks) dates.push(d.date);
  for (const a of state.activities) if (a.status === 'feita') dates.push(a.date);
  for (const k of Object.keys(state.water ?? {})) dates.push(k);
  const first = dates.filter(d => d && d <= today).sort()[0] ?? today;
  const floor = addDays(today, -HISTORY_DAYS);
  return first < floor ? floor : first;
}

/** Tudo o que a aba Conquistas mostra, calculado agora. */
export function evolution(today = todayISO(), evals = {}) {
  const facts = factsIndex();
  const config = streakConfig();
  const s = computeStreak({ start: startDate(today), today, facts, config });
  // O recorde guardado nunca diminui (por exemplo, se um registro antigo for apagado).
  const best = Math.max(s.best, state.evolution?.best ?? 0);
  const streak = { ...s, best };
  const concluded = state.myChallenges.filter(uc => uc.status === 'concluido').map(uc => uc.id);
  const unlocked = Object.keys(state.achievements ?? {});
  const xp = computeXP({ days: s.days, facts, concluded, achievements: unlocked });
  return { streak, config, facts, xp, level: levelFor(xp.xp), progress: achievementProgress({ mine: state.myChallenges, evals, streak }), unlocked };
}
