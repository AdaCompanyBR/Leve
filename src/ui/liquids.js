// Tela Líquidos: total do dia, registro por tipo de bebida, lista do dia e semana.
import { h, icon, int, dec1, parseNum, toast, haptic, field, segmented } from './dom.js';
import { ui, go } from './state.js';
import { state, addDrink, removeDrink, restoreDrink, clearLegacyWater, dayDrinks, liquidsOn, saveSettings } from '../store.js';
import { drinkSwaps } from './swaps.js';
import { DRINKS, SIZES, drinkById, byType, weekSeries } from '../lib/hydration.js';
import { todayISO, addDays, fmtDate, toISO } from '../lib/dates.js';

export const GOALS = [1500, 2000, 2500, 3000, 3500];
const liters = ml => `${dec1(ml / 1000)} L`;
const amount = ml => (ml >= 1000 ? liters(ml) : `${int(ml)} ml`);
const clock = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

async function add(date, type, ml) {
  if (!(ml > 0) || ml > 5000) return toast('Use uma quantidade entre 1 e 5.000 ml');
  haptic();
  const row = await addDrink(date, type, ml);
  toast(`${drinkById(type).label}: ${int(ml)} ml`, { label: 'Desfazer', run: () => removeDrink(row.id) });
}

export function liquidsScreen() {
  const date = ui.date, isToday = date === todayISO();
  const goal = state.settings.waterGoal;
  ui.drinkType ??= 'agua';
  const type = drinkById(ui.drinkType);
  const { total, other } = liquidsOn(date);
  const pct = Math.min(100, (total / goal) * 100);

  // ----- Total do dia -----
  const left = goal - total;
  const heroCard = h('section.card.liq-hero', { 'aria-label': 'Total do dia' },
    h('span.stat-label', isToday ? 'Hoje' : fmtDate(date)),
    h('div.liq-now', h('span.liq-num', dec1(total / 1000)), h('span.liq-unit', `de ${liters(goal)}`)),
    h('div.bar.liq-bar', { role: 'progressbar', 'aria-label': 'Líquidos do dia', 'aria-valuemin': 0, 'aria-valuemax': goal, 'aria-valuenow': total, 'aria-valuetext': `${liters(total)} de ${liters(goal)}` },
      h('span', { style: { width: pct + '%' } })),
    h('p.card-sub', left > 0 ? `Faltam ${amount(left)} para a meta${isToday ? ' de hoje' : ''}.` : 'Meta de líquidos atingida.'),
    other > 0 ? h('p.fine', `${amount(other)} de bebida alcoólica aparecem na lista, mas não contam para a meta.`) : null);

  // ----- Adicionar -----
  const custom = h('input', { type: 'text', inputmode: 'numeric', placeholder: 'Ex.: 180', autocomplete: 'off', 'aria-describedby': 'liq-custom-hint' });
  const submitCustom = e => { e.preventDefault(); const ml = parseNum(custom.value); add(date, type.id, ml).then(() => { if (ml > 0 && ml <= 5000) custom.value = ''; }); };
  const addCard = h('section.card.liq-add', { 'aria-label': 'Adicionar bebida' },
    h('h3', 'Adicionar'),
    h('div.chip-row.liq-types', { role: 'group', 'aria-label': 'Tipo de bebida' },
      DRINKS.map(d => h('button.chip', { type: 'button', 'aria-pressed': String(d.id === type.id), onclick: () => go('liquidos', { drinkType: d.id }) }, d.label))),
    h('div.liq-sizes', { role: 'group', 'aria-label': `Quantidade de ${type.label.toLowerCase()}` },
      SIZES.map(ml => h('button.liq-size', { type: 'button', onclick: () => add(date, type.id, ml), 'aria-label': `Adicionar ${ml} ml de ${type.label.toLowerCase()}` },
        h('b', int(ml)), h('span', 'ml')))),
    h('form.liq-custom', { onsubmit: submitCustom },
      field('Outra quantidade (ml)', custom),
      h('button.btn.tonal', { type: 'submit' }, icon('plus'), 'Adicionar')),
    h('p.fine', { id: 'liq-custom-hint' },
      !type.hydrates ? 'Bebida alcoólica fica registrada, mas não conta para a meta de líquidos. ' : '',
      type.food ? ['Aqui entra só o volume. ', h('button.link.inline', { type: 'button', onclick: () => go('registrar', { query: type.food }) }, `Registrar as calorias de ${type.label.toLowerCase()}`), '.']
        : 'Aqui entra só o volume.'));

  // ----- Registros do dia -----
  const items = dayDrinks(date);
  const legacy = state.water[date] ?? 0;
  const sameDay = ts => toISO(new Date(ts)) === date;
  const rows = [
    legacy > 0 ? h('li.liq-row',
      h('span.liq-time', '—'),
      h('span.liq-name', 'Água', h('span.liq-sub', 'registro anterior')),
      h('span.liq-ml', `${int(legacy)} ml`),
      h('button.icon-btn.small', { 'aria-label': `Apagar ${int(legacy)} ml de água (registro anterior)`, onclick: () => clearLegacyWater(date) }, icon('trash'))) : null,
    ...items.map(d => h('li.liq-row' + (drinkById(d.type).hydrates ? '' : '.muted'),
      h('span.liq-time', sameDay(d.ts) ? clock(d.ts) : '—'),
      h('span.liq-name', drinkById(d.type).label),
      h('span.liq-ml', `${int(d.ml)} ml`),
      h('button.icon-btn.small', { 'aria-label': `Apagar ${int(d.ml)} ml de ${drinkById(d.type).label.toLowerCase()}`,
        onclick: async () => { await removeDrink(d.id); toast('Bebida apagada', { label: 'Desfazer', run: () => restoreDrink(d) }); } }, icon('trash')))),
  ].filter(Boolean);
  const types = byType(state.drinks, state.water, date);
  const listCard = h('section.card.liq-list', { 'aria-label': 'Registros do dia' },
    h('h3', isToday ? 'Registros de hoje' : `Registros de ${fmtDate(date)}`),
    rows.length ? [
      types.length > 1 ? h('ul.liq-types-sum', types.map(t => h('li' + (t.hydrates ? '' : '.muted'),
        h('span', drinkById(t.type).label), h('b', amount(t.ml))))) : null,
      h('ul.liq-rows', rows)]
      : h('div.empty.small', h('p.empty-title', 'Nada registrado neste dia'), h('p.empty-text', 'Escolha o tipo de bebida e toque na quantidade.')));

  // ----- Trocas -----
  const dSwaps = drinkSwaps(items);
  const swapsCard = dSwaps.length ? h('section.card.swaps-card', { 'aria-label': 'Para a próxima vez' },
    h('h3', 'Para a próxima vez'),
    h('ul.swap-days', dSwaps.map(d => h('li.swap-drink',
      h('p.swap-from', d.label),
      h('p.swap-why', d.reason),
      h('ul.swap-tags', d.alts.map(a => h('li', a))))))) : null;

  // ----- Semana -----
  const w = weekSeries(state.drinks, state.water, goal, date);
  const maxMl = Math.max(goal * 1.25, ...w.days.map(d => d.ml));
  const names = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  const pastDays = w.days.filter(d => !d.future).length;
  const target = h('span.week-target'); target.style.setProperty('--t', (goal / maxMl).toFixed(3));
  const weekCard = h('section.card.week-card', { 'aria-label': 'Semana de líquidos' },
    h('h3', 'Semana'),
    h('p.card-sub', w.avg ? `Média de ${liters(w.avg)} nos dias com registro. Meta atingida em ${w.metDays} de ${pastDays} ${pastDays === 1 ? 'dia' : 'dias'}.` : 'Sem registros nesta semana ainda.'),
    h('div.week-bars', { role: 'img', 'aria-label': w.days.filter(d => d.ml > 0).map(d => `${fmtDate(d.date, { weekday: 'long' })}: ${liters(d.ml)}`).join('. ') || 'Sem registros nesta semana' },
      target,
      w.days.map((d, i) => h('button.week-day' + (d.date === date ? '.is-today' : ''), { type: 'button', tabindex: -1, 'aria-hidden': 'true', disabled: d.future, onclick: () => go('liquidos', { date: d.date }) },
        h('span.week-bar' + (d.ml ? '' : '.none'), { style: { height: `${d.ml ? Math.max(4, (d.ml / maxMl) * 100) : 0}%` } }),
        h('span.week-name', names[i])))),
    h('p.fine', 'A linha tracejada marca a meta diária. Toque em um dia para abrir os registros dele.'));

  // ----- Meta -----
  const goalCard = h('section.card.liq-goal', { 'aria-label': 'Meta de líquidos' },
    h('h3', 'Meta diária'),
    h('div.liq-goal-ctl', segmented(GOALS.map(v => ({ id: String(v), label: dec1(v / 1000) })), String(goal), v => saveSettings({ waterGoal: Number(v) }), 'Meta diária em litros')),
    h('p.fine', 'Em litros. Água, café, chá, leite, sucos e outras bebidas contam. Em dias quentes ou com exercício, o corpo pede mais. Quem tem orientação médica para limitar líquidos deve seguir essa orientação.'));

  const title = isToday ? 'Líquidos' : date === addDays(todayISO(), -1) ? 'Líquidos de ontem' : 'Líquidos';
  return h('div.screen.liquids',
    h('header.screen-head',
      h('div', h('p.screen-date', fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })), h('h1', title)),
      h('div.day-nav',
        h('button.icon-btn', { 'aria-label': 'Dia anterior', onclick: () => go('liquidos', { date: addDays(date, -1) }) }, icon('back')),
        h('button.icon-btn', { 'aria-label': 'Próximo dia', disabled: isToday, onclick: () => go('liquidos', { date: addDays(date, 1) }) }, icon('next')))),
    h('div.liquids-grid',
      h('div.col', heroCard, addCard),
      h('div.col', listCard, swapsCard, weekCard, goalCard)));
}
