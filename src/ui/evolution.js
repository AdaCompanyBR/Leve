// Aba Progresso > Conquistas: nível, ofensiva e medalhas. Tudo vem de evolution() (registros reais).
import { h, icon, int, openSheet, toast, segmented } from './dom.js';
import { state, saveSettings } from '../store.js';
import { evolution, streakConfig } from '../evolution.js';
import { CRITERIA, weekDays, streakMessage, inPause, MAX_SHIELDS, SHIELD_EVERY } from '../lib/streak.js';
import { XP_RULES, LEVELS } from '../lib/xp.js';
import { ACHIEVEMENTS, challengeById, evaluate } from '../lib/challenges.js';
import { todayISO, addDays, weekStart, fmtDate, fromISO } from '../lib/dates.js';
import { medalArt, streakMark, levelEmblem } from './challengeArt.js';
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
  return h('section.card.lvl-card', { 'aria-label': 'Nível' },
    h('div.lvl-main',
      levelEmblem(lv.level, lv.pct),
      h('div.lvl-info',
        h('p.lvl-kicker', `Nível ${lv.level}`),
        h('h2.lvl-name', lv.name),
        h('p.lvl-xp', h('b', int(xp.xp)), ` / ${XP(lv.nextAt)}`),
        h('div.lvl-track', { role: 'progressbar', 'aria-label': `XP do nível: ${int(lv.inLevel)} de ${int(lv.span)}`, 'aria-valuemin': 0, 'aria-valuemax': lv.span, 'aria-valuenow': lv.inLevel },
          h('span', { style: { width: `${Math.round(lv.pct * 100)}%` } })),
        h('p.lvl-next', `Faltam ${XP(lv.nextAt - xp.xp)} para ${lv.nextName}`))),
    h('div.lvl-foot',
      h('span.lvl-stat', icon('star'), h('b', n), ` de ${ACHIEVEMENTS.length} conquistas`),
      h('button.link.lvl-how', { type: 'button', onclick: () => xpSheet(evo) }, 'Como ganhar XP')));
}

function xpSheet(evo) {
  const p = evo.xp.parts;
  const rule = (label, value, total) => h('li', h('span', label), h('b', value), total != null ? h('span.xp-got', XP(total)) : null);
  openSheet({ title: 'Experiência', content: h('div.xp-sheet',
    h('p.sheet-text', 'A XP vem só de ações reais e é recalculada dos seus registros, então nada vale duas vezes. Abrir o app não conta.'),
    h('ul.xp-rules',
      rule('Dia cumprido da ofensiva', `+${XP_RULES.day}`, p.days),
      rule('Metas do dia: líquidos, atividade feita e metade da rotina', `+${XP_RULES.water} cada`, p.goals),
      rule('Desafio concluído', `+${XP_RULES.challenge}`, p.challenges),
      rule('Conquista desbloqueada', `+${XP_RULES.achievement}`, p.achievements)),
    h('p.xp-total', 'Total: ', h('b', XP(evo.xp.xp))),
    h('h3.xp-sub', 'Níveis'),
    h('ol.xp-levels', LEVELS.map(l => h('li' + (evo.level.level >= l.level ? '.on' : ''), h('span.xp-lv', l.level), h('span', l.name), h('span.xp-at', XP(l.at))))),
    h('p.fine', 'Depois da Floresta, cada nível pede mais 800 XP.')) });
}

// ---------------------------------------------------------------------------
// Ofensiva

let weekOffset = 0;
const WD = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const STATE_LABEL = { done: 'cumprido', pending: 'hoje, ainda em aberto', rest: 'descanso', 'rest-future': 'descanso planejado', paused: 'em pausa', protected: 'coberto por proteção', missed: 'sem registro', none: 'sem registro', future: 'ainda não chegou' };

