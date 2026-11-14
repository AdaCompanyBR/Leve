// Aba Progresso > Conquistas: nível, ofensiva e medalhas. Tudo vem de evolution() (registros reais).
import { h, icon, int, dec1, openSheet, toast } from './dom.js';
import { state, saveSettings } from '../store.js';
import { evolution, streakConfig } from '../evolution.js';
import { CRITERIA, weekDays, streakMessage, inPause, flameTier, MILESTONES, MAX_SHIELDS, SHIELD_EVERY, MAX_REST_DAYS, MAX_PAUSE_DAYS_60, ACTIVITY_GOAL_MIN, MIN_BOUT_MIN } from '../lib/streak.js';
import { XP_RULES, LEVELS } from '../lib/xp.js';
import { ACHIEVEMENTS, challengeById, evaluate } from '../lib/challenges.js';
import { todayISO, addDays, weekStart, fmtDate, fromISO } from '../lib/dates.js';
import { medalArt, flameMark, levelEmblem } from './challengeArt.js';
import { dataSource, wasJustUnlocked, syncChallenges } from './challenges.js';

const long = d => fmtDate(d, { day: 'numeric', month: 'short' }).replace('.', '');
const XP = n => `${int(n)} XP`;

/** Avaliação dos desafios em andamento, para o andamento das conquistas de desafio. */
function activeEvals(today) {
  const src = dataSource(), out = {};
  for (const uc of state.myChallenges) {
    if (uc.status !== 'ativo') { if (uc.final) out[uc.id] = uc.final; continue; }
    const def = challengeById(uc.challengeId);
    if (def) out[uc.id] = evaluate(def, uc, src, today);
  }
  return out;
}

export function achievementsView() {
  const today = todayISO();
  const evo = evolution(today, activeEvals(today));
  return h('div.evo-view', levelCard(evo), streakCard(evo, today), medalsSection(evo, today));
}

// ---------------------------------------------------------------------------
// Nível

function levelCard(evo) {
  const { level: lv, xp } = evo;
  const n = evo.unlocked.length;
  return h('section.card.lvl-card', { 'aria-label': 'Nível e experiência' },
    levelEmblem(lv.level, lv.pct),
    h('div.lvl-info',
      h('div.lvl-title',
        h('div', h('p.lvl-kicker', `Nível ${lv.level}`), h('h2.lvl-name', lv.name)),
        h('button.lvl-how', { type: 'button', 'aria-label': 'Como ganhar XP', onclick: () => xpSheet(evo) }, icon('info'))),
      h('div.lvl-xp', h('span', h('b', int(xp.xp)), ' XP'), h('span.lvl-of', `${int(lv.nextAt)} XP`)),
      h('div.lvl-track', { role: 'progressbar', 'aria-label': `XP do nível: ${int(lv.inLevel)} de ${int(lv.span)}`, 'aria-valuemin': 0, 'aria-valuemax': lv.span, 'aria-valuenow': lv.inLevel },
        h('span', { style: { width: `${Math.max(2, Math.round(lv.pct * 100))}%` } })),
      h('div.lvl-foot',
        h('span', `Faltam ${XP(lv.nextAt - xp.xp)} para `, h('b', lv.nextName)),
        h('span.lvl-ach', icon('star'), `${n}/${ACHIEVEMENTS.length}`))));
}

function xpSheet(evo) {
  const p = evo.xp.parts;
  const rule = (label, value, total) => h('li', h('span', label), h('b', value), total != null ? h('span.xp-got', XP(total)) : null);
  openSheet({ title: 'Experiência', content: h('div.xp-sheet',
    h('p.sheet-text', 'A XP vem só de ações reais e é recalculada dos seus registros, então nada vale duas vezes. Abrir o app não conta.'),
    h('ul.xp-rules',
      rule('Dia validado da ofensiva', `+${XP_RULES.day}`, p.days),
      rule('Cada critério cumprido no dia: hidratação, alimentação, atividade', `+${XP_RULES.criterion} cada`, p.goals),
      rule('Desafio concluído', `+${XP_RULES.challenge}`, p.challenges),
      rule('Conquista desbloqueada (marcos da ofensiva valem de 20 a 700)', `+${XP_RULES.achievement}`, p.achievements)),
    h('p.xp-total', 'Total: ', h('b', XP(evo.xp.xp))),
    h('h3.xp-sub', 'Níveis'),
    h('ol.xp-levels', LEVELS.map(l => h('li' + (evo.level.level >= l.level ? '.on' : ''), h('span.xp-lv', l.level), h('span', l.name), h('span.xp-at', XP(l.at))))),
    h('p.fine', 'Depois da Floresta, cada nível pede mais 800 XP.')) });
}

