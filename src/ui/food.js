// Sheets de alimento: adicionar/editar item, confirmar frase livre, alimento manual e código de barras.
import { h, icon, int, dec1, parseNum, openSheet, segmented, field, toast, haptic, picker } from './dom.js';
import { UNIT_LIST, parsePhrase } from '../lib/parser.js';
import { search } from '../lib/search.js';
import { toGrams, nutrientsFor } from '../lib/portions.js';
import { state, addEntries, updateEntry, removeEntry, toggleFavorite, saveFood, foodById } from '../store.js';
import { ui, MEAL_SHORT, mealByClock } from './state.js';
import { swapsForFood, swapBox, swapSheet } from './swaps.js';
import { estimateSheet, recipeDetails } from './estimate.js';

const SOURCE = { taco: 'TACO', off: 'Open Food Facts', manual: 'Cadastrado por você', receita: 'Estimativa: receita típica com valores da TACO' };
export const sourceOf = food => (food.source === 'media' ? `Estimativa: média de ${food.count} produtos do Open Food Facts`
  : /^t\d/.test(food.id) ? SOURCE.taco : SOURCE[food.source] ?? SOURCE.manual);

/** Abre a estimativa de calorias. Sem `onFood`, o alimento escolhido abre para registrar. */
export function openEstimate(query, onFood = food => foodSheet(food)) {
  return estimateSheet(query, { onPick: food => (food.manual ? manualFoodSheet({ n: food.n }) : onFood(food)) });
}
const unitPicker = (value, onChange) => picker({ options: UNIT_LIST.map(u => ({ id: u, label: u })), value, onChange, label: 'Unidade' });
const fmtQty = q => String(Math.round(q * 100) / 100).replace('.', ',');

function macroLine(n) {
  return h('div.macro-line',
    h('span', h('b', dec1(n.p) + ' g'), ' proteína'), h('span', h('b', dec1(n.c) + ' g'), ' carboidrato'), h('span', h('b', dec1(n.f) + ' g'), ' gordura'));
}

/** Adicionar um alimento ao diário, ou editar um item já registrado (entry). */
export function foodSheet(food, { entry, qty, unit, meal } = {}) {
  if (!food && entry) {
    // O alimento original não existe mais: reconstrói os valores por 100 g a partir do próprio item.
    const r = 100 / (entry.grams || 100);
    food = { id: entry.foodId ?? 'x', n: entry.name, k: entry.kcal * r, p: entry.p * r, c: entry.c * r, f: entry.f * r, source: 'manual' };
  }
  const byServing = !qty && food.servingUnit && UNIT_LIST.includes(food.servingUnit);
  const v = { qty: entry?.qty ?? qty ?? (byServing ? 1 : food.serving ? food.serving : 100), unit: entry?.unit ?? unit ?? (byServing ? food.servingUnit : 'g'), meal: entry?.meal ?? meal ?? ui.meal ?? mealByClock() };
  const kcalEl = h('span.sheet-kcal'), gramsEl = h('p.field-hint', { 'aria-live': 'polite' }), macrosEl = h('div'), swapEl = h('div');
  const qtyInput = h('input', { inputmode: 'decimal', value: fmtQty(v.qty), autocomplete: 'off', autofocus: true });
  const unitSel = unitPicker(v.unit, () => update());
  let current, swapTimer;
  // Abre a alternativa com a mesma quantidade em gramas, na mesma refeição.
  const pick = (alt, grams) => { sheet.close(); setTimeout(() => foodSheet(alt, { qty: grams, unit: 'g', meal: v.meal }), 280); };

  function update() {
    v.qty = parseNum(qtyInput.value); v.unit = unitSel.value;
    const ok = v.qty > 0;
    const g = ok ? toGrams(food.n, v.unit, v.qty) : { grams: 0, exact: true, known: true };
    const n = nutrientsFor(food, g.grams);
    current = ok ? { ...n, grams: g.grams } : null;
    kcalEl.textContent = int(n.kcal);
    gramsEl.textContent = g.exact ? '' : `≈ ${int(g.grams)} g${g.known ? '' : '. Medida genérica: para mais precisão, informe em gramas.'}`;
    macrosEl.replaceChildren(macroLine(n));
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => swapEl.replaceChildren(swapBox(ok ? swapsForFood(food, g.grams) : null, pick, entry ? 'Para a próxima vez' : 'Opção mais leve') ?? ''), 150);
    sheet?.setAction({ disabled: !ok });
  }
  const save = async () => {
    if (!current) return;
    const row = { foodId: food.id, name: food.n, qty: v.qty, unit: v.unit, meal: v.meal, ...current };
    if (entry) await updateEntry(entry.id, row); else await addEntries([{ ...row, date: ui.date }]);
    haptic(12); sheet.close();
    const s = entry ? null : swapsForFood(food, current.grams);
    toast(entry ? 'Item atualizado' : `${int(current.kcal)} kcal adicionadas`, s ? { label: 'Ver troca', run: () => swapSheet(food.n, s, (f, g) => foodSheet(f, { qty: g, unit: 'g', meal: v.meal })) } : undefined);
  };
  qtyInput.addEventListener('input', update);

  const fav = () => state.favorites.includes(food.id);
  const favBtn = h('button.chip', { 'aria-pressed': String(fav()), onclick: async () => { await toggleFavorite(food.id); favBtn.setAttribute('aria-pressed', String(fav())); favBtn.lastChild.textContent = fav() ? 'Nos favoritos' : 'Favoritar'; } },
    icon('star'), h('span', fav() ? 'Nos favoritos' : 'Favoritar'));

  let sheet = null;
  sheet = openSheet({
    title: entry ? 'Editar item' : 'Alimento',
    action: { label: entry ? 'Salvar' : 'Adicionar', run: save },
    content: [
      h('h3.sheet-food', food.n),
      h('p.sheet-source', `${sourceOf(food)} · ${int(food.k)} kcal por 100 g`),
      food.source === 'media' ? h('p.sheet-source', `A maioria dos produtos fica entre ${int(food.low)} e ${int(food.high)} kcal por 100 g.`) : null,
      h('div.sheet-kcal-row', kcalEl, h('span.sheet-kcal-unit', 'kcal')),
      macrosEl,
      h('div.qty-row', field('Quantidade', qtyInput), field('Unidade', unitSel)),
      gramsEl,
      food.ingredients ? recipeDetails(food) : null,
      swapEl,
      h('div.field', h('label', 'Refeição'), segmented(MEAL_SHORT, v.meal, id => { v.meal = id; }, 'Refeição')),
      h('div.chip-row',
        food.id !== 'x' ? favBtn : null,
        entry ? h('button.chip', { onclick: async () => { const { id, ts, ...rest } = entry; await addEntries([rest]); sheet.close(); toast('Item duplicado'); } }, icon('plus'), h('span', 'Duplicar')) : null,
        entry ? h('button.chip', { onclick: async () => { await removeEntry(entry.id); sheet.close(); undoToast(entry); } }, icon('trash'), h('span', 'Apagar')) : null),
    ],
  });
  update();
  return sheet;
}

