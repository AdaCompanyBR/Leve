// Tela Hoje: anel de calorias, macros, refeições, água e "O que cabe?".
import { h, icon, int, dec1, parseNum, portionText, openSheet, toast, haptic, field } from './dom.js';
import { createRing } from './ring.js';
import { foodSheet, undoToast } from './food.js';
import { daySwaps, swapSheet } from './swaps.js';
import { drinkSheet } from './drink.js';
import { ui, go } from './state.js';
import { state, MEALS, getPlan, dayEntries, totals, budgetFor, addDrink, removeWater, liquidsOn, dayDrinks, setWeight, removeEntry, copyPreviousDay, saveTemplate, foodById, latestWeight } from '../store.js';
import { search } from '../lib/search.js';
import { toGrams, nutrientsFor } from '../lib/portions.js';
import { todayISO, addDays, fmtDate } from '../lib/dates.js';

const GLASS = 250;

// Porções comuns para o "O que cabe?". Os valores vêm da TACO; as porções são estimativas.
const FITS = [
  ['banana prata', 1, 'unidade'], ['maçã fuji', 1, 'unidade'], ['iogurte natural', 1, 'unidade'], ['ovo cozido', 1, 'unidade'],
  ['pão francês', 1, 'unidade'], ['queijo minas frescal', 1, 'fatia'], ['mamão papaia', 1, 'fatia'], ['castanha de caju', 30, 'g'],
  ['arroz', 4, 'colher de sopa'], ['feijão carioca', 1, 'concha'], ['frango peito grelhado', 120, 'g'], ['batata doce cozida', 150, 'g'],
  ['tapioca', 80, 'g'], ['aveia flocos', 2, 'colher de sopa'], ['laranja pera', 1, 'unidade'], ['pão integral forma', 2, 'fatia'],
];
let fitsCache;
function fitOptions() {
  fitsCache ??= FITS.map(([q, qty, unit]) => {
    const food = search(state.index, q, 1)[0]?.food;
    if (!food) return null;
    const g = toGrams(food.n, unit, qty);
    return { food, qty, unit, grams: g.grams, ...nutrientsFor(food, g.grams) };
  }).filter(Boolean);
  return fitsCache;
}
function whatFits(remaining) {
  const ok = fitOptions().filter(o => o.kcal <= remaining && o.kcal > 0).sort((a, b) => b.kcal - a.kcal);
  if (ok.length <= 4) return ok;
  // Espalha as sugestões entre as mais e as menos calóricas que cabem.
  const step = (ok.length - 1) / 3;
  return [0, 1, 2, 3].map(i => ok[Math.round(i * step)]);
}

const shortName = n => n;
const portion = e => portionText(e.qty, e.unit);

function swipeToDelete(row, onDelete) {
  let x0 = null, y0 = 0, dx = 0, locked = false;
  const inner = row.firstChild;
  row.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; x0 = e.clientX; y0 = e.clientY; dx = 0; locked = false; });
  row.addEventListener('pointermove', e => {
    if (x0 == null) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!locked) { if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { x0 = null; return; } if (Math.abs(mx) < 10) return; locked = true; row.classList.add('swiping'); }
    dx = Math.min(0, mx);
    inner.style.transform = `translateX(${dx}px)`;
    row.classList.toggle('armed', dx < -96);
  });
  const end = () => {
    if (x0 == null) return; x0 = null;
    row.classList.remove('swiping');
    if (dx < -96) { haptic(15); inner.style.transform = 'translateX(-100%)'; setTimeout(onDelete, 160); }
    else inner.style.transform = '';
    if (locked) row.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true }); // não abrir a edição ao soltar
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
}

function weightSheet(date = todayISO()) {
  const existing = state.weights.find(w => w.date === date);
  const input = h('input', { inputmode: 'decimal', autofocus: true, autocomplete: 'off', value: dec1(existing?.kg ?? latestWeight() ?? 70) });
  const err = h('p.ob-err', { role: 'alert' });
  const sheet = openSheet({
    title: 'Registrar peso',
    content: h('form', { onsubmit: async e => {
      e.preventDefault();
      const kg = parseNum(input.value);
      if (!(kg >= 30 && kg <= 300)) { err.textContent = 'Informe um peso entre 30 e 300 kg.'; return; }
      await setWeight(date, Math.round(kg * 10) / 10); haptic(12); sheet.close(); toast('Peso registrado');
    } },
      field(`Peso em ${date === todayISO() ? 'hoje' : fmtDate(date)} (kg)`, input, 'O peso oscila com água e sal. O que conta é a tendência.'),
      err, h('button.btn.primary.block', { type: 'submit' }, 'Salvar peso')),
  });
}
export { weightSheet };

