// Janela de bebida: valor grande em ml ou litros, tipo com ícone, data e horário em pílulas e, no
// celular, um teclado numérico próprio. Também edita e apaga.
import { h, icon, int, dec1, openSheet, segmented, field, toast, haptic } from './dom.js';
import { ui } from './state.js';
import { addDrink, updateDrink, removeDrink, restoreDrink } from '../store.js';
import { DRINKS, drinkById, parseAmount, MAX_ML } from '../lib/hydration.js';
import { drinkBadge } from './body.js';
import { todayISO, fmtDate } from '../lib/dates.js';

const PRESETS = [200, 250, 300, 350, 500, 1000];
const pad = n => String(n).padStart(2, '0');
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const nf3 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3, useGrouping: false });
/** Valor para o campo: em litros, sem arredondar (473 ml vira 0,473). */
const fmtNum = (ml, unit) => (unit === 'L' ? nf3.format(ml / 1000) : String(ml));
const PLACEHOLDER = { agua: 'Ex.: água filtrada', gas: 'Ex.: água tônica sem açúcar', cafe: 'Ex.: café com leite', cha: 'Ex.: chá verde', suco: 'Ex.: suco de uva integral', leite: 'Ex.: leite desnatado',
  refri: 'Ex.: guaraná', zero: 'Ex.: Coca-Cola Zero', alcool: 'Ex.: cerveja', isotonico: 'Ex.: isotônico de limão', coco: 'Ex.: água de coco de caixinha', outro: 'Ex.: kombucha' };

// Outros nomes pelos quais a pessoa procura cada bebida.
const ALIASES = {
  agua: 'agua mineral filtrada', gas: 'agua com gas gaseificada tonica', cafe: 'cafe expresso espresso cafezinho pingado cappuccino', cha: 'cha mate verde preto gelado',
  suco: 'suco limonada laranjada vitamina smoothie', leite: 'leite achocolatado iogurte', coco: 'agua de coco', refri: 'refrigerante refri coca guarana fanta soda',
  zero: 'refrigerante zero diet coca zero', isotonico: 'isotonico gatorade powerade', alcool: 'alcool cerveja vinho chopp caipirinha drink', outro: 'outro outra kombucha energetico caldo',
};
const plain = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * Escolha do tipo de bebida: um campo para digitar e filtrar, e todas as opções à vista, em linhas
 * (sem rolagem lateral, que no computador não dá para alcançar com o mouse).
 */
export function typePicker({ value, onChange }) {
  let current = value;
  const chips = DRINKS.map(d => {
    const b = h('button.chip', { type: 'button', 'aria-pressed': String(d.id === current), onclick: () => pick(d.id) }, drinkBadge(d.id, 26), d.label);
    b.dataset.id = d.id;
    b.dataset.find = plain(`${d.label} ${ALIASES[d.id] ?? ''}`);
    return b;
  });
  const row = h('div.chip-row.drink-types', { role: 'group', 'aria-label': 'Tipo de bebida' }, chips);
  const none = h('p.fine.type-none', { hidden: true, 'aria-live': 'polite' }, 'Nenhuma bebida com esse nome. Escolha “Outro” e escreva o nome abaixo.');
  const input = h('input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, placeholder: 'Buscar bebida', 'aria-label': 'Buscar bebida' });
  const clear = h('button.search-clear', { type: 'button', 'aria-label': 'Limpar busca', hidden: true, onclick: () => { input.value = ''; filter(); input.focus(); } }, icon('clear'));
  const visible = () => chips.filter(b => !b.hidden);
  function filter() {
    const q = plain(input.value);
    clear.hidden = !input.value;
    for (const b of chips) b.hidden = !!q && !q.split(/\s+/).every(w => b.dataset.find.includes(w));
    // Com a busca vazia, "Outro" continua à mão; sem resultado, ele é a saída.
    if (!visible().length) { chips.find(b => b.dataset.id === 'outro').hidden = false; none.hidden = false; } else none.hidden = true;
  }
  function pick(id) {
    current = id;
    for (const b of chips) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    onChange(id);
  }
  input.addEventListener('input', filter);
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const first = visible()[0];
    if (first && input.value.trim()) { pick(first.dataset.id); input.value = ''; filter(); }
  });
  return h('div.type-picker', h('div.search', icon('search'), input, clear), row, none);
}