export function undoToast(entry) {
  toast('Item apagado', { label: 'Desfazer', run: () => { const { id, ts, ...rest } = entry; addEntries([rest]); } });
}

/** Frase livre: mostra o que foi entendido e só salva depois da confirmação. */
export function phraseSheet(text) {
  const parsed = parsePhrase(text).map(item => {
    const matches = search(state.index, item.query, 5).map(r => r.food);
    return { ...item, matches, food: matches[0] ?? null, skip: !matches.length };
  });
  let meal = ui.meal ?? mealByClock();
  const list = h('div.phrase-list');
  const totalEl = h('span');
  const save = h('button.btn.primary.block', { onclick: async () => {
    const rows = valid().map(it => ({ date: ui.date, meal, foodId: it.food.id, name: it.food.n, qty: it.qty, unit: it.unit, ...it.n, grams: it.g.grams }));
    await addEntries(rows); haptic(12); ui.query = ''; sheet.close();
    toast(rows.length === 1 ? '1 item adicionado' : `${rows.length} itens adicionados`);
  } });
  const valid = () => parsed.filter(it => !it.skip && it.food && it.qty > 0);

  function compute() {
    for (const it of parsed) {
      if (!it.food) continue;
      it.g = toGrams(it.food.n, it.unit, it.qty > 0 ? it.qty : 0);
      it.n = nutrientsFor(it.food, it.g.grams);
    }
    const n = valid().length;
    totalEl.textContent = `${int(valid().reduce((s, it) => s + it.n.kcal, 0))} kcal`;
    save.textContent = n ? (n === 1 ? 'Confirmar e salvar 1 item' : `Confirmar e salvar ${n} itens`) : 'Nada para salvar';
    save.disabled = !n;
  }

  function row(it) {
    if (!it.food) {
      const missing = h('div.phrase-item.missing',
        h('p.phrase-raw', `“${it.raw}”`),
        h('p.phrase-miss', 'Não encontramos este alimento na tabela.'),
        h('button.btn.tonal.compact', { type: 'button', onclick: () => openEstimate(it.query, food => {
          it.food = food; it.matches = [food]; it.skip = false;
          if (food.servingUnit && UNIT_LIST.includes(food.servingUnit) && !it.explicitUnit) it.unit = food.servingUnit;
          missing.replaceWith(row(it)); compute();
        }) }, 'Estimar calorias'));
      return missing;
    }
    const kcal = h('span.phrase-kcal'), grams = h('span.phrase-grams');
    const paint = () => { compute(); kcal.textContent = `${int(it.n.kcal)} kcal`; grams.textContent = it.g.exact ? '' : `≈ ${int(it.g.grams)} g${it.g.known ? '' : ' (medida genérica, confira)'}`; };
    const foodSel = picker({ label: `Alimento para “${it.raw}”`, cls: 'phrase-food', value: it.matches.indexOf(it.food),
      options: [...it.matches.map((f, i) => ({ id: i, label: f.n })), { id: 'estimar', label: 'Nenhum destes: estimar calorias…' }],
      onChange: id => {
        if (id === 'estimar') {
          foodSel.value = it.matches.indexOf(it.food);
          return openEstimate(it.query, food => { it.matches = [food, ...it.matches.filter(m => m.id !== food.id)]; it.food = food; el.replaceWith(row(it)); compute(); });
        }
        it.food = it.matches[id]; paint();
      } });
    const qty = h('input', { inputmode: 'decimal', value: fmtQty(it.qty), 'aria-label': 'Quantidade', oninput: e => { it.qty = parseNum(e.target.value); paint(); } });
    const unit = unitPicker(it.unit, u => { it.unit = u; paint(); });
    const el = h('div.phrase-item',
      h('div.phrase-top', h('p.phrase-raw', `“${it.raw}”`),
        h('button.icon-btn.small', { 'aria-label': `Remover “${it.raw}”`, onclick: () => { it.skip = true; el.remove(); compute(); } }, icon('close'))),
      foodSel,
      h('div.phrase-controls', qty, unit, kcal),
      grams);
    paint();
    return el;
  }

  const sheet = openSheet({
    title: 'Confirmar itens', wide: true,
    content: [
      parsed.length ? null : h('p.sheet-text', 'Não deu para entender a frase. Tente algo como “2 ovos e 1 pão francês”.'),
      list,
      h('div.field', h('label', 'Refeição'), segmented(MEAL_SHORT, meal, id => { meal = id; }, 'Refeição')),
      h('div.phrase-total', h('span', 'Total'), totalEl),
      save,
    ],
  });
  parsed.forEach(it => list.append(row(it)));
  compute();
  return sheet;
}

