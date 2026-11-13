// Experiência (XP) e níveis. Função pura, testável.
//
// A XP é sempre RECALCULADA dos registros (não é um contador que só sobe), então uma mesma ação
// nunca vale duas vezes e corrigir um registro corrige a XP. Regras, mostradas na tela:
// - Dia cumprido da ofensiva: +10 (uma vez por data).
// - No mesmo dia, metas pessoais: meta de líquidos +5, atividade feita +5, metade da rotina +5.
// - Desafio concluído: +50 (uma vez por desafio iniciado).
// - Conquista desbloqueada: +25 (uma vez por conquista).
// Abrir o app não vale nada.

export const XP_RULES = { day: 10, water: 5, activity: 5, routine: 5, challenge: 50, achievement: 25 };

// Nomes de crescimento, do começo ao amadurecimento da rotina.
export const LEVELS = [
  { level: 1, name: 'Semente', at: 0 },
  { level: 2, name: 'Broto', at: 100 },
  { level: 3, name: 'Muda', at: 250 },
  { level: 4, name: 'Raiz', at: 450 },
  { level: 5, name: 'Caule', at: 700 },
  { level: 6, name: 'Folhagem', at: 1000 },
  { level: 7, name: 'Flor', at: 1400 },
  { level: 8, name: 'Árvore', at: 1900 },
  { level: 9, name: 'Bosque', at: 2500 },
  { level: 10, name: 'Floresta', at: 3200 },
];
const EXTRA_STEP = 800; // depois do nível 10, cada nível pede 800 XP

/** Nível de uma quantidade de XP, com quanto falta para o próximo. */
export function levelFor(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.at) cur = l;
  let { level, name, at } = cur;
  if (level === 10 && xp >= at + EXTRA_STEP) {
    const extra = Math.floor((xp - at) / EXTRA_STEP);
    level += extra; at += extra * EXTRA_STEP; name = 'Floresta';
  }
  const nextAt = level < 10 ? LEVELS[level].at : at + EXTRA_STEP;
  const nextName = level < 10 ? LEVELS[level].name : 'Floresta';
  return { level, name, at, nextAt, nextName, inLevel: xp - at, span: nextAt - at, pct: Math.min(1, (xp - at) / (nextAt - at)) };
}

/**
 * XP total e o detalhamento.
 * days: estados por data (de computeStreak). facts(date): fatos do dia.
 * concluded: ids dos desafios concluídos. achievements: ids das conquistas desbloqueadas.
 */
export function computeXP({ days = {}, facts = () => null, concluded = [], achievements = [] }) {
  const parts = { days: 0, goals: 0, challenges: 0, achievements: 0 };
  for (const [date, st] of Object.entries(days)) {
    if (st !== 'done') continue;
    parts.days += XP_RULES.day;
    const f = facts(date) ?? {};
    if (f.waterMet) parts.goals += XP_RULES.water;
    if (f.activity) parts.goals += XP_RULES.activity;
    if (f.routineHalf) parts.goals += XP_RULES.routine;
  }
  parts.challenges = new Set(concluded).size * XP_RULES.challenge;
  parts.achievements = new Set(achievements).size * XP_RULES.achievement;
  return { xp: parts.days + parts.goals + parts.challenges + parts.achievements, parts };
}
