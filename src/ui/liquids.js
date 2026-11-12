// Tela Líquidos: o corpo enche de baixo para cima com as bebidas do dia, na ordem em que foram
// registradas. Abaixo: adicionar, registros do dia, a semana em copos e a meta.
import { h, icon, int, dec1, toast, haptic, segmented, openPopover, openSheet, field } from './dom.js';
import { ui, go } from './state.js';
import { state, subscribe, addDrink, removeDrink, restoreDrink, clearLegacyWater, dayDrinks, liquidsOn, waterGoalOn, setWaterGoal, bodyStyle, latestWeight, drinkPresets, savePreset, removePreset, restorePresets } from '../store.js';
import { drinkSwaps } from './swaps.js';
import { drinkSheet } from './drink.js';
import { bodyFigure, drinkBadge, cupFigure } from './body.js';
import { DRINKS, drinkById, dayLayers, fillBands, weekDetail, suggestWaterGoal, parseDrinkSpeech, parseAmount } from '../lib/hydration.js';
import { todayISO, addDays, fmtDate, toISO } from '../lib/dates.js';

export const GOALS = [1500, 2000, 2500, 3000, 3500];
const liters = ml => `${dec1(ml / 1000)} L`;
const amount = ml => (ml >= 1000 ? liters(ml) : `${int(ml)} ml`);
const clock = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const presetName = p => p.name || drinkById(p.type).label;

async function add(date, type, ml, name) {
  if (!(ml > 0) || ml > 5000) return toast('Use uma quantidade entre 1 e 5.000 ml');
  haptic(12);
  const row = await addDrink(date, type, ml, name ? { note: name } : {});
  toast(`${name || drinkById(type).label}: ${int(ml)} ml`, { label: 'Desfazer', run: () => removeDrink(row.id) });
}

// ---------------------------------------------------------------------------
// Menu do + : atalhos aprendidos, outra bebida e voz.

const Speech = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

function listen(date) {
  const rec = new Speech();
  rec.lang = 'pt-BR';
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  let done = false;
  toast('Ouvindo… diga, por exemplo, “300 ml de café”');
  rec.onresult = e => {
    done = true;
    const said = [...e.results[0]].map(a => a.transcript);
    const hit = said.map(parseDrinkSpeech).find(Boolean);
    if (!hit) return toast(`Não entendi o volume em “${said[0]}”`);
    drinkSheet({ date, type: hit.type, ml: hit.ml });
  };
  rec.onerror = e => { done = true; toast(e.error === 'not-allowed' ? 'Permita o microfone para registrar por voz' : 'Não consegui ouvir. Tente de novo.'); };
  rec.onend = () => { if (!done) toast('Não ouvi nada. Tente de novo.'); };
  try { rec.start(); } catch { toast('Voz indisponível neste navegador'); }
}

/** Menu do +: as bebidas pré-definidas, com a quantidade de cada uma, outra bebida e voz. */
export function drinkMenu(anchor, date = ui.date) {
  const item = (body, run, extra = {}) => h('button.menu-item', { type: 'button', role: 'menuitem', 'data-close': '', onclick: run, ...extra }, body);
  const content = h('div.menu',
    h('div.menu-scroll', drinkPresets().map(p => item([drinkBadge(p.type, 28), h('span.menu-label', presetName(p)), h('span.menu-detail', `${int(p.ml)} ml`)],
      () => add(date, p.type, p.ml, p.name), { 'aria-label': `Adicionar ${int(p.ml)} ml de ${presetName(p).toLowerCase()}` }))),
    h('div.menu-sep', { role: 'separator' }),
    item([h('span.menu-icon', icon('plus')), h('span.menu-label', 'Outra bebida…')], () => drinkSheet({ date })),
    Speech ? item([h('span.menu-icon', icon('mic')), h('span.menu-label', 'Falar')], () => listen(date)) : null);
  return openPopover({ anchor, content, label: 'Adicionar bebida', menu: true });
}

// ---------------------------------------------------------------------------
// Bebidas pré-definidas: a lista que aparece no +, com tipo e quantidade; dá para cadastrar,
// corrigir e apagar.

const ring = pct => {
  const t = document.createElement('template'), c = 2 * Math.PI * 9, f = Math.min(1, pct / 100);
  t.innerHTML = `<svg class="mini-ring" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" class="mini-ring-track"/><circle cx="12" cy="12" r="9" class="mini-ring-fill" stroke-dasharray="${(c * f).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 12 12)"/></svg>`;
  return t.content.firstChild;
};

