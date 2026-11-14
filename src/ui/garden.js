// Aba Progresso > Jardim: a árvore da ofensiva, a vitalidade, as árvores especiais, as decorações
// e as memórias. Tudo vem de evolution() (registros reais), nada é inventado.
import { h, icon, int, openSheet } from './dom.js';
import { go } from './state.js';
import { evolution } from '../evolution.js';
import { STAGES, SPECIAL_TREES, DECORATIONS, VITALITY_STEP } from '../lib/garden.js';
import { todayISO, fmtDate, diffDays } from '../lib/dates.js';
import { treeArt } from './gardenArt.js';
import { gardenCanvas } from './gardenCanvas.js';

const long = d => fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
const SEASON_LABEL = { primavera: 'Primavera', verao: 'Verão', outono: 'Outono', inverno: 'Inverno' };
const WATERED = 'leve-garden-watered';

export function gardenView() {
  const today = todayISO();
  const evo = evolution(today);
  const g = evo.garden, cur = g.current, st = evo.streak;
  let watering = false;
  if (st.todayDone && cur) { try { watering = localStorage.getItem(WATERED) !== today; localStorage.setItem(WATERED, today); } catch { /* sem armazenamento */ } }
  const specials = SPECIAL_TREES.filter(t => g.special[t.id]);
  const decorations = DECORATIONS.filter(d => evo.level.level >= d.level).map(d => d.id);

  const scene = h('section.card.garden-card', { 'aria-label': 'Meu Jardim' },
    h('div.garden-head', h('h2', 'Meu Jardim'), h('span.garden-season', SEASON_LABEL[g.season])),
    h('div.garden-stage', gardenCanvas({
      main: cur ? { waterings: cur.waterings, vitality: cur.vitality, id: cur.id } : null,
      specials: specials.map(t => ({ kind: t.kind, id: t.id })), memories: g.memories.length, decorations, season: g.season, watering,
    })),
    mainStatus(evo, today));

  return h('div.garden-view',
    scene,
    specialSection(g),
    decorationSection(evo),
    memorySection(g),
    h('button.link.garden-how', { type: 'button', onclick: () => rulesSheet() }, 'Como o jardim funciona'));
}

