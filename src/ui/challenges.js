// Desafios e Conquistas, dentro da aba Progresso: catálogo com filtros, recomendações a partir dos
// registros, campanha da época, página de cada desafio (Sobre, Dicas, Progresso), início com
// aviso de segurança e meta individual, acompanhamento automático, pausa, abandono e conquistas.
import { h, icon, int, toast, openSheet, segmented, confirmSheet, busy, picker } from './dom.js';
import { ui, go } from './state.js';
import { state, foodById, getPlan, waterGoalOn, startChallenge, updateChallenge, saveCheckin, unlockAchievements } from '../store.js';
import { todayISO, addDays, fmtDate, diffDays } from '../lib/dates.js';
import { CHALLENGES, CATEGORIES, categoryById, challengeById, sources, evaluate, trend, adaptiveSuggestion, defaultTarget, startBlock, recommend, campaignFor, ACHIEVEMENTS, earned, levelOf, SAFETY, DISCOMFORT, addMin } from '../lib/challenges.js';
import { challengeArt, medalArt, glyph } from './challengeArt.js';

const long = d => fmtDate(d, { day: 'numeric', month: 'long' });
const restricted = () => !!state.settings.fluidRestriction;
const kcalTarget = () => getPlan()?.target ?? null;
const STATUS = { ativo: 'Em andamento', pausado: 'Pausado', concluido: 'Concluído', abandonado: 'Encerrado', disponivel: 'Disponível' };
const mineFor = id => state.myChallenges.filter(c => c.challengeId === id);
const current = id => mineFor(id).find(c => c.status === 'ativo' || c.status === 'pausado') ?? null;

export function dataSource() {
  return sources({ drinks: state.drinks, legacy: state.water, goalFor: waterGoalOn, entries: state.entries, foodById, activities: state.activities, checkins: state.checkins, kcalTarget: kcalTarget() });
}

const evalOf = (uc, src = dataSource()) => evaluate(challengeById(uc.challengeId), uc, src, todayISO());
const targetText = (def, t) => {
  if (!def.targets || t == null) return null;
  if (def.targets.kind === 'sleep') return `Dormir às ${t.bed} e acordar às ${t.wake} (até 45 min de diferença)`;
  const o = def.targets.options.find(x => x.id === t);
  return { share: `Dia conta com ${o?.label}`, minutes: `${t} min de atividade por dia`, total: `${t} minutos de caminhada no total`, days: `${t} dias ativos em 21 dias`, pauses: `${t} pausas por dia`, screens: `${o?.label} sem telas antes de dormir` }[def.targets.key];
};
const dots = n => h('span.ch-level', { 'aria-label': `Dificuldade ${['', 'leve', 'média', 'alta'][n]}` }, [1, 2, 3].map(i => h('i' + (i <= n ? '.on' : ''))));

// ---------------------------------------------------------------------------
// Avaliação contínua: conclusão, conquistas e avisos positivos.

const SEEN = 'leve-ch-avisos';
const seen = { get() { try { return JSON.parse(localStorage.getItem(SEEN)) ?? {}; } catch { return {}; } }, set(v) { try { localStorage.setItem(SEEN, JSON.stringify(v)); } catch { /* sem armazenamento */ } } };
let running = false;
export async function syncChallenges({ notify = true } = {}) {
  if (running || !state.profile) return;
  running = true;
  try {
    const src = dataSource(), today = todayISO(), evals = {};
    const say = notify && state.settings.challengeNotify !== false ? toast : () => {};
    const memo = seen.get();
    for (const uc of state.myChallenges) {
      if (uc.status !== 'ativo') { if (uc.final) evals[uc.id] = uc.final; continue; }
      const def = challengeById(uc.challengeId);
      if (!def) continue;
      const ev = evaluate(def, uc, src, today);
      evals[uc.id] = ev;
      if (ev.done) {
        await updateChallenge(uc.id, { status: 'concluido', endDate: today, final: summary(ev) });
        say(`Parabéns! Você concluiu "${def.title}".`);
        continue;
      }
      const prev = memo[uc.id] ?? 0, now = def.total ? Math.floor(ev.pct / 10) : ev.completed;
      if (now > prev) {
        const near = ev.pct >= 80;
        say(near ? `"${def.title}" está quase completo. Continue respeitando o seu ritmo.` : `Você está evoluindo! Mais um dia concluído em "${def.title}".`);
        memo[uc.id] = now;
      }
    }
    // Pausados há 3 dias ou mais: um convite gentil, no máximo a cada 3 dias.
    for (const uc of state.myChallenges.filter(c => c.status === 'pausado')) {
      const p = uc.pauses?.[uc.pauses.length - 1], key = uc.id + ':pausa';
      if (p && diffDays(p.from, today) >= 3 && (!memo[key] || diffDays(memo[key], today) >= 3)) {
        say(`Quando fizer sentido para você, "${challengeById(uc.challengeId)?.title}" está esperando.`); memo[key] = today;
      }
    }
    seen.set(memo);
    const fresh = await unlockAchievements(earned({ mine: state.myChallenges, evals }), today);
    for (const id of fresh) say(`Nova conquista: ${ACHIEVEMENTS.find(a => a.id === id)?.title}!`);
  } finally { running = false; }
}
const summary = ev => ({ completed: ev.completed, needed: ev.needed, pct: ev.pct, sum: ev.sum, totalTarget: ev.totalTarget, days: ev.days.map(d => ({ date: d.date, done: d.done, value: d.value })) });