/** Cadastro manual. Os valores são os que você digitar, por 100 g. */
export function manualFoodSheet(prefill = {}) {
  const inputs = {
    n: h('input', { value: prefill.n ?? '', maxlength: 60, autocomplete: 'off', autofocus: true, required: true }),
    k: h('input', { inputmode: 'decimal', required: true, value: prefill.k != null ? fmtQty(prefill.k) : '' }),
    p: h('input', { inputmode: 'decimal', placeholder: '0', value: prefill.p ? fmtQty(prefill.p) : '' }),
    c: h('input', { inputmode: 'decimal', placeholder: '0', value: prefill.c ? fmtQty(prefill.c) : '' }),
    f: h('input', { inputmode: 'decimal', placeholder: '0', value: prefill.f ? fmtQty(prefill.f) : '' }),
  };
  const err = h('p.ob-err', { role: 'alert' });
  const sheet = openSheet({
    title: 'Novo alimento',
    action: { label: 'Salvar', run: () => sheet.body.querySelector('form').requestSubmit() },
    content: h('form', { onsubmit: async e => {
      e.preventDefault();
      const k = parseNum(inputs.k.value), name = inputs.n.value.trim();
      if (!name) { err.textContent = 'Dê um nome ao alimento.'; return inputs.n.focus(); }
      if (!(k >= 0 && k <= 900)) { err.textContent = 'Informe as calorias por 100 g (de 0 a 900).'; return inputs.k.focus(); }
      const num = i => Math.max(0, parseNum(i.value) || 0);
      const food = await saveFood({ n: name, k, p: num(inputs.p), c: num(inputs.c), f: num(inputs.f), source: 'manual', barcode: prefill.barcode });
      sheet.close();
      setTimeout(() => foodSheet(food), 280);
    } },
      field('Nome', inputs.n),
      field('Calorias (kcal por 100 g)', inputs.k, 'Valores do rótulo, por 100 g.'),
      h('div.qty-row.three', field('Proteína (g)', inputs.p), field('Carboidrato (g)', inputs.c), field('Gordura (g)', inputs.f)),
      err),
  });
  return sheet;
}

