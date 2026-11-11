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
  t.innerHTML = `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${markup}</svg>`;
  return t.content.firstChild;
}

export const ICONS = {
  today: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke-width="3.2"/>',
  log: '<path d="M12 5v14M5 12h14"/>',
  progress: '<path d="M4 17l5-5 4 3 7-8"/><path d="M4 20h16" opacity=".4"/>',
  settings: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.700l5.8-.8z"/>',
  barcode: '<path d="M4 6v12M8 6v12M11 6v12M15 6v12M18 6v12M20.5 6v12" stroke-width="1.6"/>',
  drop: '<path d="M12 3.5c3 3.600 5.500 6.600 5.500 9.800a5.500 5.500 0 0 1-11 0c0-3.200 2.500-6.200 5.500-9.800z"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.500a4.500 4.500 0 0 1 6 0M12 9v2.500"/>',
  more: '<circle cx="5.500" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.500" cy="12" r="1.2" fill="currentColor"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4 4"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  face: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.500h-1M9.500 16c1.500 1 3.500 1 5 0"/>',
  swap: '<path d="M7 4l-3 3 3 3M4 7h12M17 20l3-3-3-3M20 17H8"/>',
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

// ---------- Sheet (sobe no celular, vira diálogo no desktop) ----------
export function openSheet({ title, content, onClose, wide }) {
  const previous = document.activeElement;
  const titleId = 'sheet-' + Math.random().toString(36).slice(2, 7);
  const body = h('div.sheet-body', content);
  const handle = h('div.sheet-handle', { 'aria-hidden': 'true' });
  const panel = h('div.sheet' + (wide ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    handle,
    h('header.sheet-head', h('h2', { id: titleId }, title), h('button.icon-btn', { 'aria-label': 'Fechar', onclick: () => close() }, icon('close'))),
    body);
  const backdrop = h('div.backdrop', { onclick: e => { if (e.target === backdrop) close(); } }, panel);
  document.body.append(backdrop);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const focusables = () => [...panel.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled && el.offsetParent !== null);
  const onKey = e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };
  backdrop.addEventListener('keydown', onKey);
  setTimeout(() => (panel.querySelector('[autofocus]') ?? focusables()[1] ?? focusables()[0])?.focus({ preventScroll: true }), 60);

  // Arrastar para baixo fecha
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
    document.body.classList.remove('sheet-open');
    const done = () => { backdrop.remove(); onClose?.(); previous?.focus?.({ preventScroll: true }); };
    reducedMotion() ? done() : setTimeout(done, 260);
  }
  return { close, body, panel };
}

/** Confirmação para ações que não têm volta. */
export function confirmSheet({ title, message, confirmLabel, onConfirm }) {
  const sheet = openSheet({
    title,
    content: [
      h('p.sheet-text', message),
      h('div.sheet-actions',
        h('button.btn.ghost', { onclick: () => sheet.close() }, 'Cancelar'),
        h('button.btn.strong', { onclick: async () => { await onConfirm(); sheet.close(); } }, confirmLabel)),
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
  return root;
}

/** Campo com rótulo. */
export function field(label, input, hint) {
  const id = input.id || 'f-' + Math.random().toString(36).slice(2, 8);
  input.id = id;
  return h('div.field', h('label', { for: id }, label), input, hint ? h('p.field-hint', hint) : null);
}