// ---------------------------------------------------------------------------
// Aba Progresso: Desafios

let filterCat = 'todos', filterDays = 0;

function card(def, { uc, ev, why } = {}) {
  const c = categoryById(def.cat), st = uc?.status ?? 'disponivel';
  return h('button.ch-card', { type: 'button', style: { '--c': c.color, '--ink': c.ink }, onclick: () => challengeSheet(def.id),
    'aria-label': `${def.title}, ${c.label}, ${def.days} dias, ${STATUS[st]}${ev ? `, ${ev.pct}%` : ''}` },
  h('div.ch-card-text',
    h('span.ch-cat', c.label),
    h('b.ch-title', def.title),
    h('span.ch-short', why ?? def.short),
    h('span.ch-meta', h('span.ch-days', `${def.days} dias`), dots(def.level), st !== 'disponivel' ? h('span.ch-state', { 'data-s': st }, STATUS[st]) : null),
    ev ? h('span.ch-bar', h('span', { style: { width: ev.pct + '%' } })) : null),
  challengeArt(def, { size: 104 }));
}

export function challengesView() {
  const src = dataSource(), today = todayISO();
  const mine = state.myChallenges.filter(c => c.status === 'ativo' || c.status === 'pausado');
  const activeIds = mine.map(c => c.challengeId);
  const recs = recommend({ src, today, active: activeIds, restricted: restricted(), kcalTarget: kcalTarget() });
  const camp = campaignFor(today);
  const list = CHALLENGES.filter(d => (filterCat === 'todos' || d.cat === filterCat) && (!filterDays || d.days === filterDays) && !activeIds.includes(d.id));
  const done = state.myChallenges.filter(c => c.status === 'concluido' || c.status === 'abandonado').sort((a, b) => (b.endDate ?? '').localeCompare(a.endDate ?? ''));
  const cc = categoryById(camp.cat);
  return h('div.ch-view',
    h('section.ch-campaign', { style: { '--c': cc.color, '--soft': cc.soft, '--cink': cc.ink } },
      h('span.ch-campaign-tag', camp.active ? 'Campanha da época' : `Próxima campanha · em ${camp.inDays} ${camp.inDays === 1 ? 'dia' : 'dias'}`),
      h('b', camp.title), h('p', camp.text),
      h('div.chip-row', camp.ids.map(id => h('button.chip', { type: 'button', onclick: () => challengeSheet(id) }, challengeById(id).title)))),
    mine.length ? h('section.ch-section', h('h3', 'Em andamento'), h('div.ch-grid', mine.map(uc => card(challengeById(uc.challengeId), { uc, ev: evalOf(uc, src) })))) : null,
    recs.length ? h('section.ch-section', h('h3', 'Recomendados para você'), h('p.card-sub', 'A partir dos seus registros dos últimos 14 dias.'),
      h('div.ch-grid', recs.map(r => card(challengeById(r.id), { why: r.why })))) : null,
    h('section.ch-section',
      h('h3', 'Todos os desafios'),
      // Filtros numa linha só: dois seletores lado a lado, que abrem a lista de opções.
      h('div.ch-filters', { role: 'group', 'aria-label': 'Filtros' },
        picker({ label: 'Categoria', value: filterCat, cls: 'ch-filter' + (filterCat !== 'todos' ? '.on' : ''),
          options: [{ id: 'todos', label: 'Categorias' }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label }))], onChange: v => { filterCat = v; go('progresso'); } }),
        picker({ label: 'Duração', value: filterDays, cls: 'ch-filter' + (filterDays ? '.on' : ''),
          options: [{ id: 0, label: 'Duração' }, { id: 7, label: '7 dias' }, { id: 14, label: '14 dias' }, { id: 21, label: '21 dias' }], onChange: v => { filterDays = Number(v); go('progresso'); } })),
      list.length ? h('div.ch-grid', list.map(d => card(d, { uc: mineFor(d.id).find(c => c.status === 'concluido') }))) : h('p.card-sub', 'Nenhum desafio com esses filtros.')),
    done.length ? h('section.ch-section', h('h3', 'Histórico'), h('ul.ch-history', done.map(uc => {
      const def = challengeById(uc.challengeId);
      return h('li', h('button', { type: 'button', onclick: () => challengeSheet(def.id, uc.id) },
        h('span.ch-dot', { style: { background: categoryById(def.cat).color } }), h('span.ch-h-title', def.title),
        h('span.ch-h-sub', `${STATUS[uc.status]} em ${long(uc.endDate ?? uc.startDate)} · ${uc.final?.completed ?? 0} de ${uc.final?.needed ?? def.days} dias`), icon('next')));
    }))) : null,
    h('p.fine.ch-safety', 'Os desafios têm finalidade educativa e não substituem orientação médica. ', h('button.link.inline', { type: 'button', onclick: () => safetySheet() }, 'Leia o aviso completo'), '.'));
}