// Estado da árvore principal: fase, regadas, vitalidade e o que fazer agora.
function mainStatus(evo, today) {
  const g = evo.garden, cur = g.current, st = evo.streak;
  if (!cur) {
    return h('div.garden-status',
      h('p.garden-title', g.memories.length ? 'Um novo começo' : 'Plante a sua primeira árvore'),
      h('p.garden-text', 'A próxima regada planta uma nova árvore. Para regar, cumpra por inteiro um dos critérios do dia: hidratação, alimentação ou atividade física.'),
      h('button.btn.tonal.compact', { type: 'button', onclick: () => go('progresso', { progressView: 'conquistas' }) }, 'Ver os critérios de hoje'));
  }
  const vit = cur.vitality, tone = vit > 50 ? 'ok' : vit > 20 ? 'warn' : 'low';
  const nextStage = cur.stage.next;
  const age = diffDays(cur.planted, today) + 1;
  const text = st.todayDone ? 'Regada de hoje feita.'
    : g.yesterdayOpen ? 'Ontem ficou sem regada. Você ainda pode registrar o dia de ontem até o fim de hoje.'
      : 'Hoje ainda sem regada. Cumpra um dos três critérios do dia para regar.';
  return h('div.garden-status',
    h('div.garden-row',
      h('div', h('p.garden-kicker', cur.stage.label), h('p.garden-title', `${cur.waterings} ${cur.waterings === 1 ? 'regada' : 'regadas'}`)),
      h('div.garden-age', h('b', age), h('span', age === 1 ? 'dia de vida' : 'dias de vida'))),
    h('div.vit', { 'data-tone': tone },
      h('div.vit-line', h('span', icon('drop'), 'Vitalidade'), h('b', `${vit}%`)),
      h('div.vit-bar', { role: 'progressbar', 'aria-label': `Vitalidade ${vit}%`, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': vit },
        Array.from({ length: 10 }, (_, i) => h('span' + (i < vit / VITALITY_STEP ? '.on' : '')))),
      vit < 100 ? h('p.vit-note', `${cur.daysLeft} ${cur.daysLeft === 1 ? 'dia completo' : 'dias completos'} sem regada até a árvore secar. Cada regada devolve ${VITALITY_STEP} pontos.`) : null),
    h('p.garden-text', text),
    nextStage ? h('p.garden-next', `Faltam ${nextStage.min - cur.waterings} ${nextStage.min - cur.waterings === 1 ? 'regada' : 'regadas'} para ${nextStage.label}.`) : h('p.garden-next', 'Sua árvore chegou à fase mais alta.'));
}

function specialSection(g) {
  return h('section.garden-sec', { 'aria-label': 'Árvores especiais' },
    h('div.garden-sec-head', h('h3', 'Árvores especiais'), h('span', `${Object.keys(g.special).length} de ${SPECIAL_TREES.length}`)),
    h('p.garden-sec-sub', 'Conquistas permanentes: nunca perdem vitalidade.'),
    h('ul.special-grid', SPECIAL_TREES.map(t => {
      const date = g.special[t.id];
      const have = Math.min(t.target, g.counts[t.count] ?? 0);
      return h('li', h('button.special' + (date ? '.on' : ''), { type: 'button', onclick: () => specialSheet(t, date, have) },
        h('span.special-art', treeArt({ stage: date ? 5 : 2, vitality: 100, kind: t.kind === 'round' ? 'agua' : t.kind, dead: false }, { size: 76 })),
        h('b', t.name),
        date ? h('span.special-date', long(date)) : h('span.special-prog', h('span.special-bar', h('span', { style: { width: `${(have / t.target) * 100}%` } })), `${have} de ${t.target}`)));
    })));
}
function specialSheet(t, date, have) {
  openSheet({ title: t.name, content: h('div.special-sheet',
    treeArt({ stage: date ? 6 : 2, vitality: 100, kind: t.kind === 'round' ? 'agua' : t.kind }, { size: 150 }),
    h('p.special-text', t.text),
    h('p.special-req', h('span', 'Requisito'), t.req),
    date ? h('p.special-when', `Conquistada em ${long(date)}`) : h('p.special-when.off', `${have} de ${t.target}`),
    h('p.fine', 'Árvores especiais são permanentes e não perdem vitalidade.')) });
}

function decorationSection(evo) {
  return h('section.garden-sec', { 'aria-label': 'Decorações' },
    h('div.garden-sec-head', h('h3', 'Decorações'), h('span', `Nível ${evo.level.level}`)),
    h('ul.deco-list', DECORATIONS.map(d => {
      const on = evo.level.level >= d.level;
      return h('li.deco' + (on ? '.on' : ''), h('span.deco-ic', icon(on ? 'check' : 'lock')), h('span.deco-name', d.name), h('span.deco-req', on ? 'No jardim' : `Nível ${d.level}`));
    })));
}

function memorySection(g) {
  return h('section.garden-sec', { 'aria-label': 'Memórias' },
    h('div.garden-sec-head', h('h3', 'Memórias'), h('span', g.memories.length ? `${g.memories.length} ${g.memories.length === 1 ? 'árvore' : 'árvores'}` : '')),
    g.current || g.memories.length ? h('ul.memory-list',
      g.current ? h('li.memory.alive', treeArt({ stage: g.current.stage.index, vitality: g.current.vitality, season: g.season }, { size: 44 }),
        h('div', h('b', 'Árvore atual'), h('span', `Plantada em ${long(g.current.planted)} · ${g.current.waterings} regadas`))) : null,
      g.memories.map(t => h('li.memory', treeArt({ stage: Math.min(5, stageIndex(t.waterings)), vitality: 0, dead: true }, { size: 44 }),
        h('div', h('b', STAGES[stageIndex(t.waterings)].label), h('span', `${long(t.planted)} a ${long(t.died)} · ${t.waterings} ${t.waterings === 1 ? 'regada' : 'regadas'}`)))))
      : h('p.garden-sec-sub', 'O histórico de todas as árvores que você cultivar fica aqui.'));
}
const stageIndex = w => { let i = 0; STAGES.forEach((s, k) => { if (w >= s.min) i = k; }); return i; };

function rulesSheet() {
  openSheet({ title: 'Como o jardim funciona', content: h('div.rules-sheet',
    h('ul.rules-text',
      h('li', 'Cada dia validado da ofensiva é uma regada. A primeira regada planta a árvore.'),
      h('li', 'A árvore cresce com as regadas: germinação (1–3), primeiro crescimento (4–7), desenvolvimento (8–15), fortalecimento (16–30), florescimento (31–60), madura (61–100) e extraordinária (mais de 100).'),
      h('li', 'Cada dia completo sem regada tira 10 pontos de vitalidade. O dia só conta como completo depois do prazo de registro (o dia e o seguinte).'),
      h('li', 'Uma regada interrompe a perda na hora e devolve 10 pontos, até 100%. A fase da árvore se mantém enquanto ela viver.'),
      h('li', 'Dias de descanso, pausas (viagem, saúde) e proteções da ofensiva não tiram vitalidade.'),
      h('li', 'Com 0% a árvore seca. Ela não volta, mas fica nas memórias do jardim, e a próxima regada planta uma nova.'),
      h('li', 'Árvores especiais são conquistas permanentes. Decorações chegam com os níveis de experiência.'))) });
}