// ---------- Código de barras ----------
async function getDetector() {
  const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
  if ('BarcodeDetector' in window) {
    try { return new window.BarcodeDetector({ formats }); } catch { /* cai no fallback */ }
  }
  // Fallback (Safari no iPhone, Firefox): biblioteca carregada sob demanda, precisa de internet.
  const mod = await import('https://cdn.jsdelivr.net/npm/barcode-detector@3/+esm');
  return new mod.BarcodeDetector({ formats });
}

export async function lookupBarcode(code) {
  const cached = foodById('off' + code) ?? state.foods.find(f => f.barcode === code);
  if (cached) return cached;
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_pt,brands,nutriments,serving_quantity,image_front_small_url`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('rede');
  const data = await res.json();
  const p = data.product, nm = p?.nutriments ?? {};
  let k = nm['energy-kcal_100g'];
  if (k == null && nm['energy-kj_100g'] != null) k = nm['energy-kj_100g'] / 4.184;
  if (data.status !== 1 || k == null) return null;
  const r1 = n => Math.round((Number(n) || 0) * 10) / 10;
  const name = [p.product_name_pt || p.product_name || 'Produto sem nome', p.brands?.split(',')[0]].filter(Boolean).join(', ');
  return saveFood({ id: 'off' + code, n: name, k: Math.round(k), p: r1(nm.proteins_100g), c: r1(nm.carbohydrates_100g), f: r1(nm.fat_100g), source: 'off', barcode: code, serving: Number(p.serving_quantity) || undefined,
    // Foto real do produto, mostrada no diário alimentar.
    img: /^https:\/\/images\.openfoodfacts\.org\//.test(p.image_front_small_url ?? '') ? p.image_front_small_url : undefined });
}

export function barcodeSheet() {
  let stream, timer, busy = false;
  const video = h('video.scan-video', { playsinline: true, muted: true, 'aria-label': 'Imagem da câmera' });
  const status = h('p.scan-status', { role: 'status', 'aria-live': 'polite' }, 'Abrindo a câmera…');
  const manual = h('input', { inputmode: 'numeric', placeholder: '7891000100103', autocomplete: 'off', maxlength: 14 });
  const stop = () => { clearInterval(timer); stream?.getTracks().forEach(t => t.stop()); };

  async function found(code) {
    if (busy) return; busy = true;
    code = code.replace(/\D/g, '');
    if (code.length < 8) { status.textContent = 'O código precisa ter de 8 a 14 números.'; busy = false; return; }
    status.textContent = `Buscando ${code}…`;
    haptic(15);
    try {
      const food = await lookupBarcode(code);
      if (food) { stop(); sheet.close(); setTimeout(() => foodSheet(food), 280); return; }
      status.replaceChildren('Produto não encontrado no Open Food Facts, ou sem calorias cadastradas. ',
        h('button.link', { onclick: () => { stop(); sheet.close(); setTimeout(() => manualFoodSheet({ barcode: code }), 280); } }, 'Cadastrar manualmente'));
    } catch {
      status.textContent = navigator.onLine ? 'A busca falhou. Tente de novo em instantes.' : 'Sem internet. Produtos já lidos continuam disponíveis; os novos precisam de conexão.';
    }
    busy = false;
  }

  const sheet = openSheet({
    title: 'Ler código de barras', onClose: stop,
    content: [
      h('div.scan-frame', video, h('span.scan-line', { 'aria-hidden': 'true' })),
      status,
      h('form.scan-manual', { onsubmit: e => { e.preventDefault(); found(manual.value); } },
        field('Ou digite os números do código', manual), h('button.btn.tonal', { type: 'submit' }, 'Buscar')),
    ],
  });

  (async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocamera');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream; await video.play();
    } catch (e) {
      status.textContent = e?.name === 'NotAllowedError' ? 'Sem permissão para usar a câmera. Libere o acesso nas configurações do navegador ou digite o código abaixo.' : 'Câmera indisponível neste aparelho. Digite o código abaixo.';
      return;
    }
    let detector;
    try { detector = await getDetector(); } catch { status.textContent = 'O leitor não carregou (precisa de internet na primeira vez). Digite o código abaixo.'; return; }
    status.textContent = 'Aponte para o código de barras.';
    timer = setInterval(async () => {
      if (busy || video.readyState < 2) return;
      try { const [hit] = await detector.detect(video); if (hit?.rawValue) found(hit.rawValue); } catch { /* quadro ilegível: tenta o próximo */ }
    }, 280);
  })();
  return sheet;
}