// ---------------------------------------------------------------------------
// Aba Progresso: Conquistas

export function achievementsView() {
  const got = state.achievements ?? {}, n = Object.keys(got).length, lv = levelOf(n);
  return h('div.ch-view',
    h('section.ach-head',
      h('div.ach-level', h('span', 'Nível'), h('b', lv.level)),
      h('div', h('b', `${n} de ${ACHIEVEMENTS.length} conquistas`), h('p.card-sub', n < ACHIEVEMENTS.length ? `Mais ${lv.next} para o próximo nível. Conquistas vêm de desafios concluídos, nunca só de começar.` : 'Você desbloqueou todas.')),
      h('div.ach-bar', h('span', { style: { width: `${(n / ACHIEVEMENTS.length) * 100}%` } }))),
    h('div.ach-grid', ACHIEVEMENTS.map(a => {
      const date = got[a.id], color = a.cat ? categoryById(a.cat).color : '#E9B10C';
      return h('div.ach' + (date ? '.on' : ''), medalArt(a, { unlocked: !!date, color }), h('b', a.title), h('p', a.text),
        h('span.ach-date', date ? `Desde ${long(date)}` : 'Bloqueada'));
    })));
}

// ---------------------------------------------------------------------------
// Página do desafio

export function challengeSheet(id, ucId) {
  const def = challengeById(id), c = categoryById(def.cat);
  let uc = ucId ? state.myChallenges.find(x => x.id === ucId) : current(id);
  let tab = uc ? 'progresso' : 'sobre';
  const body = h('div.chd-body');
  const footer = h('div.chd-foot');
  const paint = () => {
    uc = ucId ? state.myChallenges.find(x => x.id === ucId) : current(id) ?? uc;
    const tabs = [{ id: 'sobre', label: 'Sobre' }, { id: 'dicas', label: 'Dicas' }, ...(uc ? [{ id: 'progresso', label: 'Progresso' }] : [])];
    body.replaceChildren(
      h('div.chd-tabs', segmented(tabs, tab, v => { tab = v; paint(); }, 'Seções do desafio')),
      tab === 'sobre' ? aboutTab(def) : tab === 'dicas' ? tipsTab(def) : progressTab(def, uc, paint));
    const block = startBlock(def, { restricted: restricted(), kcalTarget: kcalTarget() });
    const live = uc && (uc.status === 'ativo' || uc.status === 'pausado');
    footer.replaceChildren(...[live ? null
      : block ? h('p.chd-block', block)
        : h('button.btn.primary.block.chd-start', { type: 'button', onclick: () => startSheet(def, () => { tab = 'progresso'; uc = current(id); ucId = null; paint(); }) }, uc ? 'Fazer de novo' : 'Iniciar este desafio')].filter(Boolean));
  };
  const sheet = openSheet({ title: def.title, wide: true, content: [
    h('header.chd-hero', { style: { '--c': c.color, '--ink': c.ink } }, challengeArt(def, { size: 150 }),
      h('div', h('span.ch-cat', c.label), h('h2', def.title), h('span.ch-meta', h('span.ch-days', `${def.days} dias`), dots(def.level)))),
    body, footer] });
  sheet.panel.classList.add('chd');
  sheet.panel.style.setProperty('--c', c.color);
  paint();
  return sheet;
}

