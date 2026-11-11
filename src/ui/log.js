// Tela Registrar: campo único (frase livre e busca), código de barras, recentes, favoritos e modelos.
import { h, icon, int, portionText, segmented, toast, confirmSheet } from './dom.js';
import { foodSheet, phraseSheet, manualFoodSheet, barcodeSheet, sourceOf, openEstimate } from './food.js';
import { ui, MEAL_SHORT, mealByClock, go } from './state.js';
import { state, recents, foodById, addEntries, removeTemplate, totals } from '../store.js';
import { search } from '../lib/search.js';
import { parsePhrase } from '../lib/parser.js';
import { todayISO, fmtDate } from '../lib/dates.js';

const foodRow = (food, opts = {}, sub) => h('li', h('button.food-row', { onclick: () => foodSheet(food, opts) },
  h('span.food-text', h('span.food-name', food.n), h('span.food-sub', sub ?? (food.servingKcal ? `Receita típica, ${food.servingUnit} ≈ ${int(food.serving)} g` : sourceOf(food)))),
  food.servingKcal ? h('span.food-kcal', h('b', `≈ ${int(food.servingKcal)}`), ` kcal/${food.servingUnit}`) : h('span.food-kcal', h('b', int(food.k)), ' kcal/100 g')));

const estimateCta = q => h('button.est-cta', { type: 'button', onclick: () => openEstimate(q) },
  icon('search'), h('span', h('b', `Não achou? Estimar calorias de “${q}”`), h('span', 'Receita típica e média de produtos parecidos')), icon('next'));

export function logScreen() {
  ui.meal ??= mealByClock();
  const results = h('div.log-results', { 'aria-live': 'polite' });
  const input = h('input.log-input', { type: 'search', enterkeyhint: 'go', autocomplete: 'off', autocapitalize: 'none', spellcheck: false,
    placeholder: '2 ovos mexidos e 1 pão francês', 'aria-label': 'O que você comeu? Escreva uma frase ou busque um alimento', value: ui.query });

  function lists() {
    const tabs = segmented([{ id: 'recentes', label: 'Recentes' }, { id: 'favoritos', label: 'Favoritos' }, { id: 'modelos', label: 'Modelos' }], ui.logList,
      id => { ui.logList = id; paint(); }, 'Atalhos');
    let body;
    if (ui.logList === 'recentes') {
      const r = recents();
      body = r.length ? h('ul.food-list', r.map(({ food, last }) => foodRow(food, { qty: last.qty, unit: last.unit }, `Última vez: ${portionText(last.qty, last.unit)}`)))
        : h('div.empty.small', h('p.empty-title', 'Sem recentes ainda'), h('p.empty-text', 'O que você registrar aparece aqui para repetir com um toque.'));
    } else if (ui.logList === 'favoritos') {
      const favs = state.favorites.map(foodById).filter(Boolean);
      body = favs.length ? h('ul.food-list', favs.map(f => foodRow(f)))
        : h('div.empty.small', h('p.empty-title', 'Nenhum favorito'), h('p.empty-text', 'Abra um alimento e toque em Favoritar para guardá-lo aqui.'));
    } else {
      body = state.templates.length ? h('ul.food-list', state.templates.map(t => h('li.template',
        h('button.food-row', { onclick: async () => { await addEntries(t.items.map(it => ({ ...it, date: ui.date, meal: ui.meal }))); toast(`${t.name} adicionado`); go('hoje'); } },
          h('span.food-text', h('span.food-name', t.name), h('span.food-sub', `${t.items.length} itens`)),
          h('span.food-kcal', h('b', int(totals(t.items).kcal)), ' kcal')),
        h('button.icon-btn.small', { 'aria-label': `Apagar o modelo ${t.name}`, onclick: () => confirmSheet({ title: 'Apagar modelo?', message: `“${t.name}” sai da lista. Os itens já registrados no diário continuam.`, confirmLabel: 'Apagar modelo', onConfirm: () => removeTemplate(t.id) }) }, icon('trash')))))
        : h('div.empty.small', h('p.empty-title', 'Nenhum modelo'), h('p.empty-text', 'Em Hoje, use os três pontos de uma refeição para salvá-la como modelo.'));
    }
    return [tabs, body];
  }

  function paint() {
    const q = input.value.trim();
    ui.query = input.value;
    if (!q) return results.replaceChildren(...lists());
    const parsed = parsePhrase(q);
    const looksLikePhrase = parsed.length > 1 || /\d|^(um|uma|dois|duas|meio|meia|tres)\b/i.test(q);
    const found = search(state.index, parsed.length === 1 ? parsed[0].query : q, 12).map(r => r.food);
    // replaceChildren escreveria "null" na tela; só entram os blocos que existem.
    results.replaceChildren(...[
      looksLikePhrase ? h('button.phrase-cta', { onclick: () => phraseSheet(q) },
        h('span', h('b', parsed.length > 1 ? `Registrar ${parsed.length} itens desta frase` : 'Registrar esta frase'), h('span', 'Você confere tudo antes de salvar.')), icon('next')) : null,
      found.length ? h('ul.food-list', found.map(f => foodRow(f, parsed.length === 1 && parsed[0].qty !== 1 ? { qty: parsed[0].qty, unit: parsed[0].unit } : {})))
        : !looksLikePhrase || parsed.length === 1 ? h('div.empty.small', h('p.empty-title', 'Nada encontrado na tabela'),
          h('p.empty-text', 'Sem código de barras? O Leve estima pela receita típica ou pela média de produtos parecidos.'),
          h('div.empty-actions',
            h('button.btn.primary', { onclick: () => openEstimate(parsed.length === 1 ? parsed[0].query : q) }, 'Estimar calorias'),
            h('button.btn.tonal', { onclick: () => manualFoodSheet({ n: q }) }, 'Cadastrar alimento'))) : null,
      found.length && (!looksLikePhrase || parsed.length === 1) ? estimateCta(parsed.length === 1 ? parsed[0].query : q) : null,
    ].filter(Boolean));
  }
  input.addEventListener('input', paint);

  const screen = h('div.screen.log',
    h('header.screen-head',
      h('div', h('p.screen-date', ui.date === todayISO() ? 'Hoje' : fmtDate(ui.date)), h('h1', 'Registrar'))),
    h('div.log-grid',
      h('div.col',
        h('form.log-form', { role: 'search', onsubmit: e => { e.preventDefault(); if (input.value.trim()) phraseSheet(input.value.trim()); } },
          h('label.log-box', icon('search'), input)),
        segmented(MEAL_SHORT, ui.meal, id => { ui.meal = id; }, 'Refeição'),
        h('div.log-actions',
          h('button.btn.tonal.grow', { onclick: () => barcodeSheet() }, icon('barcode'), 'Código de barras'),
          h('button.btn.tonal.grow', { onclick: () => manualFoodSheet() }, icon('plus'), 'Alimento manual')),
        h('p.log-source', 'Valores da Tabela Brasileira de Composição de Alimentos (TACO, NEPA/UNICAMP) e do Open Food Facts.')),
      h('div.col', results)));
  paint();
  return screen;
}
