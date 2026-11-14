// Jardim: a árvore principal da ofensiva, a vitalidade, as árvores especiais e o histórico.
// Função pura, sem rede, testável — tira tudo dos estados de cada dia da ofensiva (computeStreak).
//
// Regras (mostradas em "Como o jardim funciona"):
// - Cada dia validado é uma regada. O primeiro dia validado planta a árvore (ou uma nova, depois de
//   uma árvore seca). Cada regada soma 1 ao crescimento e devolve 10 pontos de vitalidade (até 100%).
// - Um dia completo sem validação tira 10 pontos. "Completo" quer dizer que o prazo de registro já
//   fechou (o dia e o seguinte); por isso uma árvore nunca seca e "volta" por um registro atrasado.
// - Descanso, pausa e proteção da ofensiva não tiram vitalidade: a árvore espera.
// - Em 0% a árvore seca de vez. O registro dela fica nas memórias do jardim; a próxima regada planta outra.
// - O estágio de crescimento vem das regadas daquela árvore, então ele se mantém enquanto ela viver,
//   mesmo que a ofensiva recomece.
// - Árvores especiais são conquistas permanentes: nunca perdem vitalidade.
import { addDays } from './dates.js';

export const VITALITY_STEP = 10;
export const STAGES = [
  { id: 'germinacao', label: 'Germinação', min: 1 },
  { id: 'broto', label: 'Primeiro crescimento', min: 4 },
  { id: 'desenvolvimento', label: 'Desenvolvimento', min: 8 },
  { id: 'fortalecimento', label: 'Fortalecimento', min: 16 },
  { id: 'florescimento', label: 'Florescimento', min: 31 },
  { id: 'madura', label: 'Árvore madura', min: 61 },
  { id: 'extraordinaria', label: 'Árvore extraordinária', min: 101 },
];
export function stageOf(waterings) {
  let i = 0;
  STAGES.forEach((s, k) => { if (waterings >= s.min) i = k; });
  return { index: i, ...STAGES[i], next: STAGES[i + 1] ?? null };
}

// Árvores especiais: permanentes. `count` diz o que conta; a data é o dia em que o requisito foi atingido.
export const SPECIAL_TREES = [
  { id: 'constancia', name: 'Árvore da Constância', text: 'Nasce de uma rotina que se repete com calma.', req: '30 dias seguidos de ofensiva', kind: 'cone', count: 'streak', target: 30 },
  { id: 'vitalidade', name: 'Árvore da Vitalidade', text: 'Cresce com a água de cada dia.', req: '30 dias com a meta de líquidos cumprida', kind: 'round', palette: 'agua', count: 'agua', target: 30 },
  { id: 'nutricao', name: 'Árvore da Nutrição', text: 'Dá frutos quando todas as refeições acontecem.', req: '30 dias com todas as refeições registradas', kind: 'fruit', count: 'refeicoes', target: 30 },
  { id: 'resistencia', name: 'Árvore da Resistência', text: 'Folhas fortes de quem se movimenta.', req: '30 dias com a meta de atividade cumprida', kind: 'maple', count: 'atividade', target: 30 },
  { id: 'superacao', name: 'Árvore da Superação', text: 'Floresce depois de um tempo difícil.', req: 'Recuperar uma árvore de 30% ou menos até 100%', kind: 'blossom', count: 'superacao', target: 1 },
  { id: 'centenaria', name: 'Árvore Centenária', text: 'Cem regadas ao longo do caminho.', req: '100 dias validados no total', kind: 'golden', count: 'total', target: 100 },
];

// Decorações: desbloqueadas pelo nível de XP (a mesma progressão da aba Conquistas).
export const DECORATIONS = [
  { id: 'banco', name: 'Banco de madeira', level: 2 },
  { id: 'lanterna', name: 'Lanterna de pedra', level: 3 },
  { id: 'pedras', name: 'Caminho de pedras', level: 4 },
  { id: 'flores', name: 'Canteiro de flores', level: 5 },
  { id: 'lago', name: 'Pequeno lago', level: 6 },
  { id: 'ponte', name: 'Ponte', level: 8 },
];

/**
 * Simula o jardim de `start` até `today`.
 * days: estados por data (computeStreak). doneOf(date): critérios cumpridos no dia.
 * Devolve { current, trees, special, counts, yesterdayOpen }.
 */
export function simulateGarden({ start, today, days, doneOf = () => [] }) {
  const trees = [];
  let cur = null, streak = 0;
  const counts = { agua: 0, refeicoes: 0, atividade: 0, total: 0, streak: 0, superacao: 0 };
  const special = {};
  const reach = (key, d) => { for (const t of SPECIAL_TREES) if (t.count === key && !special[t.id] && counts[key] >= t.target) special[t.id] = d; };
  const closedBefore = addDays(today, -1); // dias antes disso já fecharam o prazo de registro
  if (!start || start > today) start = today;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const st = days[d];
    if (st === 'done') {
      if (!cur) { cur = { id: 't' + d.replaceAll('-', ''), planted: d, waterings: 0, vitality: 100, low: 100, died: null, lastWater: null }; trees.push(cur); }
      cur.waterings++; cur.lastWater = d;
      const before = cur.vitality;
      cur.vitality = Math.min(100, cur.vitality + VITALITY_STEP);
      if (cur.low <= 30 && before < 100 && cur.vitality === 100) { counts.superacao++; reach('superacao', d); cur.low = 100; }
      streak++; counts.total++; counts.streak = Math.max(counts.streak, streak);
      for (const c of new Set(doneOf(d))) if (c in counts) { counts[c]++; reach(c, d); }
      reach('total', d); reach('streak', d);
    } else if (st === 'missed') {
      streak = 0;
      if (cur && d < closedBefore) {
        cur.vitality = Math.max(0, cur.vitality - VITALITY_STEP);
        cur.low = Math.min(cur.low, cur.vitality);
        if (cur.vitality === 0) { cur.died = d; cur = null; }
      }
    } else if (st === 'protected' || st === 'rest' || st === 'paused' || st === 'pending' || st === 'none') {
      // neutros: a árvore espera
    }
  }
  for (const t of trees) t.stage = stageOf(t.waterings);
  const yesterday = addDays(today, -1);
  return {
    current: cur ? { ...cur, stage: stageOf(cur.waterings), daysLeft: Math.ceil(cur.vitality / VITALITY_STEP) } : null,
    trees, special, counts,
    yesterdayOpen: !!cur && days[yesterday] === 'missed', // ontem sem regada, ainda dá para registrar hoje
  };
}

/** Junta as árvores calculadas com as guardadas (história que já saiu da janela de cálculo). */
export function mergeHistory(computed, stored = {}) {
  const map = new Map(Object.entries(stored));
  for (const t of computed) if (t.died) map.set(t.id, { planted: t.planted, died: t.died, waterings: t.waterings });
  return map;
}

/** Estação do ano no Brasil (hemisfério sul), para um leve tom no jardim. */
export const seasonOf = date => {
  const m = Number(date.slice(5, 7));
  return m >= 9 && m <= 11 ? 'primavera' : m === 12 || m <= 2 ? 'verao' : m <= 5 ? 'outono' : 'inverno';
};
