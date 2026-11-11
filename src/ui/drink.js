// Sheet de líquido: valor exato em ml ou litros, tipo, nome opcional, data e horário. Também edita e apaga.
import { h, icon, int, dec1, openSheet, segmented, field, toast, haptic } from './dom.js';
import { ui } from './state.js';
import { addDrink, updateDrink, removeDrink, restoreDrink } from '../store.js';
import { DRINKS, drinkById, parseAmount, MAX_ML } from '../lib/hydration.js';
import { todayISO, fmtDate } from '../lib/dates.js';

const PRESETS = [200, 250, 300, 350, 500, 1000];
const pad = n => String(n).padStart(2, '0');
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const nf3 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3, useGrouping: false });
/** Valor para o campo: em litros, sem arredondar (473 ml vira 0,473). */
const fmtNum = (ml, unit) => (unit === 'L' ? nf3.format(ml / 1000) : String(ml));
const PLACEHOLDER = { agua: 'Ex.: água com gás', cafe: 'Ex.: café com leite', cha: 'Ex.: chá verde', suco: 'Ex.: suco de uva integral', leite: 'Ex.: leite desnatado',
  refri: 'Ex.: guaraná', zero: 'Ex.: Coca-Cola Zero', alcool: 'Ex.: cerveja', isotonico: 'Ex.: isotônico de limão', coco: 'Ex.: água de coco de caixinha', outro: 'Ex.: kombucha' };

/** Abre o registro de líquido. Com `drink`, edita um registro existente. */
export function drinkSheet({ date = ui.date, type, drink } = {}) {
  const editing = !!drink;
  const v = {
    type: drink?.type ?? type ?? ui.drinkType ?? 'agua',
    unit: ui.drinkUnit ?? 'ml',
    date: drink?.date ?? date,
    time: drink ? hhmm(new Date(drink.ts)) : hhmm(new Date()),
  };
  const today = todayISO();

  const amountInput = h('input.big-input', { inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', autofocus: true,
    placeholder: v.unit === 'L' ? '0,5' : '350', 'aria-label': 'Quantidade', value: drink ? fmtNum(drink.ml, v.unit) : '' });
  const unitLabel = h('span.big-unit', v.unit);
  const preview = h('p.field-hint.drink-preview', { 'aria-live': 'polite' });
  const noteInput = h('input', { type: 'text', maxlength: 40, autocomplete: 'off', value: drink?.note ?? '', placeholder: PLACEHOLDER[v.type] });
  const dateInput = h('input', { type: 'date', max: today, value: v.date, required: true });
  const timeInput = h('input', { type: 'time', value: v.time, required: true });

  const readMl = () => parseAmount(amountInput.value, v.unit);
  const save = h('button.btn.primary.block', { type: 'submit' });

  function paint() {
    const ml = readMl();
    const empty = !amountInput.value.trim();
    preview.textContent = empty ? `Digite o valor exato, em ${v.unit === 'L' ? 'litros' : 'mililitros'}.`
      : Number.isNaN(ml) ? `Use um valor entre 1 ml e ${dec1(MAX_ML / 1000).replace(',0', '')} litros.`
        : v.unit === 'L' ? `= ${int(ml)} ml` : ml >= 1000 ? `= ${dec1(ml / 1000)} L` : '';
    preview.classList.toggle('error', !empty && Number.isNaN(ml));
    save.disabled = Number.isNaN(ml) || !dateInput.value || !timeInput.value;
    save.textContent = editing ? 'Salvar alterações' : Number.isNaN(ml) ? 'Adicionar' : `Adicionar ${int(ml)} ml de ${drinkById(v.type).label.toLowerCase()}`;
    presets.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.ml) === ml)));
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

  const typeChips = h('div.chip-row.drink-types', { role: 'group', 'aria-label': 'Tipo de líquido' },
    DRINKS.map(d => h('button.chip', { type: 'button', 'aria-pressed': String(d.id === v.type), onclick: e => {
      v.type = d.id;
      typeChips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
      noteInput.placeholder = PLACEHOLDER[d.id];
      hint.textContent = d.hydrates ? '' : 'Bebida alcoólica fica registrada, mas não conta para a meta de líquidos.';
      paint();
    } }, d.label)));
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

  const sheet = openSheet({
    title: editing ? 'Editar líquido' : 'Registrar líquido',
    content: h('form.drink-form', { onsubmit: submit, novalidate: true },
      h('div.big-field.drink-amount', amountInput, unitLabel),
      preview,
      h('div.field', h('label', 'Unidade'), unitCtl),
      presets,
      h('div.field', h('label', 'Tipo'), typeChips),
      hint,
      field('Nome (opcional)', noteInput),
      h('div.qty-row', field('Data', dateInput), field('Horário', timeInput)),
      editing ? h('div.chip-row', h('button.chip', { type: 'button', onclick: async () => {
        await removeDrink(drink.id); sheet.close();
        toast('Registro apagado', { label: 'Desfazer', run: () => restoreDrink(drink) });
      } }, icon('trash'), h('span', 'Apagar'))) : null,
      save),
  });
  paint();
  return sheet;
}