// ---------------------------------------------------------------------------
// Ofensiva

const CELEBRATED = 'leve-streak-celebrated';
let weekOffset = 0;
let lastTodayDone = null; // para animar o dia de hoje só quando ele acaba de ser cumprido
const WD = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const STATE_LABEL = { done: 'cumprido', pending: 'hoje, ainda em aberto', rest: 'descanso', 'rest-future': 'descanso planejado', paused: 'em pausa', protected: 'coberto por proteção', missed: 'sem registro', none: 'sem registro', future: 'ainda não chegou' };

function streakCard(evo, today) {
  const card = h('section.card.stk-card', { 'aria-label': 'Ofensiva' });
  const st = evo.streak, cfg = evo.config;
  const paused = inPause(today, cfg.pauses);
  const firstWeek = weekStart(Object.keys(st.days).sort()[0] ?? today);
  const justDone = st.todayDone && lastTodayDone === false;
  lastTodayDone = st.todayDone;
  // Comemoração uma vez por dia, quando a ofensiva é mantida (aqui ou ao abrir a aba depois).
  let celebrate = false;
  if (st.todayDone) { try { celebrate = localStorage.getItem(CELEBRATED) !== today; localStorage.setItem(CELEBRATED, today); } catch { celebrate = justDone; } }
  if (celebrate) card.classList.add('celebrate');
  const paint = () => {
    const monday = addDays(weekStart(today), weekOffset * 7);
    const days = weekDays(st.days, monday, today, cfg);
    const label = weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana passada' : `${long(monday)} – ${long(addDays(monday, 6))}`;
    card.replaceChildren(...[
      h('div.stk-top',
        h('div.stk-flame', flameMark({ size: 56, tier: flameTier(st.current), mode: st.current === 0 ? 'out' : st.todayDone ? 'lit' : 'pending' })),
        h('div.stk-count',
          h('p.stk-num-line', h('b', st.current), h('span', st.current === 1 ? 'dia seguido' : 'dias seguidos')),
          h('p.stk-msg', paused ? `Em pausa${pauseEnd(cfg, today) ? ` até ${long(pauseEnd(cfg, today))}` : ''}. A ofensiva fica guardada como está.` : streakMessage(st))),
        h('button.stk-adjust', { type: 'button', 'aria-label': 'Ajustar descanso e pausa', onclick: () => streakSettingsSheet() }, icon('settings'))),
      celebrate ? h('div.stk-burst', { 'aria-hidden': 'true' }, h('span'), h('span'), h('span')) : null,
      todayPanel(evo, today),
      h('div.stk-week',
        h('div.stk-week-head',
          h('span', label),
          h('div.stk-nav',
            h('button', { type: 'button', 'aria-label': 'Semana anterior', disabled: monday <= firstWeek, onclick: () => { weekOffset--; paint(); } }, icon('back')),
            h('button', { type: 'button', 'aria-label': 'Próxima semana', disabled: weekOffset >= 0, onclick: () => { weekOffset++; paint(); } }, icon('next')))),
        h('ol.stk-days', days.map((d, i) => h('li', { 'data-state': d.state, 'data-today': d.date === today ? '1' : null, 'data-pop': justDone && d.date === today && weekOffset === 0 ? '1' : null,
          'aria-label': `${fmtDate(d.date, { weekday: 'long', day: 'numeric' })}: ${STATE_LABEL[d.state] ?? ''}` },
          h('span.stk-wd', WD[i]),
          h('span.stk-dot', dayGlyph(d.state)),
          h('span.stk-num', fromISO(d.date).getDate()))))),
      h('div.stk-stats',
        statTile('peak', int(st.best), st.best === 1 ? 'dia' : 'dias', 'Maior sequência', `A maior quantidade de dias seguidos que você já validou: ${st.best} ${st.best === 1 ? 'dia' : 'dias'}. Dias de descanso, pausa e proteção não interrompem a sequência.`),
        statTile('calendar', int(st.totalActive), st.totalActive === 1 ? 'dia' : 'dias', 'Dias ativos', `Todos os dias validados, seguidos ou não: ${st.totalActive}. Diferente da maior sequência, aqui um dia sem registro não zera nada.`),
        statTile('rings', int(st.consistentWeeks), '', 'Semanas consistentes', 'Semanas (de segunda a domingo) com pelo menos 4 dias cumpridos, ou com todos os dias que contavam cumpridos, no mínimo 3. Descanso e pausa não pesam contra.'),
        statTile('shield', String(st.shields), `de ${MAX_SHIELDS}`, 'Proteções', `A cada ${SHIELD_EVERY} dias seguidos validados você ganha uma proteção (até ${MAX_SHIELDS}). Se um dia passar sem validação, ela cobre esse dia e a ofensiva continua.`)),
      h('button.stk-how', { type: 'button', onclick: () => rulesSheet(evo) }, 'Como a ofensiva funciona', icon('next'))].filter(Boolean));
  };
  paint();
  return card;
}
// Símbolos pequenos dos indicadores, no traço das medalhas.
const STAT_ICON = {
  peak: '<path d="M2.8 19.5 9.4 9.2l3.7 5.6 2.4-3.4 5.7 8.1z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.8v3.4M15.5 3.8v3.4"/>',
  rings: '<circle cx="9.3" cy="12" r="5.3"/><circle cx="14.7" cy="12" r="5.3"/>',
  shield: '<path d="M12 3.6 18.6 6v5.6c0 4.1-2.8 7.3-6.6 8.8-3.8-1.5-6.6-4.7-6.6-8.8V6z"/>',
};
const statIcon = k => { const t = document.createElement('template'); t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${STAT_ICON[k]}</svg>`; return t.content.firstChild; };
function statTile(ic, value, unit, title, explain) {
  return h('button.stk-stat', { type: 'button', 'aria-label': `${title}: ${value} ${unit}. Toque para saber mais`, onclick: () => openSheet({ title, content: h('p.sheet-text', explain) }) },
    h('span.stk-stat-ic', statIcon(ic)),
    h('span.stk-stat-val', h('b', value), unit ? h('small', unit) : null),
    h('span.stk-stat-label', title));
}
function dayGlyph(st) {
  if (st === 'done') { const t = document.createElement('template'); t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="stk-check" d="M6.5 12.5l3.6 3.6 7.4-7.6" pathLength="1"/></svg>'; return t.content.firstChild; }
  if (st === 'rest' || st === 'rest-future') return icon('moon');
  if (st === 'paused') return icon('pause');
  if (st === 'protected') return icon('shield-s');
  return null;
}
const pauseEnd = (cfg, today) => cfg.pauses.find(p => today >= p.from && (!p.to || today <= p.to))?.to ?? null;

// Painel "Hoje": os três critérios, o que falta e qual validou o dia.
function todayPanel(evo, today) {
  const st = evo.streak, rows = evo.todayProgress;
  const by = st.by[today];
  const val = c => c.id === 'agua' ? `${dec1(c.value / 1000)} de ${dec1(c.target / 1000)} L` : c.id === 'refeicoes' ? `${c.value} de ${c.target} refeições` : `${c.value} de ${c.target} min`;
  const status = c => !c.applicable ? 'Não se aplica' : c.id === by ? 'Validou o dia' : c.done ? 'Cumprida' : 'Pendente';
  const pending = rows.filter(c => c.applicable && !c.done).sort((a, b) => b.pct - a.pct);
  const left = c => c.id === 'agua' ? `faltam ${dec1((c.target - c.value) / 1000)} L` : c.id === 'refeicoes' ? `falta${c.target - c.value === 1 ? '' : 'm'} ${c.target - c.value} ${c.target - c.value === 1 ? 'refeição' : 'refeições'}` : `faltam ${c.target - c.value} min`;
  const name = { agua: 'Hidratação', refeicoes: 'Alimentação', atividade: 'Atividade física' };
  return h('div.stk-today' + (st.todayDone ? '.ok' : ''),
    h('div.stk-today-head', h('span', 'Hoje'), h('span.stk-today-pill', st.todayDone ? [icon('check'), 'Ofensiva mantida!'] : 'Cumpra 1 dos 3')),
    h('ul.stk-crit', rows.map(c => {
      const def = CRITERIA.find(k => k.id === c.id);
      return h('li', { 'data-done': c.done ? '1' : null, 'data-by': c.id === by ? '1' : null, 'data-na': c.applicable ? null : '1' },
        h('span.stk-crit-ic', icon(def.icon)),
        h('div.stk-crit-main',
          h('div.stk-crit-line', h('b', def.label), h('span.stk-crit-st', status(c))),
          h('div.stk-crit-bar', h('span', { style: { width: `${Math.round((c.applicable ? c.pct : 0) * 100)}%` } })),
          h('span.stk-crit-val', c.applicable ? `${val(c)}${c.id === 'agua' ? ` · ${Math.round(c.pct * 100)}%` : ''}` : 'Orientação médica para limitar líquidos ligada')));
    })),
    h('p.stk-result', st.todayDone ? `Resultado: ofensiva mantida com ${name[by] ?? 'um critério'}.`
      : pending.length ? `Para validar hoje, cumpra um deles por inteiro. Mais perto: ${name[pending[0].id]} (${left(pending[0])}).` : 'Para validar hoje, cumpra um dos critérios por inteiro.'));
}

function rulesSheet(evo) {
  openSheet({ title: 'Como a ofensiva funciona', content: h('div.rules-sheet',
    h('p.sheet-text', 'A ofensiva conta os dias seguidos em que você cumpriu, por inteiro, pelo menos um destes três critérios. A validação é automática, pelos seus registros:'),
    h('ul.rules-list', CRITERIA.map(k => h('li', icon(k.icon), h('span', h('b', k.label), h('span', k.rule))))),
    h('ul.rules-text',
      h('li', 'Basta um critério por dia. Parcial não vale: 75% da água ou 3 de 4 refeições ainda não validam.'),
      h('li', 'Vale o que foi registrado até o fim do dia seguinte. Depois disso, o dia não muda mais.'),
      h('li', 'Registros repetidos contam uma vez. Atividades com menos de 10 minutos não entram na soma.'),
      h('li', 'Dias já validados ficam guardados: mudar a meta depois não muda o passado.'),
      h('li', 'O dia segue o relógio do seu aparelho. Hoje em aberto não quebra nada até o dia acabar.'),
      h('li', `Até ${MAX_REST_DAYS} dias de descanso por semana e pausas de até 14 dias não quebram a ofensiva. A mudança vale dali para a frente.`),
      h('li', `A cada ${SHIELD_EVERY} dias seguidos você ganha uma proteção (até ${MAX_SHIELDS}); ela cobre um dia sem validação.`),
      h('li', `Marcos: ${MILESTONES.join(', ')} dias seguidos, com medalha e XP.`),
      h('li', 'As metas são as suas, individuais. Com orientação médica para limitar líquidos, a hidratação não entra. Nada aqui pede beber, comer ou treinar além do seu plano.')),
    h('button.btn.tonal.block', { type: 'button', onclick: () => streakSettingsSheet() }, 'Descanso e pausa')) });
}

function streakSettingsSheet() {
  const today = todayISO();
  const body = h('div.stk-settings');
  const saveRaw = async patch => { await saveSettings({ streak: { ...(state.settings.streak ?? {}), ...patch } }); paint(); syncChallenges({ notify: false }); };
  const pausedDays60 = cfg => {
    let n = 0;
    for (let i = 0; i < 60; i++) { const d = addDays(today, -i); if (inPause(d, cfg.pauses)) n++; }
    return n;
  };
  const paint = () => {
    const cfg = streakConfig();
    const paused = inPause(today, cfg.pauses);
    const used = pausedDays60(cfg), room = Math.max(0, MAX_PAUSE_DAYS_60 - used);
    body.replaceChildren(
      h('p.sheet-text', 'O que valida o dia é definido pelo app: hidratação, alimentação ou atividade física, cumpridas por inteiro. Aqui você ajusta só o descanso e a pausa.'),
      h('h3', 'Dias de descanso'),
      h('div.stk-rest', ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => {
        const sel = cfg.restDays.includes(i);
        const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        return h('button.stk-rest-day', { type: 'button', 'aria-pressed': String(sel), 'aria-label': `Descanso na ${names[i]}`, onclick: () => {
          if (!sel && cfg.restDays.length >= MAX_REST_DAYS) return toast(`Escolha até ${MAX_REST_DAYS} dias de descanso por semana.`);
          const days = sel ? cfg.restDays.filter(x => x !== i) : [...cfg.restDays, i].sort();
          // A mudança vale de hoje em diante: o passado continua como estava.
          const hist = cfg.restHistory.filter(x => x.from !== today);
          saveRaw({ restDays: days, restHistory: [...hist, { from: today, days }] });
        } }, l);
      })),
      h('p.fine', 'Em dia de descanso a ofensiva não quebra. Se você cumprir um critério, o dia conta normalmente. A mudança vale de hoje em diante.'),
      h('h3', 'Pausa'),
      paused
        ? h('div.stk-pause', h('p', `Em pausa${pauseEnd(cfg, today) ? ` até ${long(pauseEnd(cfg, today))}` : ''}.`),
          h('button.btn.tonal', { type: 'button', onclick: () => {
            const pauses = cfg.pauses.map(p => (today >= p.from && (!p.to || today <= p.to)) ? (p.from === today ? null : { ...p, to: addDays(today, -1) }) : p).filter(Boolean);
            saveRaw({ pauses }); toast('Ofensiva retomada. Hoje já conta.');
          } }, 'Retomar agora'))
        : h('div.stk-pause',
          h('p', `Viagem, doença ou só um tempo? A pausa começa hoje e guarda a ofensiva como está. Você pode usar até ${MAX_PAUSE_DAYS_60} dias de pausa a cada 60 dias${used ? ` (restam ${room})` : ''}.`),
          h('div.stk-pause-opts', [3, 7, 14].map(n => h('button.btn.tonal', { type: 'button', disabled: n > room, onclick: () => { saveRaw({ pauses: [...cfg.pauses, { from: today, to: addDays(today, n - 1) }] }); toast(`Ofensiva em pausa por ${n} dias.`); } }, `${n} dias`)))));
  };
  paint();
  openSheet({ title: 'Descanso e pausa', content: body });
}

// ---------------------------------------------------------------------------
// Medalhas

function medalsSection(evo, today) {
  const got = state.achievements ?? {};
  const tile = a => {
    const date = got[a.id], pr = evo.progress[a.id] ?? { value: 0, target: 1 };
    const st = date ? 'unlocked' : pr.value > 0 ? 'progress' : 'locked';
    return h('li', h('button.medal-tile', { type: 'button', 'data-state': st, onclick: () => medalSheet(a, st, date, pr), 'aria-label': `${a.title}: ${date ? `desbloqueada em ${long(date)}` : st === 'progress' ? `${pr.value} de ${pr.target}` : 'bloqueada'}` },
      medalArt(a, { state: st, size: 64, fresh: !!date && date === today && wasJustUnlocked(a.id) }),
      h('b', a.title),
      st === 'unlocked' ? h('span.medal-sub', long(date))
        : st === 'progress' && pr.target > 1 ? h('span.medal-prog', h('span.medal-bar', h('span', { style: { width: `${(pr.value / pr.target) * 100}%` } })), h('span', `${pr.value} de ${pr.target}`))
          : h('span.medal-sub', st === 'progress' ? 'Em andamento' : 'Bloqueada')));
  };
  const group = (title, list) => {
    const n = list.filter(a => got[a.id]).length;
    return h('section.medal-group', h('div.medal-head', h('h3', title), h('span', `${n} de ${list.length}`)), h('ul.medal-grid', list.map(tile)));
  };
  const total = Object.keys(got).filter(id => ACHIEVEMENTS.some(a => a.id === id)).length;
  return h('div.medals',
    h('div.medals-title', h('h2', 'Medalhas'), h('span', `${total} de ${ACHIEVEMENTS.length}`)),
    group('De ofensiva', ACHIEVEMENTS.filter(a => a.group === 'ofensiva')),
    group('De desafios', ACHIEVEMENTS.filter(a => a.group === 'desafios')),
    h('p.fine.medals-foot', 'Conquistas vêm de dias validados e de desafios concluídos, nunca só de começar. Os marcos da ofensiva valem de 20 a 700 XP; as outras, 25. Cada uma vale uma vez.'));
}

function medalSheet(a, st, date, pr) {
  const tier = { ouro: 'Especial: ouro', prata: 'Especial: prata', bronze: 'Especial: bronze' }[a.tier];
  openSheet({ title: a.title, content: h('div.medal-sheet',
    medalArt(a, { state: st, size: 128, fresh: st === 'unlocked' }),
    tier ? h('span.medal-tier', { 'data-tier': a.tier }, tier) : null,
    h('p.medal-text', a.text),
    st === 'unlocked' ? h('p.medal-when', `Desbloqueada em ${fmtDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}`)
      : h('div.medal-progress',
        h('div.lvl-track', h('span', { style: { width: `${(pr.value / pr.target) * 100}%` } })),
        h('p', pr.target > 1 ? `${pr.value} de ${pr.target}` : 'Ainda não desbloqueada')),
    h('p.fine', `Vale +${a.xp ?? XP_RULES.achievement} XP quando desbloqueada.`)) });
}