function mealMenu(meal, entries) {
  const name = h('input', { value: `${meal.label} de ${fmtDate(ui.date, { day: 'numeric', month: 'short' })}`, maxlength: 40, autofocus: true });
  const sheet = openSheet({
    title: 'Salvar como modelo',
    content: h('form', { onsubmit: async e => { e.preventDefault(); await saveTemplate(name.value.trim() || meal.label, entries); sheet.close(); toast('Modelo salvo'); } },
      h('p.sheet-text', `Os ${entries.length} itens desta refeição ficam em Registrar, na aba Modelos.`),
      field('Nome do modelo', name), h('button.btn.primary.block', { type: 'submit' }, 'Salvar modelo')),
  });
}

export function todayScreen() {
  const date = ui.date, isToday = date === todayISO();
  const plan = getPlan();
  const entries = dayEntries(date);
  const t = totals(entries);
  const budget = budgetFor(date);
  const target = budget?.todayTarget ?? plan?.target ?? null;
  const remaining = target != null ? target - t.kcal : null;

  // ----- Anel -----
  const canvas = h('canvas.ring-canvas', { role: 'img', 'aria-label': target ? `${int(t.kcal)} de ${int(target)} kcal consumidas` : `${int(t.kcal)} kcal consumidas` });
  requestAnimationFrame(() => createRing(canvas, () => (target ? t.kcal / target : 0)));
  const over = remaining != null && remaining < 0;
  const ringCard = h('section.card.ring-card', { 'aria-label': 'Calorias do dia' },
    h('div.ring-wrap', canvas,
      h('div.ring-center',
        h('span.ring-number', int(target != null ? Math.abs(remaining) : t.kcal)),
        h('span.ring-label', target == null ? 'kcal consumidas' : over ? 'kcal acima da meta' : 'kcal restantes'))),
    target != null ? h('div.ring-stats',
      h('div', h('span.stat-value', int(t.kcal)), h('span.stat-label', 'Consumidas')),
      h('div', h('span.stat-value', int(target)), h('span.stat-label', budget?.adjusted ? 'Meta ajustada' : 'Meta do dia'))) : null,
    over ? h('p.ring-note', 'Um dia acima da meta não desfaz o plano. O saldo da semana equilibra os próximos dias.') : null,
    !over && budget?.adjusted ? h('p.ring-note', `A meta de hoje considera ${int(budget.carry)} kcal a mais de dias anteriores, diluídas no resto da semana.`) : null,
    plan?.mode === 'menor' ? h('p.ring-note', 'O Leve não define metas de déficit para menores de 18 anos. Procure um médico ou nutricionista.') : null);

  // ----- Macros -----
  const macro = (label, value, goal) => {
    const pct = goal ? Math.min(100, (value / goal) * 100) : 0;
    return h('div.macro',
      h('div.macro-head', h('span.macro-name', label), h('span.macro-val', h('b', int(value)), goal ? ` de ${int(goal)} g` : ' g')),
      h('div.bar', { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': goal || 100, 'aria-valuenow': Math.round(value) }, h('span', { style: { width: pct + '%' } })));
  };
  const m = plan?.macros;
  const macrosCard = h('section.card.macros', { 'aria-label': 'Macronutrientes' },
    macro('Proteína', t.p, m?.protein), macro('Carboidrato', t.c, m?.carbs), macro('Gordura', t.f, m?.fat));

  // ----- Refeições -----
  const mealSections = MEALS.map(meal => {
    const items = entries.filter(e => e.meal === meal.id);
    const sub = totals(items).kcal;
    return h('section.meal',
      h('header.meal-head',
        h('h3', meal.label),
        items.length ? h('span.meal-kcal', `${int(sub)} kcal`) : null,
        items.length ? h('button.icon-btn.small', { 'aria-label': `Salvar ${meal.label} como modelo`, onclick: () => mealMenu(meal, items) }, icon('more')) : null,
        h('button.icon-btn.small.tonal', { 'aria-label': `Adicionar em ${meal.label}`, onclick: () => go('registrar', { meal: meal.id }) }, icon('plus'))),
      items.length ? h('ul.entries', items.map(e => {
        const row = h('li.entry',
          h('button.entry-main', { onclick: () => foodSheet(foodById(e.foodId), { entry: e }), 'aria-label': `${e.name}, ${portion(e)}, ${int(e.kcal)} kcal. Editar` },
            h('span.entry-text', h('span.entry-name', shortName(e.name)), h('span.entry-portion', portion(e) + (e.unit === 'g' || e.unit === 'ml' ? '' : `, ≈ ${int(e.grams)} g`))),
            h('span.entry-kcal', int(e.kcal))),
          h('span.entry-delete', { 'aria-hidden': 'true' }, icon('trash')));
        swipeToDelete(row, async () => { await removeEntry(e.id); undoToast(e); });
        return row;
      })) : null);
  });
  const hasYesterday = dayEntries(addDays(date, -1)).length > 0;
  const mealsCard = h('section.card.meals', { 'aria-label': 'Refeições' },
    !entries.length ? h('div.empty',
      h('p.empty-title', isToday ? 'Nada registrado hoje' : 'Nada registrado neste dia'),
      h('p.empty-text', 'Escreva o que comeu em uma frase, como “2 ovos e 1 pão francês”.'),
      h('div.empty-actions',
        h('button.btn.primary', { onclick: () => go('registrar', { meal: null }) }, 'Registrar refeição'),
        hasYesterday ? h('button.btn.tonal', { onclick: async () => { const n = await copyPreviousDay(date); toast(`${n} itens copiados`); } }, 'Copiar o dia anterior') : null)) : null,
    mealSections);

  // ----- Água -----
  const ml = liquidsOn(date).total, goal = state.settings.waterGoal;
  const canRemove = (state.water[date] ?? 0) > 0 || dayDrinks(date).some(d => d.type === 'agua');
  const waterCard = h('section.card.water', { 'aria-label': 'Líquidos' },
    h('div.water-head', h('h3', 'Líquidos'), h('span.water-val', h('b', int(ml)), ` de ${int(goal)} ml`)),
    h('div.bar', { role: 'progressbar', 'aria-label': 'Líquidos', 'aria-valuemin': 0, 'aria-valuemax': goal, 'aria-valuenow': ml }, h('span', { style: { width: Math.min(100, (ml / goal) * 100) + '%' } })),
    h('div.water-actions',
      h('button.btn.tonal', { disabled: !canRemove, 'aria-label': `Remover um copo de água`, onclick: () => removeWater(date, GLASS) }, icon('minus')),
      h('button.btn.tonal.grow', { onclick: () => { haptic(); addDrink(date, 'agua', GLASS); } }, icon('drop'), `Água ${GLASS} ml`)),
    h('div.water-links',
      h('button.link', { onclick: () => drinkSheet({ date }) }, 'Valor exato'),
      h('button.link', { onclick: () => go('liquidos', { date }) }, 'Ver líquidos')));

  // ----- O que cabe? -----
  let fitsCard = null;
  if (isToday && remaining != null && entries.length) {
    const options = remaining > 40 ? whatFits(remaining) : [];
    fitsCard = h('section.card.fits', { 'aria-label': 'O que cabe?' },
      h('h3', 'O que cabe?'),
      options.length
        ? [h('p.card-sub', `Ideias dentro das ${int(remaining)} kcal que restam hoje.`),
          h('ul.fit-list', options.map(o => h('li', h('button.fit', { onclick: () => foodSheet(o.food, { qty: o.qty, unit: o.unit }) },
            h('span.fit-name', shortName(o.food.n)), h('span.fit-portion', portion(o)), h('span.fit-kcal', `${int(o.kcal)} kcal`)))))]
        : h('p.card-sub', 'Você chegou à meta de hoje. Se a fome apertar, água, chá e vegetais folhosos pesam pouco no saldo.'));
  }

  // ----- Trocas para a próxima vez -----
  const swaps = daySwaps(entries);
  const swapsCard = swaps.length ? h('section.card.swaps-card', { 'aria-label': 'Trocas para a próxima vez' },
    h('h3', 'Trocas para a próxima vez'),
    h('p.card-sub', 'Opções com menos calorias para itens deste dia, e o motivo de cada uma.'),
    h('ul.swap-days', swaps.map(({ entry: e, s }) => {
      const best = s.alts[0];
      return h('li', h('button.swap-day', { onclick: () => swapSheet(e.name, s, (f, g) => foodSheet(f, { qty: g, unit: 'g', meal: e.meal })) },
        h('span.swap-from', e.name, h('span.swap-sub', `${portion(e)}, ${int(e.kcal)} kcal`)),
        h('span.swap-to', icon('swap'), h('span', best.label.replace(/,\s*/g, ' '), h('b', best.kcal == null ? ': quase sem calorias' : `: ${int(best.saved)} kcal a menos`))),
        h('span.swap-why', s.reason)));
    }))) : null;

  // ----- Lembrete de peso -----
  const needsWeight = isToday && state.settings.weightReminder && !state.weights.some(w => w.date === date);
  const weightCard = needsWeight ? h('button.card.nudge', { onclick: () => weightSheet() },
    icon('scale'), h('span.nudge-text', h('b', 'Registrar o peso de hoje'), h('span', 'Leva cinco segundos e melhora a previsão.')), icon('next')) : null;

  const title = isToday ? 'Hoje' : date === addDays(todayISO(), -1) ? 'Ontem' : fmtDate(date, { day: 'numeric', month: 'long' });
  return h('div.screen.today',
    h('header.screen-head',
      h('div', h('p.screen-date', fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })), h('h1', title)),
      h('div.day-nav',
        h('button.icon-btn', { 'aria-label': 'Dia anterior', onclick: () => go('hoje', { date: addDays(date, -1) }) }, icon('back')),
        h('button.icon-btn', { 'aria-label': 'Próximo dia', disabled: isToday, onclick: () => go('hoje', { date: addDays(date, 1) }) }, icon('next')))),
    h('div.today-grid',
      h('div.col.col-hero', ringCard, macrosCard),
      h('div.col.col-meals', weightCard, mealsCard),
      h('div.col.col-side', waterCard, swapsCard, fitsCard)));
}