const section = (title, ...kids) => h('section.chd-sec', h('h3', title), ...kids);
function aboutTab(def) {
  return h('div',
    section('O que é', h('p', def.about)),
    section('Objetivo', h('p', def.goal)),
    section('Como funciona', h('p', def.how), h('p.fine', 'Os dias não precisam ser seguidos. Perder um dia não zera nada.')),
    section('Benefícios esperados', h('ul.chd-benefits', def.benefits.map(([ic, text]) => h('li', h('span.chd-b-icon', glyph(ic, 26)), h('span', text)))), h('p.fine', 'Benefícios gerais de hábitos saudáveis, não resultados médicos garantidos.')),
    section('Como o app acompanha', h('p', def.measure)));
}
function tipsTab(def) {
  return h('div', section('Dicas para chegar lá', h('ol.chd-tips', def.tips.map(t => h('li', t)))),
    h('p.chd-warn', icon('alert'), h('span', DISCOMFORT)));
}

function progressTab(def, uc, repaint) {
  const ev = uc.status === 'ativo' || uc.status === 'pausado' ? evalOf(uc) : { ...uc.final, days: uc.final?.days ?? [] };
  const tr = uc.status === 'ativo' ? trend(ev.days) : null;
  const adapt = uc.status === 'ativo' ? adaptiveSuggestion(def, uc, ev) : null;
  const t = targetText(def, uc.target);
  const stat = (k, v) => h('div.chd-stat', h('span', k), h('b', v));
  const today = todayISO();
  return h('div',
    h('div.chd-progress',
      h('div.chd-pct', h('b', `${ev.pct ?? 0}%`), h('span', def.total ? `${int(ev.sum ?? 0)} de ${int(ev.totalTarget ?? uc.target)} minutos` : `${ev.completed ?? 0} de ${ev.needed ?? def.days} dias`)),
      h('div.ch-bar.big', { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': ev.pct ?? 0 }, h('span', { style: { width: (ev.pct ?? 0) + '%' } })),
      ev.missing ? h('p.fine', ev.missing) : null),
    h('div.chd-stats',
      stat('Situação', STATUS[uc.status]),
      stat('Início', long(uc.startDate)),
      stat(uc.status === 'concluido' ? 'Concluído em' : 'Previsão de conclusão', long(uc.endDate ?? uc.expectedEnd)),
      stat(def.total ? 'Faltam' : 'Dias restantes', def.total ? `${int(ev.remaining ?? 0)} min` : `${ev.remaining ?? 0}`),
      t ? stat('Sua meta', t) : null,
      tr ? stat('Evolução', { subindo: 'Melhorando na última semana', caindo: 'Um pouco abaixo da semana anterior', 'estável': 'Estável' }[tr]) : null),
    def.checkin && uc.status === 'ativo' ? checkinBlock(def, uc, today, repaint) : null,
    adapt ? h('div.chd-adapt', h('p', `Os últimos dias foram difíceis, e tudo bem. Quer ajustar a meta para ${adapt.label}? Você pode voltar a ela depois.`),
      h('button.btn.tonal.compact', { type: 'button', onclick: async () => { await updateChallenge(uc.id, { target: adapt.target }); toast('Meta ajustada'); repaint(); } }, `Ajustar para ${adapt.label}`)) : null,
    section('Histórico diário', h('div.chd-days', ev.days.map(d => h('span.chd-day' + (d.done ? '.done' : d.date === today ? '.today' : ''), { title: `${long(d.date)}: ${d.done ? 'cumprido' : 'não cumprido'}${d.value != null && d.value !== '' ? ` (${d.value}${d.unit ? ' ' + d.unit : ''})` : ''}` },
      h('span', fmtDate(d.date, { day: 'numeric' })), d.done ? icon('check') : null))),
      h('p.fine', 'Atualizado sozinho a partir dos seus registros. Dias em pausa não aparecem.')),
    uc.status === 'ativo' || uc.status === 'pausado' ? h('div.chd-actions',
      uc.status === 'ativo'
        ? h('button.btn.secondary', { type: 'button', onclick: async () => { await updateChallenge(uc.id, { status: 'pausado', pauses: [...(uc.pauses ?? []), { from: today }] }); toast('Desafio pausado. Retome quando quiser.'); repaint(); } }, 'Pausar')
        : h('button.btn.primary', { type: 'button', onclick: async () => { const p = [...uc.pauses]; p[p.length - 1] = { ...p[p.length - 1], to: today }; await updateChallenge(uc.id, { status: 'ativo', pauses: p }); toast('Desafio retomado'); repaint(); } }, 'Retomar'),
      h('button.btn.plain.danger', { type: 'button', onclick: () => confirmSheet({ title: 'Encerrar este desafio?', message: 'O que você já fez fica no histórico. Dá para começar de novo quando quiser.', confirmLabel: 'Encerrar',
        onConfirm: async () => { await updateChallenge(uc.id, { status: 'abandonado', endDate: today, final: summary(evalOf(uc)) }); toast('Desafio encerrado'); repaint(); } }) }, 'Encerrar desafio')) : null,
    h('button.link.inline.chd-hurt', { type: 'button', onclick: () => discomfortSheet() }, 'Senti desconforto ou dor'));
}

// Registro rápido do que o app não mede.
function checkinBlock(def, uc, date, repaint) {
  const now = state.checkins[date] ?? {};
  const save = async patch => { await saveCheckin(date, patch); repaint(); syncChallenges(); };
  const yest = addDays(date, -1);
  let content;
  if (def.checkin === 'mindful') content = [h('p', 'Como você se sentiu depois das refeições de hoje?'), segmented([{ id: 'com-fome', label: 'Ainda com fome' }, { id: 'satisfeito', label: 'Satisfeito' }, { id: 'cheio-demais', label: 'Cheio demais' }], now.mindful, v => save({ mindful: v }), 'Saciedade')];
  else if (def.checkin === 'pauses') content = [h('p', 'Quantas pausas para se mexer você fez hoje?'), h('div.chd-stepper',
    h('button.icon-btn', { type: 'button', 'aria-label': 'Menos uma', onclick: () => save({ pauses: Math.max(0, (now.pauses ?? 0) - 1) }) }, icon('minus')), h('b', now.pauses ?? 0),
    h('button.icon-btn', { type: 'button', 'aria-label': 'Mais uma', onclick: () => save({ pauses: (now.pauses ?? 0) + 1 }) }, icon('plus')))];
  else if (def.checkin === 'screens') content = [h('p', 'Ontem, quanto tempo ficou sem telas antes de dormir?'), segmented([{ id: 0, label: 'Nada' }, { id: 15, label: '15 min' }, { id: 30, label: '30 min' }, { id: 45, label: '45 min' }, { id: 60, label: '1 h+' }], now.screens, v => save({ screens: v }), 'Sem telas')];
  else if (def.checkin === 'body') content = [h('p', 'Como está o corpo hoje?'), segmented([{ id: 'bem', label: 'Descansado' }, { id: 'cansado', label: 'Cansado' }, { id: 'dor', label: 'Com dor' }], now.body, v => { save({ body: v }); if (v === 'dor') discomfortSheet(); }, 'Corpo'),
    now.body && now.body !== 'bem' ? h('p.fine', 'Hoje é dia de descanso ou de atividade leve. Atividade intensa não conta para o desafio.') : null];
  else if (def.checkin === 'sleep') {
    const s = now.sleep ?? { bed: uc.target?.bed ?? '23:00', wake: uc.target?.wake ?? '07:00' };
    const bed = h('input.pill-input', { type: 'time', value: s.bed, 'aria-label': 'Dormiu às' }), wake = h('input.pill-input', { type: 'time', value: s.wake, 'aria-label': 'Acordou às' });
    content = [h('p', `Na noite de ${long(yest)} para hoje:`), h('div.chd-sleep', h('label', 'Dormi às', bed), h('label', 'Acordei às', wake)),
      h('button.btn.tonal.compact', { type: 'button', onclick: () => save({ sleep: { bed: bed.value, wake: wake.value } }) }, now.sleep ? 'Atualizar' : 'Registrar')];
  }
  return h('section.chd-check', h('h3', 'Registro de hoje'), ...content, h('p.fine', 'O app não mede isso sozinho; este registro rápido é só seu.'));
}

// ---------------------------------------------------------------------------
// Iniciar: objetivos, critérios, aviso de segurança, meta individual e confirmação

function startSheet(def, onStarted) {
  let target = defaultTarget(def, state.profile ?? {}), ok = false;
  const go2 = h('button.btn.primary.block', { type: 'button', disabled: true, onclick: e => busy(e.currentTarget, async () => {
    const today = todayISO();
    await startChallenge({ challengeId: def.id, target, startDate: today, expectedEnd: addDays(today, def.days - 1) });
    sheet.close(); toast(`"${def.title}" começou hoje. Bom desafio!`); onStarted?.(); syncChallenges({ notify: false });
  }) }, 'Começar hoje');
  let targetCtl = null;
  if (def.targets?.kind === 'sleep') {
    const bed = h('input.pill-input', { type: 'time', value: target.bed, 'aria-label': 'Dormir às', oninput: e => { target = { ...target, bed: e.target.value }; } });
    const wake = h('input.pill-input', { type: 'time', value: target.wake, 'aria-label': 'Acordar às', oninput: e => { target = { ...target, wake: e.target.value }; } });
    targetCtl = h('div.chd-sleep', h('label', 'Dormir às', bed), h('label', 'Acordar às', wake));
  } else if (def.targets) targetCtl = segmented(def.targets.options.map(o => ({ id: o.id, label: o.label })), target, v => { target = v; }, def.targets.label);
  const check = h('button.switch', { type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Confirmo que estou apto a participar', onclick: e => {
    ok = !ok; e.currentTarget.setAttribute('aria-checked', String(ok)); go2.disabled = !ok;
  } }, h('span'));
  const sheet = openSheet({ title: 'Iniciar desafio', content: [
    h('p.sheet-food', def.title),
    section('Objetivo', h('p', def.goal)),
    section('Critério de conclusão', h('p', def.total ? 'Concluído quando você somar os minutos escolhidos.' : `Concluído quando você cumprir ${def.targets?.key === 'days' ? 'os dias ativos escolhidos' : `${def.days} dias`}. Os dias não precisam ser seguidos, perder um dia não zera nada, e o desafio não termina só porque o prazo passou.`),
      h('p.fine', `Acompanhamento: ${def.measure}`)),
    targetCtl ? section(def.targets.kind === 'sleep' ? 'Seus horários' : def.targets.label, targetCtl, h('p.fine', 'Escolha o que for adequado para você. Dá para ajustar depois.')) : null,
    h('section.chd-safety', h('b', 'Antes de começar'), h('p', SAFETY)),
    h('div.chd-confirm', h('p', 'Estou apto a participar e, quando necessário, recebi orientação profissional para este desafio.'), check),
    go2] });
  return sheet;
}

export function safetySheet() {
  return openSheet({ title: 'Aviso de segurança', content: [h('p.sheet-text', SAFETY), h('p.sheet-text', DISCOMFORT),
    h('p.fine', 'Nenhum desafio propõe dietas restritivas, jejum, metas de perda de peso, suplementos, água acima da sua meta ou exercício acima da sua capacidade. As metas são sempre individuais e você pode pausar ou encerrar qualquer desafio a qualquer momento.')] });
}
function discomfortSheet() {
  return openSheet({ title: 'Cuide-se primeiro', content: [h('p.sheet-text', DISCOMFORT),
    h('p.sheet-text', 'Se quiser, pause os seus desafios de atividade até se sentir bem e conversar com um profissional.'),
    h('div.sheet-actions', h('a.btn.secondary', { href: 'tel:192' }, 'Ligar 192'))] });
}
