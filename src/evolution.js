// Evolução pessoal: liga as regras puras (ofensiva, XP, conquistas) aos registros reais do app.
// Nada aqui inventa dado: tudo sai do diário, dos líquidos, das atividades e da rotina.
// A validação é automática: a pessoa não escolhe critério. Os dias validados que já passaram do prazo
// de registro ficam congelados em kv 'evolution' (validated), sincronizado com a conta.
import { state, waterGoalOn, routineStatus, getRoutine } from './store.js';
import { computeStreak, DEFAULT_STREAK, dayProgress, validDrinks, activeMinutes, graceEnd, MAX_REST_DAYS } from './lib/streak.js';
import { dayTotal } from './lib/hydration.js';
import { computeXP, levelFor, XP_RULES } from './lib/xp.js';
import { achievementProgress, ACHIEVEMENTS } from './lib/challenges.js';
import { todayISO, addDays } from './lib/dates.js';
import { simulateGarden, mergeHistory, seasonOf } from './lib/garden.js';

const HISTORY_DAYS = 400; // até onde a ofensiva olha para trás

export const streakConfig = () => {
  const c = state.settings.streak ?? {};
  // Quem escolheu dias de descanso antes do histórico existir: valem desde sempre (como já valiam).
  const restHistory = c.restHistory ?? (c.restDays?.length ? [{ from: '0000-00-00', days: c.restDays }] : []);
  const current = restHistory.length ? restHistory[restHistory.length - 1].days : [];
  return { ...DEFAULT_STREAK, restDays: current.slice(0, MAX_REST_DAYS), restHistory, pauses: c.pauses ?? [] };
};

/**
 * Fatos de um dia, só com registros válidos (no prazo e sem repetição).
 * Devolve { water, waterGoal, waterBlocked, mealsDone, mealsTotal, activeMin } ou { frozen, frozenDone }.
 */
function factsIndex(today) {
  const routine = getRoutine();
  const frozen = state.evolution?.validated ?? {};
  const cache = new Map();
  return date => {
    if (cache.has(date)) return cache.get(date);
    let f;
    if (frozen[date] && date < addDays(today, -1)) f = { frozen: frozen[date].by, frozenDone: frozen[date].done ?? [frozen[date].by] };
    else {
      const end = graceEnd(date);
      const drinks = validDrinks(state.drinks, date);
      const water = dayTotal(drinks, state.water, date).total;
      // Refeições previstas: os horários da rotina; uma refeição conta com um item registrado no prazo.
      let mealsDone = 0, mealsTotal = 0;
      if (routine) {
        const r = routineStatus(date, routine);
        const early = new Set(state.entries.filter(e => e.date === date && (e.ts ?? 0) <= end).map(e => e.id));
        // routineStatus olha todos os itens; refaz a contagem só com os que estão no prazo.
        const byMeal = {};
        for (const e of state.entries) if (early.has(e.id)) byMeal[e.meal] = (byMeal[e.meal] ?? 0) + 1;
        const used = {};
        for (const s of r?.schedule ?? []) { const i = used[s.meal] = (used[s.meal] ?? -1) + 1; mealsTotal++; if ((byMeal[s.meal] ?? 0) > i) mealsDone++; }
      }
      f = { water, waterGoal: waterGoalOn(date), waterBlocked: !!state.settings.fluidRestriction, mealsDone, mealsTotal, activeMin: activeMinutes(state.activities, date) };
    }
    cache.set(date, f);
    return f;
  };
}
const doneList = f => (f?.frozen ? f.frozenDone : dayProgress(f).filter(c => c.done).map(c => c.id));

/** Primeiro dia com algum registro (ou a data de cadastro), limitado a HISTORY_DAYS. */
function startDate(today) {
  const dates = [state.profile?.createdAt?.slice(0, 10), ...Object.keys(state.evolution?.validated ?? {})];
  for (const e of state.entries) dates.push(e.date);
  for (const d of state.drinks) dates.push(d.date);
  for (const a of state.activities) if (a.status === 'feita') dates.push(a.date);
  for (const k of Object.keys(state.water ?? {})) dates.push(k);
  const first = dates.filter(d => d && d <= today).sort()[0] ?? today;
  const floor = addDays(today, -HISTORY_DAYS);
  return first < floor ? floor : first;
}

const xpOf = id => ACHIEVEMENTS.find(a => a.id === id)?.xp ?? XP_RULES.achievement;

/** Tudo o que a aba Conquistas mostra, calculado agora. */
export function evolution(today = todayISO(), evals = {}) {
  const facts = factsIndex(today);
  const config = streakConfig();
  const s = computeStreak({ start: startDate(today), today, facts, config });
  // O recorde guardado nunca diminui (por exemplo, se um registro antigo for apagado).
  const best = Math.max(s.best, state.evolution?.best ?? 0);
  const streak = { ...s, best };
  const concluded = state.myChallenges.filter(uc => uc.status === 'concluido').map(uc => uc.id);
  const unlocked = Object.keys(state.achievements ?? {}).filter(id => ACHIEVEMENTS.some(a => a.id === id));
  const xp = computeXP({ days: s.days, doneOf: d => doneList(facts(d)), concluded, achievements: unlocked, xpOf });
  const todayProgress = dayProgress(facts(today));
  // Jardim: a árvore da ofensiva, as especiais (permanentes) e as memórias (árvores secas).
  const g = simulateGarden({ start: startDate(today), today, days: s.days, doneOf: d => doneList(facts(d)) });
  const stored = state.evolution?.garden ?? {};
  const special = { ...g.special, ...(stored.special ?? {}) }; // uma conquista guardada nunca some
  const memories = [...mergeHistory(g.trees, stored.dead ?? {}).entries()].map(([id, t]) => ({ id, ...t })).sort((a, b) => b.died.localeCompare(a.died));
  const garden = { ...g, special, memories, season: seasonOf(today) };
  return { streak, config, facts, xp, level: levelFor(xp.xp), todayProgress, garden, progress: achievementProgress({ mine: state.myChallenges, evals, streak }), unlocked };
}

/** Dias validados que já passaram do prazo de registro e ainda não estão congelados. */
export function toFreeze(evo, today = todayISO()) {
  const frozen = state.evolution?.validated ?? {}, out = {};
  for (const [d, st] of Object.entries(evo.streak.days)) {
    if (st === 'done' && d < addDays(today, -1) && !frozen[d]) out[d] = { by: evo.streak.by[d], done: doneList(evo.facts(d)) };
  }
  return out;
}