/** Abre o registro de líquido. Com `drink`, edita um registro existente. */
export function drinkSheet({ date = ui.date, type, drink, ml: preset } = {}) {
  const editing = !!drink;
  const v = {
    type: drink?.type ?? type ?? ui.drinkType ?? 'agua',
    unit: ui.drinkUnit ?? 'ml',
    date: drink?.date ?? date,
    time: drink ? hhmm(new Date(drink.ts)) : hhmm(new Date()),
  };
  const today = todayISO();

  // Toque (celular): teclado próprio, sem abrir o do sistema por cima da janela.
  const touch = matchMedia('(pointer: coarse)').matches;
  const start = drink?.ml ?? preset;
  const amountInput = h('input.big-input', { inputmode: touch ? 'none' : 'decimal', autocomplete: 'off', enterkeyhint: 'done', autofocus: !touch,
    placeholder: v.unit === 'L' ? '0,5' : '350', 'aria-label': 'Quantidade', value: start ? fmtNum(start, v.unit) : '' });
  const typeName = h('p.drink-type-name', drinkById(v.type).label);
  const unitLabel = h('span.big-unit', v.unit);
  const preview = h('p.field-hint.drink-preview', { 'aria-live': 'polite' });
  const noteInput = h('input', { type: 'text', maxlength: 40, autocomplete: 'off', value: drink?.note ?? '', placeholder: PLACEHOLDER[v.type] });
  const dateInput = h('input.pill-input', { type: 'date', 'aria-label': 'Data', max: today, value: v.date, required: true });
  const timeInput = h('input.pill-input', { type: 'time', 'aria-label': 'Horário', value: v.time, required: true });

  const readMl = () => parseAmount(amountInput.value, v.unit);
  let sheet = null;

  function paint() {
    const ml = readMl();
    const empty = !amountInput.value.trim();
    preview.textContent = empty ? `Digite o valor exato, em ${v.unit === 'L' ? 'litros' : 'mililitros'}.`
      : Number.isNaN(ml) ? `Use um valor entre 1 ml e ${dec1(MAX_ML / 1000).replace(',0', '')} litros.`
        : v.unit === 'L' ? `= ${int(ml)} ml` : ml >= 1000 ? `= ${dec1(ml / 1000)} L` : '';
    preview.classList.toggle('error', !empty && Number.isNaN(ml));
    sheet?.setAction({ disabled: Number.isNaN(ml) || !dateInput.value || !timeInput.value });
    presets.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.ml) === ml)));
    if (comma) comma.disabled = v.unit !== 'L';
  }

  const presets = h('div.chip-row.drink-presets', { role: 'group', 'aria-label': 'Preencher com um tamanho comum' },
    PRESETS.map(ml => h('button.chip', { type: 'button', 'data-ml': ml, onclick: () => { amountInput.value = fmtNum(ml, v.unit); paint(); } },
      ml >= 1000 ? `${dec1(ml / 1000).replace(',0', '')} L` : `${ml} ml`)));

  const unitCtl = segmented([{ id: 'ml', label: 'ml' }, { id: 'L', label: 'Litros' }], v.unit, u => {
    const ml = readMl();
    v.unit = ui.drinkUnit = u;
    unitLabel.textContent = u;
    amountInput.placeholder = u === 'L' ? '0,5' : '350';
    if (!Number.isNaN(ml)) amountInput.value = fmtNum(ml, u);
    paint();
    amountInput.focus();
  }, 'Unidade');

  const typeChips = typePicker({ value: v.type, onChange: id => {
    const d = drinkById(id);
    v.type = id;
    typeName.textContent = d.label;
    noteInput.placeholder = PLACEHOLDER[id];
    hint.textContent = d.hydrates ? '' : 'Bebida alcoólica fica registrada, mas não conta para a meta de líquidos.';
    paint();
  } });

  // Teclado numérico (só no toque).
  let comma = null;
  const press = k => {
    const cur = amountInput.value;
    if (k === 'del') amountInput.value = cur.slice(0, -1);
    else if (k === ',') { if (!cur.includes(',')) amountInput.value = (cur || '0') + ','; }
    else if (cur.replace(',', '').length < 5) amountInput.value = cur === '0' ? k : cur + k;
    haptic(4);
    paint();
  };
  const keypad = touch ? h('div.keypad', { role: 'group', 'aria-label': 'Teclado numérico' },
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'del'].map(k => {
      const b = h('button', { type: 'button', 'aria-label': k === 'del' ? 'Apagar dígito' : k === ',' ? 'Vírgula' : k, onclick: () => press(k) }, k === 'del' ? icon('delete') : k);
      if (k === ',') comma = b;
      return b;
    })) : null;
  const hint = h('p.fine', drinkById(v.type).hydrates ? '' : 'Bebida alcoólica fica registrada, mas não conta para a meta de líquidos.');

  amountInput.addEventListener('input', paint);
  dateInput.addEventListener('input', paint);
  timeInput.addEventListener('input', paint);

  async function submit(e) {
    e.preventDefault();
    const ml = readMl();
    if (Number.isNaN(ml) || !dateInput.value || !timeInput.value) return;
    if (dateInput.value > today) return toast('A data não pode ser no futuro');
    const [y, m, d] = dateInput.value.split('-').map(Number);
    const [hh, mm] = timeInput.value.split(':').map(Number);
    const ts = new Date(y, m - 1, d, hh, mm).getTime();
    const patch = { type: v.type, ml, date: dateInput.value, ts, note: noteInput.value.trim() || undefined };
    haptic(12);
    if (editing) {
      await updateDrink(drink.id, patch);
      sheet.close();
      toast('Registro atualizado');
    } else {
      ui.drinkType = v.type;
      const row = await addDrink(patch.date, v.type, ml, { ts, ...(patch.note ? { note: patch.note } : {}) });
      sheet.close();
      toast(`${drinkById(v.type).label}: ${int(ml)} ml${patch.date !== date ? ` em ${fmtDate(patch.date)}` : ''}`, { label: 'Desfazer', run: () => removeDrink(row.id) });
    }
  }

  sheet = openSheet({
    title: editing ? 'Editar bebida' : type === 'agua' ? 'Registrar água' : 'Outra bebida',
    action: { label: editing ? 'Salvar' : 'Adicionar', run: () => sheet.body.querySelector('form').requestSubmit() },
    content: h('form.drink-form', { onsubmit: submit, novalidate: true },
      h('div.big-field.drink-amount', amountInput, unitLabel),
      typeName,
      preview,
      typeChips,
      hint,
      presets,
      h('div.drink-when', dateInput, timeInput),
      keypad,
      h('div.drink-unit', unitCtl),
      field('Nome (opcional)', noteInput),
      editing ? h('div.chip-row', h('button.chip', { type: 'button', onclick: async () => {
        await removeDrink(drink.id); sheet.close();
        toast('Registro apagado', { label: 'Desfazer', run: () => restoreDrink(drink) });
      } }, icon('trash'), h('span', 'Apagar'))) : null,
    ),
  });
  paint();
  return sheet;
}