function streakCard(evo, today) {
  const card = h('section.card.stk-card', { 'aria-label': 'Ofensiva' });
  const st = evo.streak, cfg = evo.config;
  const paused = inPause(today, cfg.pauses);
  const firstWeek = weekStart(Object.keys(st.days).sort()[0] ?? today);
  const paint = () => {
    const monday = addDays(weekStart(today), weekOffset * 7);
    const days = weekDays(st.days, monday, today, cfg);
    const label = weekOffset === 0 ? 'Esta semana' : weekOffset === -1 ? 'Semana passada' : `${long(monday)} a ${long(addDays(monday, 6))}`;
    card.replaceChildren(
      h('div.stk-top',
        streakMark({ size: 52, muted: st.current === 0 }),
        h('div.stk-count', h('b', st.current), h('span', st.current === 1 ? 'dia de ofensiva' : 'dias de ofensiva')),
        h('button.icon-btn.stk-adjust', { type: 'button', 'aria-label': 'Ajustar a ofensiva', onclick: () => streakSettingsSheet() }, icon('settings'))),
      h('p.stk-msg', paused ? `Ofensiva em pausa${pauseEnd(cfg, today) ? ` até ${long(pauseEnd(cfg, today))}` : ''}. Ela fica guardada do jeito que está.` : streakMessage(st)),
      h('div.stk-week',
        h('div.stk-week-head',
          h('button.icon-btn.small', { type: 'button', 'aria-label': 'Semana anterior', disabled: monday <= firstWeek, onclick: () => { weekOffset--; paint(); } }, icon('back')),
          h('span', label),
          h('button.icon-btn.small', { type: 'button', 'aria-label': 'Próxima semana', disabled: weekOffset >= 0, onclick: () => { weekOffset++; paint(); } }, icon('next'))),
        h('ol.stk-days', days.map((d, i) => h('li', { 'data-state': d.state, 'data-today': d.date === today ? '1' : null, 'aria-label': `${fmtDate(d.date, { weekday: 'long', day: 'numeric' })}: ${STATE_LABEL[d.state] ?? ''}` },
          h('span.stk-wd', WD[i]),
          h('span.stk-dot', dayGlyph(d.state)),
          h('span.stk-num', fromISO(d.date).getDate()))))),
      h('div.stk-stats',
        stat(st.best, 'Recorde'),
        stat(st.totalActive, 'Dias ativos'),
        stat(st.consistentWeeks, st.consistentWeeks === 1 ? 'Semana consistente' : 'Semanas consistentes'),
        h('div.stk-stat', h('b.stk-shields', Array.from({ length: MAX_SHIELDS }, (_, i) => h('span' + (i < st.shields ? '.on' : ''), icon('shield-s')))), h('span', 'Proteções'))),
      h('button.link.stk-how', { type: 'button', onclick: () => rulesSheet(evo) }, 'Como a ofensiva funciona'));
  };
  paint();
  return card;
}
const stat = (v, label) => h('div.stk-stat', h('b', int(v)), h('span', label));
function dayGlyph(st) {
  if (st === 'done') return icon('check');
  if (st === 'rest' || st === 'rest-future') return icon('moon');
  if (st === 'paused') return icon('pause');
  if (st === 'protected') return icon('shield-s');
  return null;
}
const pauseEnd = (cfg, today) => cfg.pauses.find(p => today >= p.from && (!p.to || today <= p.to))?.to ?? null;

function rulesSheet(evo) {
  const c = evo.config.criteria;
  openSheet({ title: 'Como a ofensiva funciona', content: h('div.rules-sheet',
    h('p.sheet-text', 'A ofensiva conta os dias seguidos em que você cuidou da sua rotina. Um dia conta quando você cumpre pelo menos uma destas ações:'),
    h('ul.rules-list', CRITERIA.map(k => h('li' + (c[k.id] === false ? '.off' : ''), icon(c[k.id] === false ? 'minus' : 'check'), h('span', h('b', k.label), h('span', k.hint))))),
    h('ul.rules-text',
      h('li', 'Concluir um desafio no dia também conta.'),
      h('li', 'Cada dia conta uma vez só, não importa quantos registros você fizer.'),
      h('li', 'O dia segue o relógio do seu aparelho. Hoje sem registro fica em aberto, sem quebrar nada.'),
      h('li', 'Dias de descanso e dias em pausa não quebram nem somam.'),
      h('li', `A cada ${SHIELD_EVERY} dias cumpridos você ganha uma proteção (até ${MAX_SHIELDS}). Se um dia passar sem registro, ela cobre esse dia.`),
      h('li', 'Atividade física nunca é obrigatória. Descansar também faz parte.')),
    h('button.btn.tonal.block', { type: 'button', onclick: () => streakSettingsSheet() }, 'Ajustar a ofensiva')) });
}

