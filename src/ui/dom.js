// Utilitários de interface: criação de elementos, sheets, avisos e formatação.

/** h('button.btn.primary', { onclick }, 'Texto', filho) */
export function h(spec, props, ...children) {
  const [tag, ...classes] = spec.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (props instanceof Node || typeof props === 'string' || typeof props === 'number' || Array.isArray(props)) { children.unshift(props); props = null; }
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k in el && k !== 'list' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat(Infinity).filter(c => c != null && c !== false));
  return el;
}

export function svg(markup, cls = 'icon') {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markup}</svg>`;
  return t.content.firstChild;
}

// Ícones próprios no espírito dos SF Symbols: caixa de 24, traço de 1,75, pontas arredondadas.
export const ICONS = {
  'walk': '<circle cx="13" cy="4.25" r="1.75"/><path d="m10.75 21 1.5-6.25 2.5 2.25V21M12.25 14.75 13 9l-3.25 1.5-1.25 3M13 9l1.75 3.25 2.75 1"/>',
  'run': '<circle cx="14.5" cy="4.25" r="1.75"/><path d="m6.75 20.5 3.5-4.75 3.25 1.75 1.25 3.5M10.25 15.75 12 10.25l-3.75.75-1.75 2.75M12 10.25l2.5 2.25 3.75.75"/>',
  'bike': '<circle cx="6" cy="16.5" r="3.75"/><circle cx="18" cy="16.5" r="3.75"/><path d="m6 16.5 3.5-7.25h5.25L18 16.5M9.5 9.25 12 16.5l2.75-7.25M8.5 6.25h2.75M14 6.25h2"/>',
  'dumbbell': '<path d="M6.5 7.5v9M17.5 7.5v9M3.75 9.75v4.5M20.25 9.75v4.5M6.5 12h11"/>',
  'spark': '<path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9z"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.75v2M12 19.25v2M2.75 12h2M19.25 12h2M5.45 5.45l1.4 1.4M17.15 17.15l1.4 1.4M5.45 18.55l1.4-1.4M17.15 6.85l1.4-1.4"/>',
  'sun-cloud': '<path d="M9.5 3.25v1.25M4.25 8.5H3M5.8 4.8l.9.9M13.2 4.8l-.9.9"/><path d="M6.4 11a3.5 3.5 0 0 1 6.15-3.2"/><path d="M8.5 19.5h8.25a3.5 3.5 0 0 0 .4-6.98 4.75 4.75 0 0 0-9.1 1.13A2.95 2.95 0 0 0 8.5 19.5z"/>',
  'cloud': '<path d="M7.25 18.5h10a4 4 0 0 0 .45-7.98 5.5 5.5 0 0 0-10.6 1.38 3.3 3.3 0 0 0 .15 6.6z"/>',
  'fog': '<path d="M7.25 13.5h10a4 4 0 0 0 .45-7.98 5.5 5.5 0 0 0-10.6 1.38"/><path d="M4 17h16M6.5 20.5h11"/>',
  'drizzle': '<path d="M7.25 14.5h10a4 4 0 0 0 .45-7.98 5.5 5.5 0 0 0-10.6 1.38 3.3 3.3 0 0 0 .15 6.6z"/><path d="M8.5 18v.5M12 18v.5M15.5 18v.5M10.25 21v.5M13.75 21v.5"/>',
  'rain': '<path d="M7.25 14.5h10a4 4 0 0 0 .45-7.98 5.5 5.5 0 0 0-10.6 1.38 3.3 3.3 0 0 0 .15 6.6z"/><path d="M8.75 17.5 7.75 20.5M12.75 17.5l-1 3M16.75 17.5l-1 3"/>',
  'snow': '<path d="M7.25 14.5h10a4 4 0 0 0 .45-7.98 5.5 5.5 0 0 0-10.6 1.38 3.3 3.3 0 0 0 .15 6.6z"/><path d="M8.5 18.25h.01M12 20h.01M15.5 18.25h.01M10.25 21.5h.01M13.75 21.5h.01" stroke-width="2.6"/>',
  'storm': '<path d="M7.25 14.5h10a4 4 0 0 0 .45-7.98 5.5 5.5 0 0 0-10.6 1.38 3.3 3.3 0 0 0 .15 6.6z"/><path d="m12.75 15-2.25 3.5h3l-2.25 3.5"/>',
  'moon': '<path d="M19.5 14.5A7.75 7.75 0 0 1 9.5 4.5a7.75 7.75 0 1 0 10 10z"/>',
  'moon-cloud': '<path d="M15.6 3.6a5 5 0 0 0 4.8 6.6 5 5 0 0 1-1.3 1.3"/><path d="M7.25 19.5h9a3.75 3.75 0 0 0 .4-7.48 5.1 5.1 0 0 0-9.85 1.3 3.1 3.1 0 0 0 .45 6.18z"/>',
  'thermo': '<path d="M14.5 13.6V5a2.5 2.5 0 0 0-5 0v8.6a4.25 4.25 0 1 0 5 0z"/><path d="M12 16.5V9"/>',
  'humidity': '<path d="M12 3.6c3.1 3.7 5.7 6.8 5.7 10a5.7 5.7 0 0 1-11.4 0c0-3.2 2.6-6.3 5.7-10z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5"/>',
  'wind': '<path d="M3.5 9.5h11a2.75 2.75 0 1 0-2.75-2.75M3.5 14.5h14a2.75 2.75 0 1 1-2.75 2.75M3.5 12h7"/>',
  'leaf': '<path d="M5 19c0-8.5 5.5-14 15-14 0 9.5-5.5 15-14 15"/><path d="M5 19c3-4 6-6.5 9.5-8.5"/>',
  'pin': '<path d="M12 21s6.75-6.1 6.75-11.25a6.75 6.75 0 0 0-13.5 0C5.25 14.9 12 21 12 21z"/><circle cx="12" cy="9.75" r="2.5"/>',
  'locate': '<circle cx="12" cy="12" r="6.75"/><circle cx="12" cy="12" r="2.25"/><path d="M12 2.75v2.5M12 18.75v2.5M2.75 12h2.5M18.75 12h2.5"/>',
  'alert': '<path d="M10.3 4.4 2.95 17.2A1.95 1.95 0 0 0 4.65 20.1h14.7a1.95 1.95 0 0 0 1.7-2.9L13.7 4.4a1.95 1.95 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 16.75h.01" stroke-width="2.2"/>',
  arrowdown: '<path d="M12 4.75v14.5M6.25 13.5 12 19.25l5.75-5.75"/>',
  eye: '<path d="M2.75 12S6.25 5.75 12 5.75 21.25 12 21.25 12 17.75 18.25 12 18.25 2.75 12 2.75 12z"/><circle cx="12" cy="12" r="3"/>',
  updown: '<path d="m8.5 9.5 3.5-3.5 3.5 3.5M8.5 14.5l3.5 3.5 3.5-3.5"/>',
  list: '<path d="M9 7h10.5M9 12h10.5M9 17h10.5"/><path d="M4.6 7h.01M4.6 12h.01M4.6 17h.01" stroke-width="2.6"/>',
  mic: '<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.75 11.5a6.25 6.25 0 0 0 12.5 0M12 17.75V21"/>',
  delete: '<path d="M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9l-6-6.5z"/><path d="m12 9.5 5 5M17 9.5l-5 5"/>',
  today: '<circle cx="12" cy="12" r="8.25" opacity=".35"/><path d="M12 3.75a8.25 8.25 0 1 1-7.4 4.6" stroke-width="2.4"/>',
  log: '<path d="M12 5v14M5 12h14"/>',
  progress: '<path d="M4 18.5 9.5 13l3.5 3L20 8.5"/><path d="M15.5 8.5H20V13"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.4a7.5 7.5 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.5 7.5 0 0 0 2.6 1.5l.5 2.4h4l.5-2.4a7.5 7.5 0 0 0 2.6-1.5l2.3.9 2-3.4z"/>',
  person: '<circle cx="12" cy="8" r="3.75"/><path d="M4.75 20c.9-3.6 3.7-5.6 7.25-5.6s6.35 2 7.25 5.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  next: '<path d="M9.5 5.5 16 12l-6.5 6.5"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  star: '<path d="M12 3.8l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.6-5 2.6.9-5.6-4-4 5.6-.8z"/>',
  barcode: '<path d="M4.5 6.5v11M8 6.5v11M10.5 6.5v11M14 6.5v11M16.5 6.5v11M19.5 6.5v11"/><path d="M3 4h3M18 4h3M3 20h3M18 20h3" opacity=".6"/>',
  drop: '<path d="M12 3.6c3.1 3.7 5.7 6.8 5.7 10a5.7 5.7 0 0 1-11.4 0c0-3.2 2.6-6.3 5.7-10z"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2h9.2L17.5 7M10 10.5v5.5M14 10.5v5.5"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.7 10a4.6 4.6 0 0 1 6.6 0M12 9.4l1.2 2"/>',
  more: '<circle cx="6" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1.3" fill="currentColor" stroke="none"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.25"/><path d="M15.2 15.2 20 20"/>',
  check: '<path d="M5.5 12.5l4.2 4.2 8.8-9.4"/>',
  swap: '<path d="M7.5 4.5 4 8l3.5 3.5M4 8h13M16.5 12.5 20 16l-3.5 3.5M20 16H7"/>',
  face: '<path d="M4 8.5V6.5A2.5 2.5 0 0 1 6.5 4h2M15.5 4h2A2.5 2.5 0 0 1 20 6.5v2M20 15.5v2a2.5 2.5 0 0 1-2.5 2.5h-2M8.5 20h-2A2.5 2.5 0 0 1 4 17.5v-2"/><path d="M9 9.5v1.2M15 9.5v1.2M12 9.5v3.6h-1M9.5 16c1.5 1 3.5 1 5 0"/>',
  logout: '<path d="M14 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h7M15.5 8.5 19 12l-3.5 3.5M19 12H10"/>',
  sidebar: '<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="M9.5 5v14"/>',
  clear: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M9 9l6 6M15 9l-6 6" stroke="var(--surface, #fff)" stroke-width="1.8"/>',
  pencil: '<path d="M14.5 5.5l4 4L9 19H5v-4z"/><path d="M13 7l4 4"/>',
  sparkles: '<path d="M10 4.5l1.4 3.6 3.6 1.4-3.6 1.4L10 14.5l-1.4-3.6L5 9.5l3.6-1.4zM17 13.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/><path d="M8 14h2M12 14h2M8 17h2" stroke-width="2"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  fork: '<path d="M7 3.5v6a2 2 0 0 0 4 0v-6M9 9.5V20.5M16.5 3.5c-1.7 1-2.5 3-2.5 5.5v3h2.5v8.5"/>',
  clock: '<circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/>',
};
export const icon = (name, cls) => svg(ICONS[name], cls);

// ---------- Formatação ----------
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const int = n => nf0.format(Math.round(n));
export const dec1 = n => nf1.format(n);
/** "2 fatias", "1,5 colher de sopa", "120 g" */
export function portionText(qty, unit) {
  const q = String(Math.round(qty * 100) / 100).replace('.', ',');
  if (unit === 'g' || unit === 'ml') return `${q} ${unit}`;
  if (qty <= 1) return `${q} ${unit}`;
  const [head, ...rest] = unit.split(' ');
  const plural = head.endsWith('ão') ? head.slice(0, -2) + 'ões' : head.endsWith('r') ? head + 'es' : head + 's';
  return [q, plural, ...rest].join(' ');
}
export const parseNum = s => { const n = parseFloat(String(s).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* sem suporte */ } };

// ---------- Aviso curto ----------
let toastTimer;
export function toast(message, action) {
  let el = document.querySelector('.toast');
  if (!el) { el = h('div.toast', { role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  el.replaceChildren(h('span', message));
  if (action) el.append(h('button.toast-action', { onclick: () => { action.run(); el.classList.remove('show'); } }, action.label));
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2600);
}

// ---------- Janela (sobe no celular, vira diálogo no computador) ----------
/**
 * openSheet({ title, content, action, cancel, onClose, wide })
 * Sem `action`: título no centro e botão de fechar (X) à direita.
 * Com `action` ({ label, run, disabled }): "Cancelar" à esquerda, título no centro e a ação à direita,
 * como nas janelas de edição do iOS. Devolve { close, body, panel, setAction({ disabled, busy, label }) }.
 */
export function openSheet({ title, content, onClose, wide, action, cancel = 'Cancelar' }) {
  const previous = document.activeElement;
  const titleId = 'sheet-' + Math.random().toString(36).slice(2, 7);
  const body = h('div.sheet-body', content);
  const handle = h('div.sheet-handle', { 'aria-hidden': 'true' });
  let actionBtn = null;
  if (action) actionBtn = h('button.sheet-nav-btn.done', { type: 'button', disabled: !!action.disabled, onclick: () => action.run() }, action.label);
  const head = h('header.sheet-head',
    action ? h('div.sheet-left', h('button.sheet-nav-btn', { type: 'button', onclick: () => close() }, cancel)) : null,
    h('h2', { id: titleId }, title),
    h('div.sheet-right', action ? actionBtn : h('button.icon-btn', { type: 'button', 'aria-label': 'Fechar', onclick: () => close() }, icon('close'))));
  const panel = h('div.sheet' + (wide ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, handle, head, body);
  const backdrop = h('div.backdrop', { onclick: e => { if (e.target === backdrop) close(); } }, panel);
  document.body.append(backdrop);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const focusables = () => [...panel.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
  const onKey = e => {
    // Só a janela de cima responde.
    if (backdrop !== [...document.querySelectorAll('.backdrop')].pop()) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  setTimeout(() => (panel.querySelector('[autofocus]') ?? body.querySelector('input, select, button') ?? focusables()[0])?.focus({ preventScroll: true }), 60);

  // Arrastar a alça para baixo fecha (celular)
  let startY = null, dy = 0;
  const dragStart = e => { startY = e.clientY; dy = 0; panel.style.transition = 'none'; handle.setPointerCapture?.(e.pointerId); };
  const dragMove = e => { if (startY == null) return; dy = Math.max(0, e.clientY - startY); panel.style.transform = `translateY(${dy}px)`; };
  const dragEnd = () => { if (startY == null) return; startY = null; panel.style.transition = ''; panel.style.transform = ''; if (dy > 110) close(); };
  handle.addEventListener('pointerdown', dragStart);
  handle.addEventListener('pointermove', dragMove);
  handle.addEventListener('pointerup', dragEnd);
  handle.addEventListener('pointercancel', dragEnd);

  let closed = false;
  function close() {
    if (closed) return; closed = true;
    backdrop.classList.remove('open');
    document.removeEventListener('keydown', onKey);
    if (!document.querySelectorAll('.backdrop.open').length) document.body.classList.remove('sheet-open');
    const done = () => { backdrop.remove(); onClose?.(); previous?.focus?.({ preventScroll: true }); };
    reducedMotion() ? done() : setTimeout(done, 240);
  }
  function setAction({ disabled, busy, label } = {}) {
    if (!actionBtn) return;
    if (disabled != null) actionBtn.disabled = !!disabled;
    if (label != null) actionBtn.textContent = label;
    if (busy != null) { actionBtn.disabled = !!busy; actionBtn.setAttribute('aria-busy', String(!!busy)); }
  }
  return { close, body, panel, setAction };
}

/** Botão em carregamento: mostra um indicador e bloqueia cliques enquanto `fn` roda. */
export async function busy(btn, fn) {
  btn.setAttribute('aria-busy', 'true');
  try { return await fn(); } finally { btn.removeAttribute('aria-busy'); }
}

/**
 * Campo de busca no padrão iOS: lupa, placeholder discreto e botão de limpar quando há texto.
 * Devolve { el, input }. `shortcut` mostra a tecla de atalho no computador.
 */
export function searchField({ placeholder = 'Buscar', label, value = '', onInput, onSubmit, shortcut, cls = '' }) {
  const input = h('input.log-input', { type: 'search', enterkeyhint: 'search', autocomplete: 'off', autocapitalize: 'none', spellcheck: false, placeholder, 'aria-label': label ?? placeholder, value });
  const clear = h('button.search-clear', { type: 'button', 'aria-label': 'Limpar busca', hidden: !value, onclick: () => { input.value = ''; clear.hidden = true; input.focus(); onInput?.(''); } }, icon('clear'));
  input.addEventListener('input', () => { clear.hidden = !input.value; onInput?.(input.value); });
  const el = h('form.search' + (cls ? '.' + cls : ''), { role: 'search', onsubmit: e => { e.preventDefault(); onSubmit?.(input.value); } },
    icon('search'), input, clear, shortcut ? h('kbd', { 'aria-hidden': 'true' }, shortcut) : null);
  return { el, input };
}

/** Confirmação para ações que não têm volta. */
export function confirmSheet({ title, message, confirmLabel, onConfirm }) {
  const sheet = openSheet({
    title,
    content: [
      h('p.sheet-text', message),
      h('div.sheet-actions',
        h('button.btn.secondary', { onclick: () => sheet.close() }, 'Cancelar'),
        h('button.btn.destructive', { onclick: async e => { await busy(e.currentTarget, onConfirm); sheet.close(); } }, confirmLabel)),
    ],
  });
  return sheet;
}

/** Controle segmentado acessível. options: [{ id, label }] */
export function segmented(options, value, onChange, label) {
  const root = h('div.segmented', { role: 'radiogroup', 'aria-label': label });
  const paint = v => [...root.children].forEach(b => { const on = b.dataset.id === v; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  options.forEach(o => root.append(h('button', { type: 'button', role: 'radio', 'data-id': o.id, onclick: () => { paint(o.id); onChange(o.id); } }, o.label)));
  root.addEventListener('keydown', e => {
    if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const btns = [...root.children], i = btns.indexOf(document.activeElement);
    const next = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
    next.focus(); next.click();
  });
  paint(value);
  // Troca a seleção por código (sem chamar onChange).
  root.setValue = paint;
  return root;
}

/** Campo com rótulo. */
export function field(label, input, hint) {
  const id = input.id || 'f-' + Math.random().toString(36).slice(2, 8);
  input.id = id;
  return h('div.field', h('label', { for: id }, label), input, hint ? h('p.field-hint', hint) : null);
}

// ---------- Popover ----------
// Painel de vidro preso a um botão (menu do + e detalhe dos copos). Fecha ao tocar fora,
// com Esc, ao rolar ou ao redimensionar; devolve o foco ao botão.
let closeOpenPopover = null;
export function openPopover({ anchor, content, label, align = 'center', menu = false }) {
  closeOpenPopover?.();
  const pop = h('div.popover', { role: menu ? 'menu' : 'dialog', 'aria-label': label }, content);
  document.body.append(pop);
  // offsetWidth/Height: o tamanho real, sem a escala da animação de entrada.
  const r = anchor.getBoundingClientRect(), pr = { width: pop.offsetWidth, height: pop.offsetHeight };
  const left = Math.max(12, Math.min(innerWidth - pr.width - 12, align === 'end' ? r.right - pr.width : r.left + r.width / 2 - pr.width / 2));
  // Lado com mais espaço; a lista rola por dentro se não couber.
  const roomAbove = r.top - 22, roomBelow = innerHeight - r.bottom - 22;
  const above = pr.height <= roomAbove || roomAbove >= roomBelow;
  const scroller = pop.querySelector('.menu-scroll');
  if (scroller) scroller.style.maxHeight = Math.max(120, Math.min(scroller.scrollHeight, (above ? roomAbove : roomBelow) - 12)) + 'px';
  pr.height = pop.offsetHeight;
  const top = above ? r.top - pr.height - 10 : r.bottom + 10;
  Object.assign(pop.style, { left: left + 'px', top: Math.max(12, top) + 'px', transformOrigin: `${r.left + r.width / 2 - left}px ${above ? '100%' : '0'}` });
  anchor.setAttribute('aria-expanded', 'true');
  const items = () => [...pop.querySelectorAll('button:not(:disabled), [href]')];
  const close = (refocus = true) => {
    if (closeOpenPopover !== close) return;
    closeOpenPopover = null;
    anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    document.removeEventListener('keydown', key, true);
    removeEventListener('resize', dismiss); removeEventListener('scroll', dismiss, true);
    pop.classList.remove('open');
    setTimeout(() => pop.remove(), reducedMotion() ? 0 : 180);
    if (refocus && anchor.isConnected) anchor.focus({ preventScroll: true });
  };
  const t0 = performance.now();
  const dismiss = e => { if (e?.type === 'scroll' && (pop.contains(e.target) || performance.now() - t0 < 400)) return; close(false); };
  const outside = e => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(false); };
  const key = e => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key === 'Tab' && !pop.contains(document.activeElement)) return close(false);
    if (!menu || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const list = items(), i = list.indexOf(document.activeElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
    list[next]?.focus();
  };
  closeOpenPopover = close;
  setTimeout(() => {
    document.addEventListener('pointerdown', outside, true);
    addEventListener('resize', dismiss); addEventListener('scroll', dismiss, true);
  });
  document.addEventListener('keydown', key, true);
  requestAnimationFrame(() => { pop.classList.add('open'); items()[0]?.focus({ preventScroll: true }); });
  pop.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(false); });
  return { close, el: pop };
}
export const closePopover = () => closeOpenPopover?.(false);

// ---------- Seletor ----------
// Substitui o <select> nativo, cuja lista aberta não segue o visual do app. No computador abre um
// menu de vidro preso ao botão; no toque, uma janela de baixo. Mesma interface de valor e troca.
// Devolve o botão; `el.value` lê e escreve o valor, e a troca chama `onChange(id)`.
export function picker({ options, value, onChange, label, cls = '' }) {
  const text = h('span.picker-text');
  const btn = h('button.picker' + (cls ? '.' + cls : ''), { type: 'button', 'aria-label': label, 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, text, icon('updown', 'icon picker-chevron'));
  let current = value;
  const paint = () => { const o = options.find(x => String(x.id) === String(current)); text.textContent = o ? o.label : ''; };
  const choose = id => { if (String(id) === String(current)) return; current = id; paint(); onChange?.(id); };
  const items = () => options.map(o => h('button.menu-item.picker-item', { type: 'button', role: 'option', 'aria-selected': String(String(o.id) === String(current)), 'data-close': '', onclick: () => choose(o.id) },
    h('span.picker-mark', { 'aria-hidden': 'true' }, icon('check')), h('span.menu-label', o.label), o.hint ? h('span.menu-detail', o.hint) : null));
  btn.addEventListener('click', () => {
    if (matchMedia('(pointer: coarse)').matches && innerWidth < 960) {
      const sheet = openSheet({ title: label, content: h('div.picker-sheet', { role: 'listbox', 'aria-label': label }, items()) });
      sheet.body.addEventListener('click', e => { if (e.target.closest('.picker-item')) sheet.close(); });
      requestAnimationFrame(() => sheet.body.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true }));
    } else {
      const pop = openPopover({ anchor: btn, content: h('div.menu.picker-menu', h('div.menu-scroll', items())), label, align: 'end', menu: true });
      requestAnimationFrame(() => pop.el.querySelector('[aria-selected="true"]')?.focus({ preventScroll: true }));
    }
  });
  Object.defineProperty(btn, 'value', { get: () => current, set: v => { current = v; paint(); } });
  paint();
  return btn;
}