function presetSheet(preset) {
  const editing = !!preset;
  const v = { type: preset?.type ?? 'agua' };
  const amountInput = h('input.big-input', { inputmode: 'numeric', autocomplete: 'off', enterkeyhint: 'done', placeholder: '250', 'aria-label': 'Quantidade em mililitros', value: preset ? String(preset.ml) : '', autofocus: !editing });
  const nameInput = h('input', { type: 'text', maxlength: 30, autocomplete: 'off', value: preset?.name ?? '', placeholder: 'Ex.: garrafa da academia' });
  const typeName = h('p.drink-type-name', drinkById(v.type).label);
  const readMl = () => parseAmount(amountInput.value, 'ml');
  let sheet = null;
  const paint = () => sheet?.setAction({ disabled: Number.isNaN(readMl()) });
  const chips = h('div.chip-row.drink-types', { role: 'group', 'aria-label': 'Tipo de bebida' },
    DRINKS.map(d => h('button.chip', { type: 'button', 'aria-pressed': String(d.id === v.type), onclick: e => {
      v.type = d.id; typeName.textContent = d.label;
      chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    } }, drinkBadge(d.id, 26), d.label)));
  requestAnimationFrame(() => chips.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
  amountInput.addEventListener('input', paint);
  const save = async e => {
    e?.preventDefault();
    const ml = readMl();
    if (Number.isNaN(ml)) return;
    await savePreset({ id: preset?.id, type: v.type, ml, name: nameInput.value.trim() });
    sheet.close();
    toast(editing ? 'Bebida atualizada' : 'Bebida cadastrada');
  };
  sheet = openSheet({
    title: editing ? 'Editar bebida' : 'Nova bebida',
    action: { label: 'Salvar', run: save },
    content: h('form.drink-form', { onsubmit: save, novalidate: true },
      h('div.big-field.drink-amount', amountInput, h('span.big-unit', 'ml')),
      typeName,
      chips,
      field('Nome (opcional)', nameInput, 'Sem nome, aparece o tipo da bebida.'),
      editing ? h('div.chip-row', h('button.chip', { type: 'button', onclick: async () => {
        const before = [...drinkPresets()];
        await removePreset(preset.id); sheet.close();
        toast('Bebida removida da lista', { label: 'Desfazer', run: () => restorePresets(before) });
      } }, icon('trash'), h('span', 'Remover da lista'))) : null),
  });
  paint();
  return sheet;
}

/** Tela das bebidas pré-definidas. */
export function presetsSheet() {
  const list = h('ul.preset-list');
  const render = () => {
    const goal = waterGoalOn(todayISO()), presets = drinkPresets();
    list.replaceChildren(...(presets.length ? presets.map(p => {
      const t = drinkById(p.type), pct = Math.round((p.ml / goal) * 100);
      return h('li', h('button.preset-row', { type: 'button', onclick: () => presetSheet(p), 'aria-label': `${presetName(p)}, ${int(p.ml)} ml${t.hydrates ? `, ${pct}% da meta diária` : ''}. Editar` },
        drinkBadge(p.type, 40),
        h('span.preset-main', h('span.preset-name', p.name ? p.name : `${t.label} · ${int(p.ml)} ml`), h('span.preset-sub', p.name ? `${t.label} · ${int(p.ml)} ml` : 'Toque para editar')),
        t.hydrates ? h('span.preset-goal', h('span', 'meta diária'), h('b', `${pct}%`)) : h('span.preset-goal', h('span', 'não conta'), h('b', 'na meta')),
        t.hydrates ? ring(pct) : null));
    }) : [h('li.empty.small', h('p.empty-title', 'Nenhuma bebida cadastrada'), h('p.empty-text', 'Toque em Nova para cadastrar a primeira.'))]));
  };
  render();
  const stop = subscribe(render);
  return openSheet({
    title: 'Bebidas', cancel: 'Fechar', onClose: stop,
    action: { label: 'Nova', run: () => presetSheet() },
    content: [h('p.sheet-text', 'Estas bebidas aparecem no botão + da aba Líquidos, já com a quantidade. Cadastre as que você mais toma.'), list],
  });
}

// ---------------------------------------------------------------------------

export function liquidsScreen() {
  const date = ui.date, today = todayISO(), isToday = date === today;
  const goal = waterGoalOn(date);
  const { total, other } = liquidsOn(date);
  const layers = dayLayers(state.drinks, state.water, date);
  const { bands, level } = fillBands(layers, goal);
  const pct = Math.round((total / goal) * 100);
  const left = goal - total;

  // ----- Corpo e números -----
  const actions = h('div.liq-actions',
    h('button.liq-plus', { type: 'button', 'aria-label': 'Adicionar bebida', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: e => drinkMenu(e.currentTarget, date) }, icon('plus')),
    h('button.liq-list-btn', { type: 'button', 'aria-label': 'Bebidas cadastradas', onclick: () => presetsSheet() }, icon('list')));
  const legend = layers.length > 1 ? h('ul.liq-legend', { 'aria-label': 'Bebidas do dia' },
    Object.entries(layers.reduce((m, l) => ({ ...m, [l.type]: (m[l.type] ?? 0) + l.ml }), {}))
      .map(([t, ml]) => h('li', h('span.liq-dot', { style: { background: drinkById(t).color } }), h('span', drinkById(t).label), h('b', amount(ml))))) : null;
  const hero = h('section.liq-hero', { 'aria-label': 'Líquidos do dia' },
    h('div.liq-body', bodyFigure({ style: bodyStyle(), bands, level, key: date,
      label: `Corpo preenchido até ${Math.min(100, pct)}% da meta de líquidos${layers.length ? ': ' + layers.map(l => `${drinkById(l.type).label.toLowerCase()} ${int(l.ml)} ml`).join(', ') : ''}` })),
    h('div.liq-stats',
      h('p.liq-pct', { 'aria-hidden': 'true' }, `${pct}%`),
      h('p.liq-total', h('span.liq-num', int(total)), h('span.liq-unit', `de ${int(goal)} ml`)),
      h('p.liq-left' + (left <= 0 ? '.done' : ''), left > 0 ? `Faltam ${int(left)} ml` : left < 0 ? `Meta atingida, ${int(-left)} ml acima` : 'Meta atingida'),
      legend,
      other > 0 ? h('p.fine', `${int(other)} ml de bebida alcoólica não contam para a meta.`) : null),
    actions);

  // ----- Registros do dia -----
  const items = dayDrinks(date);
  const legacy = state.water[date] ?? 0;
  const sameDay = ts => toISO(new Date(ts)) === date;
  const rows = [
    legacy > 0 ? h('li.liq-row', h('div.liq-edit.static', drinkBadge('agua', 30),
      h('span.liq-name', 'Água', h('span.liq-sub', 'registro anterior')), h('span.liq-ml', `${int(legacy)} ml`)),
    h('button.icon-btn.small', { 'aria-label': `Apagar ${int(legacy)} ml de água (registro anterior)`, onclick: () => clearLegacyWater(date) }, icon('trash'))) : null,
    ...items.map(d => {
      const t = drinkById(d.type);
      return h('li.liq-row' + (t.hydrates ? '' : '.muted'),
        h('button.liq-edit', { type: 'button', onclick: () => drinkSheet({ drink: d }), 'aria-label': `${t.label}${d.note ? `, ${d.note}` : ''}, ${int(d.ml)} ml${sameDay(d.ts) ? `, às ${clock(d.ts)}` : ''}. Editar` },
          drinkBadge(d.type, 30),
          h('span.liq-name', d.note || t.label, h('span.liq-sub', [d.note ? t.label : null, sameDay(d.ts) ? clock(d.ts) : null].filter(Boolean).join(' · ') || ' ')),
          h('span.liq-ml', `${int(d.ml)} ml`)),
        h('button.icon-btn.small', { 'aria-label': `Apagar ${int(d.ml)} ml de ${t.label.toLowerCase()}`,
          onclick: async () => { await removeDrink(d.id); toast('Bebida apagada', { label: 'Desfazer', run: () => restoreDrink(d) }); } }, icon('trash')));
    }),
  ].filter(Boolean);
  const listCard = h('section.card.liq-list', { 'aria-label': 'Registros do dia' },
    h('h3', isToday ? 'Hoje' : fmtDate(date)),
    rows.length ? h('ul.liq-rows', rows)
      : h('div.empty.small', h('p.empty-title', 'Nada registrado'), h('p.empty-text', 'Toque no + para registrar a primeira bebida.')));

  // ----- Trocas -----
  const dSwaps = drinkSwaps(items);
  const swapsCard = dSwaps.length ? h('section.card.swaps-card', { 'aria-label': 'Para a próxima vez' },
    h('h3', 'Para a próxima vez'),
    h('ul.swap-days', dSwaps.map(d => h('li.swap-drink',
      h('p.swap-from', d.label),
      h('p.swap-why', d.reason),
      h('ul.swap-tags', d.alts.map(a => h('li', a))))))) : null;

  // ----- Semana em copos -----
  const w = weekDetail(state.drinks, state.water, waterGoalOn, today, date);
  const dayDetail = (anchor, d) => openPopover({ anchor, label: fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' }), content: h('div.cup-pop',
    h('p.cup-pop-date', fmtDate(d.date, { weekday: 'long', day: 'numeric', month: 'long' })),
    h('p.cup-pop-total', h('b', liters(d.ml)), ` de ${liters(d.goal)} · ${Math.round((d.ml / d.goal) * 100)}%`),
    Object.keys(d.types).length ? h('ul.cup-pop-types', Object.entries(d.types).sort((a, b) => b[1] - a[1]).map(([t, ml]) =>
      h('li', drinkBadge(t, 20), h('span', drinkById(t).label), h('b', amount(ml))))) : h('p.fine', 'Sem registros.'),
    d.date !== date ? h('button.btn.tonal.block', { type: 'button', 'data-close': '', onclick: () => go('liquidos', { date: d.date }) }, 'Ver dia') : null) });
  const cups = h('div.week-cups', w.days.map((d, i) => h('button.week-cup' + (d.date === date ? '.selected' : ''), {
    type: 'button', disabled: d.future, 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    'aria-label': `${fmtDate(d.date, { weekday: 'long', day: 'numeric' })}: ${liters(d.ml)} de ${liters(d.goal)}${d.met ? ', meta atingida' : ''}`,
    onclick: e => dayDetail(e.currentTarget, d) },
  cupFigure({ layers: d.layers, goal: d.goal, met: d.met && d.ml > 0, selected: d.date === date }),
  h('span.week-cup-name', DAY_SHORT[i]),
  h('span.week-cup-ml', d.future ? ' ' : d.ml ? dec1(d.ml / 1000) : '–'),
  h('span.week-cup-met', { 'aria-hidden': 'true' }, d.met && d.ml > 0 ? icon('check') : null))));
  const stat = (label, value) => h('div.week-stat', h('span.stat-label', label), h('b', value));
  const weekCard = h('section.card.week-card', { 'aria-label': 'Semana de líquidos' },
    h('div.card-head', h('h3', 'Semana'),
      h('div.week-nav',
        h('button.icon-btn.small', { 'aria-label': 'Semana anterior', onclick: () => go('liquidos', { date: addDays(date, -7) }) }, icon('back')),
        h('button.icon-btn.small', { 'aria-label': 'Próxima semana', disabled: addDays(date, 7) > today && w.days[6].date >= today, onclick: () => go('liquidos', { date: addDays(date, 7) > today ? today : addDays(date, 7) }) }, icon('next')))),
    cups,
    h('div.week-stats',
      stat('Média por dia', w.avg ? liters(w.avg) : '–'),
      stat('Total da semana', liters(w.total)),
      stat('Dias na meta', `${w.metDays} de ${w.pastDays}`),
      stat('Maior consumo', w.best ? `${DAY_SHORT[w.days.indexOf(w.best)]} · ${liters(w.best.ml)}` : '–')));

  // ----- Meta -----
  const p = state.profile ?? {};
  const kg = latestWeight();
  const suggested = kg ? suggestWaterGoal({ weightKg: kg, activity: p.activity, climate: p.climate }) : null;
  const current = waterGoalOn(today);
  const goalOptions = [...new Set([...GOALS, current])].sort((a, b) => a - b);
  const goalCard = h('section.card.liq-goal', { 'aria-label': 'Meta de líquidos' },
    h('h3', 'Meta diária'),
    h('div.liq-goal-ctl', segmented(goalOptions.map(v => ({ id: String(v), label: dec1(v / 1000).replace(',0', '') })), String(current),
      v => setWaterGoal(Number(v)), 'Meta diária em litros')),
    suggested && suggested !== current ? h('p.liq-suggest', `Sugerida para você: ${liters(suggested)}. `,
      h('button.link.inline', { type: 'button', onclick: () => setWaterGoal(suggested) }, 'Usar')) : null,
    h('p.fine', `Em litros. A meta nova vale a partir de hoje; os dias anteriores mantêm a meta que tinham. ${suggested ? 'A sugestão usa seu peso, sua rotina e o clima. ' : ''}Todas as bebidas contam, menos as alcoólicas. Siga a orientação médica se houver restrição de líquidos.`));

  const title = isToday ? 'Líquidos' : date === addDays(today, -1) ? 'Líquidos de ontem' : 'Líquidos';
  return h('div.screen.liquids',
    h('header.screen-head',
      h('div', h('p.screen-date', fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })), h('h1', title)),
      h('div.day-nav',
        h('button.icon-btn', { 'aria-label': 'Dia anterior', onclick: () => go('liquidos', { date: addDays(date, -1) }) }, icon('back')),
        h('button.icon-btn', { 'aria-label': 'Próximo dia', disabled: isToday, onclick: () => go('liquidos', { date: addDays(date, 1) }) }, icon('next')))),
    h('div.liquids-grid',
      h('div.col.col-hero', hero),
      h('div.col', listCard, swapsCard, weekCard, goalCard)));
}