function streakSettingsSheet() {
  const today = todayISO();
  const body = h('div.stk-settings');
  const save = async patch => { await saveSettings({ streak: { ...streakConfig(), ...patch } }); paint(); syncChallenges({ notify: false }); };
  const paint = () => {
    const cfg = streakConfig();
    const on = CRITERIA.filter(k => cfg.criteria[k.id] !== false).length;
    const paused = inPause(today, cfg.pauses);
    body.replaceChildren(
      h('h3', 'O que conta como dia cumprido'),
      h('div.set-rows', CRITERIA.map(k => {
        const val = cfg.criteria[k.id] !== false;
        return h('div.set-row', h('div.set-label', h('span', k.label), h('span.set-hint', k.hint)),
          h('button.switch', { role: 'switch', 'aria-checked': String(val), 'aria-label': k.label, onclick: () => {
            if (val && on === 1) return toast('Deixe pelo menos uma opção ligada.');
            save({ criteria: { ...cfg.criteria, [k.id]: !val } });
          } }, h('span')));
      })),
      h('p.fine', 'Basta uma por dia. Escolha as que fazem sentido para o seu objetivo.'),
      h('h3', 'Dias de descanso'),
      h('div.stk-rest', ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => {
        const sel = cfg.restDays.includes(i);
        const names = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        return h('button.stk-rest-day', { type: 'button', 'aria-pressed': String(sel), 'aria-label': `Descanso na ${names[i]}`, onclick: () => {
          if (!sel && cfg.restDays.length >= 3) return toast('Escolha até 3 dias de descanso por semana.');
          save({ restDays: sel ? cfg.restDays.filter(x => x !== i) : [...cfg.restDays, i].sort() });
        } }, l);
      })),
      h('p.fine', 'Nos dias de descanso, a ofensiva não quebra. Se você registrar algo, o dia conta normalmente.'),
      h('h3', 'Pausa'),
      paused
        ? h('div.stk-pause', h('p', `Em pausa${pauseEnd(cfg, today) ? ` até ${long(pauseEnd(cfg, today))}` : ''}.`),
          h('button.btn.tonal', { type: 'button', onclick: () => {
            const pauses = cfg.pauses.map(p => (today >= p.from && (!p.to || today <= p.to)) ? (p.from === today ? null : { ...p, to: addDays(today, -1) }) : p).filter(Boolean);
            save({ pauses }); toast('Ofensiva retomada. Hoje já conta.');
          } }, 'Retomar agora'))
        : h('div.stk-pause',
          h('p', 'Viagem, doença ou só um tempo? A pausa guarda a ofensiva como está.'),
          h('div.stk-pause-opts', [3, 7, 14].map(n => h('button.btn.tonal', { type: 'button', onclick: () => { save({ pauses: [...cfg.pauses, { from: today, to: addDays(today, n - 1) }] }); toast(`Ofensiva em pausa por ${n} dias.`); } }, `${n} dias`)))));
  };
  paint();
  openSheet({ title: 'Ajustar a ofensiva', content: body });
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
  return h('div.medals',
    group('Ofensiva', ACHIEVEMENTS.filter(a => a.group === 'ofensiva')),
    group('Desafios', ACHIEVEMENTS.filter(a => a.group === 'desafios')),
    h('p.fine.medals-foot', 'Conquistas vêm de dias cumpridos e de desafios concluídos, nunca só de começar. Cada uma vale +25 XP, uma vez.'));
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
    h('p.fine', `Vale +${XP_RULES.achievement} XP quando desbloqueada.`)) });
}
